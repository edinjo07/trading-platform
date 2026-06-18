/**
 * botEngine.ts — TradePilot automated strategy engine
 *
 * Each bot runs on a 5-second setInterval tick. On every tick it:
 *   1. Reads the live price from priceService
 *   2. Feeds the price into a rolling buffer (up to 500 bars)
 *   3. Warms up until indicator periods are satisfied
 *   4. Generates a signal using enhanced, confluence-filtered algorithms
 *   5. Applies risk guards (daily loss/trade limits, confirm bars)
 *   6. Opens or closes LONG or SHORT positions via orderEngine
 *   7. Persists all state to Supabase so the client always sees fresh data
 *
 * Signal improvements over v1:
 *   - ATR-based dynamic SL/TP (falls back to percentage if insufficient data)
 *   - Trend-bias filter (50 SMA) applied to all strategies
 *   - RSI confluence layer on MA-Cross and MACD strategies
 *   - MACD histogram direction confirmation on RSI strategy
 *   - ATR volatility gate on Momentum (avoids noise trades)
 *   - Full bidirectional trading (LONG + SHORT)
 *   - Position ID taken directly from placeMarketOrder result (no race condition)
 */

import { supabase } from '../db'
import { getPrice } from './priceService'
import { getSymbolInfo } from './mockDataService'
import { placeMarketOrder, closePosition } from './orderEngine'
import { getCandles } from './candleService'
import { getCachedNewsImpact, refreshNewsImpact } from './newsImpactService'
import { createNotification } from './notificationService'

const TICK_MS  = 5_000
const MAX_LOGS = 200

// ─── Types ────────────────────────────────────────────────────────────────────

interface BotParams {
  fastPeriod?:        number
  slowPeriod?:        number
  rsiPeriod?:         number
  rsiOverbought?:     number
  rsiOversold?:       number
  macdFast?:          number
  macdSlow?:          number
  macdSignal?:        number
  lookbackPeriod?:    number
  tradeSize:          number
  stopLossPercent?:   number
  takeProfitPercent?: number
  maxDailyLoss?:      number
  maxDailyTrades?:    number
  confirmBars?:       number
  useNewsFilter?:     boolean
  newsMinConfidence?: number   // 0..1 — min news confidence to veto/boost (default 0.4)
}

interface BotLog {
  ts:      string
  level:   'info' | 'signal' | 'trade' | 'risk' | 'warn' | 'error'
  message: string
}

interface BotMemState {
  intervalId:        NodeJS.Timeout
  userId:            string
  botName:           string
  mode:              'demo' | 'real'
  currency:          string
  symbol:            string
  strategy:          string
  params:            BotParams
  priceBuffer:       number[]
  positionId:        string | null
  positionSide:      'long' | 'short' | null
  entryPrice:        number | null
  currentSL:         number | null
  currentTP:         number | null
  status:            string
  trades:            number
  wins:              number
  losses:            number
  pnl:               number
  peakPnl:           number
  maxDrawdown:       number
  equityCurve:       Array<{ ts: number; pnl: number }>
  dailyTrades:       number
  dailyLoss:         number
  dailyResetDate:    string
  warmupBarsNeeded:  number
  warmupBarsCurrent: number
  logs:              BotLog[]
  confirmCount:      number
  analysisCounter:   number
  lastBarMin:        number
}

const running = new Map<string, BotMemState>()

export function isRunning(botId: string): boolean {
  return running.has(botId)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addLog(state: BotMemState, level: BotLog['level'], message: string) {
  state.logs.push({ ts: new Date().toISOString(), level, message })
  if (state.logs.length > MAX_LOGS) state.logs.shift()
}

function calcWarmupBarsNeeded(strategy: string, params: BotParams): number {
  switch (strategy) {
    case 'ma_crossover': return (params.slowPeriod  ?? 20) + 15
    case 'rsi':          return (params.rsiPeriod   ?? 14) + 30
    case 'macd':         return (params.macdSlow    ?? 26) + (params.macdSignal ?? 9) + 20
    case 'momentum':     return (params.lookbackPeriod ?? 10) + 20
    default:             return 30
  }
}

// ─── Technical Indicators ─────────────────────────────────────────────────────

function sma(arr: number[], period: number): number {
  if (arr.length < period) return NaN
  return arr.slice(-period).reduce((a, b) => a + b, 0) / period
}

function ema(arr: number[], period: number): number {
  if (arr.length < period) return NaN
  const k = 2 / (period + 1)
  let v = arr.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < arr.length; i++) v = arr[i] * k + v * (1 - k)
  return v
}

function calcRsi(arr: number[], period: number): number {
  if (arr.length < period + 1) return NaN
  const slice = arr.slice(-(period + 1))
  let gains = 0, losses = 0
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i] - slice[i - 1]
    if (d > 0) gains += d; else losses -= d
  }
  if (losses === 0) return 100
  return 100 - 100 / (1 + gains / losses)
}

/** Average True Range using close-to-close as a proxy for TR */
function calcAtr(prices: number[], period = 14): number {
  if (prices.length < period + 1) return NaN
  const slice = prices.slice(-(period + 1))
  let sum = 0
  for (let i = 1; i < slice.length; i++) sum += Math.abs(slice[i] - slice[i - 1])
  return sum / period
}

/** Returns MACD line value and histogram value */
function calcMacd(
  prices: number[], fast: number, slow: number, signal: number
): { macdLine: number; signalLine: number; histogram: number } {
  const window = slow + signal + 20
  const p = prices.length > window ? prices.slice(-window) : prices
  if (p.length < slow + signal + 1) return { macdLine: NaN, signalLine: NaN, histogram: NaN }

  const macdArr: number[] = []
  for (let i = slow - 1; i < p.length; i++) {
    const s = p.slice(0, i + 1)
    const v = ema(s, fast) - ema(s, slow)
    if (!isNaN(v)) macdArr.push(v)
  }
  if (macdArr.length < signal + 1) return { macdLine: NaN, signalLine: NaN, histogram: NaN }

  const signalLine = ema(macdArr, signal)
  const macdLine   = macdArr[macdArr.length - 1]
  return { macdLine, signalLine, histogram: isNaN(signalLine) ? NaN : macdLine - signalLine }
}

/** Trend bias: is price comfortably above or below the N-period SMA? */
function trendBias(prices: number[], period = 50): 'up' | 'down' | 'flat' {
  const s = sma(prices, period)
  if (isNaN(s)) return 'flat'
  const price = prices[prices.length - 1]
  const pct   = (price - s) / s
  if (pct >  0.002) return 'up'
  if (pct < -0.002) return 'down'
  return 'flat'
}

// ─── Enhanced Strategy Signals ────────────────────────────────────────────────

type Signal = 'buy' | 'sell' | 'hold'

/**
 * MA Crossover + RSI confluence + trend filter.
 * Only buys when fast SMA crosses above slow SMA AND RSI is not overbought
 * AND the 50 SMA trend agrees with the direction.
 */
function signalMaCrossover(prices: number[], fast: number, slow: number): Signal {
  if (prices.length < slow + 1) return 'hold'
  const prev = prices.slice(0, -1)
  const fp = sma(prev, fast), sp = sma(prev, slow)
  const fn = sma(prices, fast), sn = sma(prices, slow)
  if ([fp, sp, fn, sn].some(isNaN)) return 'hold'

  const crossedUp   = fp <= sp && fn > sn
  const crossedDown = fp >= sp && fn < sn
  if (!crossedUp && !crossedDown) return 'hold'

  const rsi   = calcRsi(prices, 14)
  const trend = trendBias(prices, Math.max(slow * 3, 50))

  if (crossedUp) {
    if (!isNaN(rsi) && rsi > 68) return 'hold'     // overbought — skip
    if (trend === 'down') return 'hold'             // trading against trend — skip
    return 'buy'
  }
  // crossedDown
  if (!isNaN(rsi) && rsi < 32) return 'hold'       // oversold — skip
  if (trend === 'up') return 'hold'
  return 'sell'
}

/**
 * RSI overbought/oversold + MACD histogram direction confirmation.
 * Avoids the classic RSI trap of buying in a downtrend just because
 * the indicator is oversold — MACD hist must be turning the right way.
 */
function signalRsi(prices: number[], period: number, overbought: number, oversold: number): Signal {
  const rsi = calcRsi(prices, period)
  if (isNaN(rsi)) return 'hold'

  const { histogram } = calcMacd(prices, 12, 26, 9)
  const trend         = trendBias(prices, 50)

  if (rsi < oversold) {
    // Confirm with histogram turning positive (momentum shifting)
    if (!isNaN(histogram) && histogram < -0.00005) return 'hold'
    if (trend === 'down') return 'hold'
    return 'buy'
  }
  if (rsi > overbought) {
    if (!isNaN(histogram) && histogram > 0.00005) return 'hold'
    if (trend === 'up') return 'hold'
    return 'sell'
  }
  return 'hold'
}

/**
 * MACD signal-line crossover + trend filter + RSI extreme guard.
 * Avoids whipsaw crossovers by requiring the trend to agree and
 * filtering out entries when RSI is already at an extreme.
 */
function signalMacd(prices: number[], fast: number, slow: number, signal: number): Signal {
  const window = slow + signal + 20
  const p      = prices.length > window ? prices.slice(-window) : prices
  if (p.length < slow + signal + 1) return 'hold'

  const macdArr: number[] = []
  for (let i = slow - 1; i < p.length; i++) {
    const s = p.slice(0, i + 1)
    const v = ema(s, fast) - ema(s, slow)
    if (!isNaN(v)) macdArr.push(v)
  }
  if (macdArr.length < signal + 1) return 'hold'

  const sigNow  = ema(macdArr, signal)
  const sigPrev = ema(macdArr.slice(0, -1), signal)
  const mNow    = macdArr[macdArr.length - 1]
  const mPrev   = macdArr[macdArr.length - 2]
  if (isNaN(sigNow) || isNaN(sigPrev)) return 'hold'

  const crossedUp   = mPrev <= sigPrev && mNow > sigNow
  const crossedDown = mPrev >= sigPrev && mNow < sigNow
  if (!crossedUp && !crossedDown) return 'hold'

  const rsi   = calcRsi(prices, 14)
  const trend = trendBias(prices, 50)

  if (crossedUp) {
    if (!isNaN(rsi) && rsi > 72) return 'hold'
    if (trend === 'down') return 'hold'
    return 'buy'
  }
  if (!isNaN(rsi) && rsi < 28) return 'hold'
  if (trend === 'up') return 'hold'
  return 'sell'
}

/**
 * Momentum breakout with ATR volatility gate.
 * Instead of a fixed 0.5% threshold, requires a move of at least 1.5× ATR
 * so the signal only fires during genuine momentum, not sideways chop.
 */
function signalMomentum(prices: number[], lookback: number): Signal {
  if (prices.length < lookback + 15) return 'hold'
  const curr  = prices[prices.length - 1]
  const start = prices[prices.length - 1 - lookback]
  const pct   = (curr - start) / start

  const atr    = calcAtr(prices, 14)
  const minPct = !isNaN(atr) && curr > 0 ? (atr / curr) * 1.5 : 0.008

  const trend = trendBias(prices, 50)

  if (pct >  minPct) {
    if (trend === 'down') return 'hold'
    return 'buy'
  }
  if (pct < -minPct) {
    if (trend === 'up') return 'hold'
    return 'sell'
  }
  return 'hold'
}

function generateSignal(strategy: string, params: BotParams, prices: number[]): Signal {
  switch (strategy) {
    case 'ma_crossover': return signalMaCrossover(prices, params.fastPeriod ?? 10, params.slowPeriod ?? 20)
    case 'rsi':          return signalRsi(prices, params.rsiPeriod ?? 14, params.rsiOverbought ?? 70, params.rsiOversold ?? 30)
    case 'macd':         return signalMacd(prices, params.macdFast ?? 12, params.macdSlow ?? 26, params.macdSignal ?? 9)
    case 'momentum':     return signalMomentum(prices, params.lookbackPeriod ?? 10)
    default:             return 'hold'
  }
}

// ─── SL/TP calculation ────────────────────────────────────────────────────────

interface SlTp { sl: number; tp: number }

function calcSlTp(price: number, side: 'buy' | 'sell', params: BotParams, prices: number[]): SlTp {
  const slPct  = (params.stopLossPercent   ?? 2) / 100
  const tpPct  = (params.takeProfitPercent ?? 4) / 100
  const atr    = calcAtr(prices, 14)

  // Use ATR × multiplier if available; fall back to percentage
  const slDist = !isNaN(atr) && atr > 0 ? Math.max(atr * 1.5, price * slPct) : price * slPct
  const tpDist = !isNaN(atr) && atr > 0 ? Math.max(atr * 3.0, price * tpPct) : price * tpPct

  if (side === 'buy') {
    return {
      sl: parseFloat((price - slDist).toFixed(8)),
      tp: parseFloat((price + tpDist).toFixed(8)),
    }
  }
  return {
    sl: parseFloat((price + slDist).toFixed(8)),
    tp: parseFloat((price - tpDist).toFixed(8)),
  }
}

// ─── Daily reset ──────────────────────────────────────────────────────────────

function checkDailyReset(state: BotMemState) {
  const today = new Date().toISOString().slice(0, 10)
  if (state.dailyResetDate !== today) {
    state.dailyTrades    = 0
    state.dailyLoss      = 0
    state.dailyResetDate = today
    addLog(state, 'info', 'Daily counters reset')
  }
}

// ─── DB persist ───────────────────────────────────────────────────────────────

async function persist(botId: string, state: BotMemState, extra: Record<string, unknown> = {}) {
  await supabase.from('bots').update({
    status:              state.status,
    position:            state.positionSide ?? 'none',
    trades:              state.trades,
    wins:                state.wins,
    losses:              state.losses,
    pnl:                 parseFloat(state.pnl.toFixed(2)),
    peak_pnl:            parseFloat(state.peakPnl.toFixed(2)),
    max_drawdown:        parseFloat(state.maxDrawdown.toFixed(2)),
    equity_curve:        state.equityCurve,
    daily_trades:        state.dailyTrades,
    daily_loss:          parseFloat(state.dailyLoss.toFixed(2)),
    daily_reset_date:    state.dailyResetDate,
    warmup_bars_current: state.warmupBarsCurrent,
    logs:                state.logs,
    updated_at:          new Date().toISOString(),
    ...extra,
  }).eq('id', botId)
}

// ─── Trade recording ──────────────────────────────────────────────────────────

function recordClose(state: BotMemState, netPnl: number) {
  state.trades++
  state.dailyTrades++
  if (netPnl > 0) state.wins++
  else { state.losses++; state.dailyLoss += Math.abs(netPnl) }
  state.pnl         += netPnl
  state.peakPnl      = Math.max(state.peakPnl, state.pnl)
  state.maxDrawdown  = Math.max(state.maxDrawdown, state.peakPnl - state.pnl)
  state.equityCurve.push({ ts: Date.now(), pnl: state.pnl })
  state.positionId   = null
  state.positionSide = null
  state.entryPrice   = null
  state.currentSL    = null
  state.currentTP    = null
  state.confirmCount = 0
}

function fmtPnl(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(4)}` }

function notifyBotOpen(state: BotMemState, side: 'long' | 'short') {
  const name = getSymbolInfo(state.symbol)?.name
  createNotification(state.userId, {
    type: 'bot', severity: 'info',
    title: `${state.botName} opened a trade`,
    message: `${state.botName} opened ${side.toUpperCase()} ${state.symbol}${name ? ` (${name})` : ''}.`,
    metadata: { symbol: state.symbol, side, bot: state.botName, silent: true },
  })
}
function notifyBotClose(state: BotMemState, side: 'long' | 'short', netPnl: number) {
  createNotification(state.userId, {
    type: 'bot', severity: netPnl >= 0 ? 'success' : 'warning',
    title: `${state.botName} closed a trade`,
    message: `${state.botName} closed ${side.toUpperCase()} ${state.symbol} · P&L ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)} ${state.currency}.`,
    metadata: { symbol: state.symbol, side, netPnl, bot: state.botName, silent: true },
  })
}

// ─── Main tick ────────────────────────────────────────────────────────────────

async function tick(botId: string) {
  const state = running.get(botId)
  if (!state) return

  const price = getPrice(state.symbol)
  if (!price) {
    addLog(state, 'warn', `No price for ${state.symbol}`)
    return
  }

  // ── Update the rolling bar buffer ───────────────────────────────────────────
  // While still warming up from an empty buffer, accept every 5s tick so the
  // bot warms up quickly. Once warm, aggregate ticks into ~1-minute bars (update
  // the forming bar each tick, commit a new bar each minute) so the indicators
  // run on a consistent timeframe that matches the seeded 1-minute history
  // instead of drifting onto noisy 5-second samples.
  const nowMin     = Math.floor(Date.now() / 60_000)
  const bufferWarm = state.priceBuffer.length >= state.warmupBarsNeeded && state.priceBuffer.length > 0
  if (!bufferWarm || nowMin !== state.lastBarMin || state.priceBuffer.length === 0) {
    state.priceBuffer.push(price)
    state.lastBarMin = nowMin
  } else {
    state.priceBuffer[state.priceBuffer.length - 1] = price
  }
  if (state.priceBuffer.length > 500) state.priceBuffer.shift()

  checkDailyReset(state)

  // ── Warmup ────────────────────────────────────────────────────────────────
  if (state.status === 'warming_up') {
    state.warmupBarsCurrent++
    addLog(state, 'info', `Warmup ${state.warmupBarsCurrent}/${state.warmupBarsNeeded} — ${state.symbol} @ ${price.toFixed(4)}`)
    if (state.warmupBarsCurrent >= state.warmupBarsNeeded) {
      state.status = 'running'
      addLog(state, 'info', '✓ Warmup complete — engine active')
    }
    await persist(botId, state)
    return
  }

  if (state.status !== 'running') return

  // ── SL/TP check on open position ─────────────────────────────────────────
  if (state.positionId && state.positionSide) {
    const sl = state.currentSL
    const tp = state.currentTP
    let closeReason = ''

    if (state.positionSide === 'long') {
      if (sl !== null && price <= sl) closeReason = `SL hit @ ${price.toFixed(4)} (SL: ${sl.toFixed(4)})`
      else if (tp !== null && price >= tp) closeReason = `TP hit @ ${price.toFixed(4)} (TP: ${tp.toFixed(4)})`
    } else {
      // short: SL is above entry, TP is below entry
      if (sl !== null && price >= sl) closeReason = `SL hit @ ${price.toFixed(4)} (SL: ${sl.toFixed(4)})`
      else if (tp !== null && price <= tp) closeReason = `TP hit @ ${price.toFixed(4)} (TP: ${tp.toFixed(4)})`
    }

    if (closeReason) {
      const side = state.positionSide
      try {
        const result = await closePosition(state.positionId, state.userId, state.mode, state.currency)
        recordClose(state, result.netPnl)
        addLog(state, 'trade', `[${side.toUpperCase()} CLOSED] ${closeReason} | P&L: ${fmtPnl(result.netPnl)}`)
        notifyBotClose(state, side, result.netPnl)
      } catch (err) {
        addLog(state, 'error', `SL/TP close failed: ${err instanceof Error ? err.message : String(err)}`)
        state.positionId   = null
        state.positionSide = null
      }
      await persist(botId, state)
      return
    }
  }

  // ── Generate signal ───────────────────────────────────────────────────────
  const signal = generateSignal(state.strategy, state.params, state.priceBuffer)
  const rsiNow   = calcRsi(state.priceBuffer, 14)
  const atrNow   = calcAtr(state.priceBuffer, 14)
  const trendNow = trendBias(state.priceBuffer, 50)

  // ── News event-impact filter (optional) ────────────────────────────────────
  // When enabled, the bot reads a cached, instrument-specific news verdict
  // (Claude-reasoned or rules-based) and uses it to veto trades that fight a
  // confident news read. Cache is read synchronously; misses trigger a
  // background refresh so the tick never blocks.
  const news = state.params.useNewsFilter ? getCachedNewsImpact(state.symbol) : null
  if (state.params.useNewsFilter && !news) refreshNewsImpact(state.symbol)
  const newsTag = news && news.direction !== 'neutral'
    ? ` | news ${news.direction} (${(news.confidence * 100).toFixed(0)}%)`
    : ''

  if (signal !== 'hold') {
    addLog(state, 'signal',
      `${signal.toUpperCase()} @ ${price.toFixed(4)}` +
      (!isNaN(rsiNow) ? ` | RSI ${rsiNow.toFixed(1)}` : '') +
      (!isNaN(atrNow) ? ` | ATR ${atrNow.toFixed(4)}` : '') +
      ` | trend ${trendNow}` + newsTag)
  } else {
    // Heartbeat: surface the bot's ongoing analysis (every ~30s) so it's
    // visibly working even while waiting for a valid entry.
    state.analysisCounter++
    if (state.analysisCounter % 6 === 1) {
      addLog(state, 'info',
        `Analysing ${state.symbol} @ ${price.toFixed(4)}` +
        (!isNaN(rsiNow) ? ` | RSI ${rsiNow.toFixed(1)}` : '') +
        (!isNaN(atrNow) ? ` | ATR ${atrNow.toFixed(4)}` : '') +
        ` | trend ${trendNow}` + newsTag +
        ` | ${state.positionId ? `holding ${state.positionSide}` : 'no entry — conditions not met'}`)
      if (news && news.direction !== 'neutral' && news.rationale) {
        addLog(state, 'info', `News: ${news.rationale}`)
      }
    }
  }

  // ── Risk guards ───────────────────────────────────────────────────────────
  const maxDailyTrades = state.params.maxDailyTrades ?? 10
  const maxDailyLoss   = state.params.maxDailyLoss   ?? 500
  if (state.dailyTrades >= maxDailyTrades) {
    if (signal !== 'hold') addLog(state, 'risk', `Daily trade limit (${maxDailyTrades}) reached`)
    await persist(botId, state)
    return
  }
  if (state.dailyLoss >= maxDailyLoss) {
    if (signal !== 'hold') addLog(state, 'risk', `Daily loss limit (${maxDailyLoss}) reached`)
    await persist(botId, state)
    return
  }

  // ── Confirm bars (with news-aligned boost) ────────────────────────────────
  const confirmBars = state.params.confirmBars ?? 1
  const newsMin     = state.params.newsMinConfidence ?? 0.4
  if (signal !== 'hold') state.confirmCount++
  else                    state.confirmCount = 0

  // A confident news read in the trade's favour is treated as extra confluence:
  // the entry clears the confirmation gate one bar sooner (min 1 bar).
  const newsAligned = !!news && news.confidence >= newsMin && (
    (signal === 'buy'  && news.direction === 'bullish') ||
    (signal === 'sell' && news.direction === 'bearish'))
  const requiredConfirm = newsAligned ? Math.max(1, confirmBars - 1) : confirmBars
  const confirmed = state.confirmCount >= requiredConfirm

  // ── Close opposite position before reversing ──────────────────────────────
  if (state.positionId && state.positionSide && confirmed) {
    const shouldClose =
      (state.positionSide === 'long'  && signal === 'sell') ||
      (state.positionSide === 'short' && signal === 'buy')

    if (shouldClose) {
      const side = state.positionSide
      try {
        const result = await closePosition(state.positionId, state.userId, state.mode, state.currency)
        recordClose(state, result.netPnl)
        addLog(state, 'trade',
          `[${side === 'long' ? 'LONG' : 'SHORT'} CLOSED] @ ${price.toFixed(4)} | P&L: ${fmtPnl(result.netPnl)}`)
        notifyBotClose(state, side, result.netPnl)
      } catch (err) {
        addLog(state, 'error', `Close failed: ${err instanceof Error ? err.message : String(err)}`)
        state.positionId   = null
        state.positionSide = null
        state.confirmCount = 0
      }
    }
  }

  // ── Open new position ─────────────────────────────────────────────────────
  if (!state.positionId && confirmed && (signal === 'buy' || signal === 'sell')) {
    // News veto: block entries that fight a confident, opposing news read.
    if (news && news.confidence >= newsMin &&
        ((signal === 'buy'  && news.direction === 'bearish') ||
         (signal === 'sell' && news.direction === 'bullish'))) {
      addLog(state, 'risk',
        `${signal.toUpperCase()} blocked — news ${news.direction} for ${state.symbol} ` +
        `(${(news.confidence * 100).toFixed(0)}%): ${news.rationale}`)
      state.confirmCount = 0
      await persist(botId, state)
      return
    }

    const orderSide = signal === 'buy' ? 'buy' : 'sell'
    const { sl, tp } = calcSlTp(price, orderSide, state.params, state.priceBuffer)

    try {
      const result = await placeMarketOrder(state.userId, state.mode, {
        symbol:     state.symbol,
        side:       orderSide,
        quantity:   state.params.tradeSize,
        leverage:   1,
        stopLoss:   sl,
        takeProfit: tp,
        currency:   state.currency,
      })

      // Use position ID directly from the order result — no race condition
      state.positionId   = result.id
      state.positionSide = signal === 'buy' ? 'long' : 'short'
      state.entryPrice   = result.fillPrice
      state.currentSL    = sl
      state.currentTP    = tp
      state.confirmCount = 0

      addLog(state, 'trade',
        `[${state.positionSide.toUpperCase()} OPENED] ${state.params.tradeSize} ${state.symbol} @ ${result.fillPrice.toFixed(4)} | SL: ${sl.toFixed(4)} TP: ${tp.toFixed(4)}` +
        (newsAligned ? ` | news-boosted (${news!.direction} ${(news!.confidence * 100).toFixed(0)}%)` : ''))
      notifyBotOpen(state, state.positionSide)
    } catch (err) {
      addLog(state, 'error', `Open failed: ${err instanceof Error ? err.message : String(err)}`)
      state.confirmCount = 0
    }
  }

  await persist(botId, state)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startBotEngine(botId: string, userId: string, currency = 'USD'): Promise<void> {
  if (running.has(botId)) return

  const { data: bot, error } = await supabase
    .from('bots').select('*').eq('id', botId).eq('user_id', userId).single()

  if (error || !bot) throw new Error('Bot not found')

  const params           = bot.params as BotParams
  const warmupBarsNeeded = calcWarmupBarsNeeded(bot.strategy, params)
  const botMode          = (bot.mode ?? 'demo') as 'demo' | 'real'
  const resolvedCurrency = currency !== 'USD' ? currency : ((bot.currency as string | undefined) ?? currency)

  const state: BotMemState = {
    intervalId:        null as unknown as NodeJS.Timeout,
    userId,
    botName:           (bot.name as string) ?? 'TradePilot bot',
    mode:              botMode,
    currency:          resolvedCurrency,
    symbol:            bot.symbol,
    strategy:          bot.strategy,
    params,
    priceBuffer:       [],
    positionId:        null,
    positionSide:      null,
    entryPrice:        null,
    currentSL:         null,
    currentTP:         null,
    status:            'warming_up',
    trades:            Number(bot.trades),
    wins:              Number(bot.wins),
    losses:            Number(bot.losses),
    pnl:               Number(bot.pnl),
    peakPnl:           Number(bot.peak_pnl),
    maxDrawdown:       Number(bot.max_drawdown),
    equityCurve:       (bot.equity_curve as Array<{ ts: number; pnl: number }>) ?? [],
    dailyTrades:       Number(bot.daily_trades),
    dailyLoss:         Number(bot.daily_loss),
    dailyResetDate:    bot.daily_reset_date as string,
    warmupBarsNeeded,
    warmupBarsCurrent: 0,
    logs:              (bot.logs as BotLog[]) ?? [],
    confirmCount:      0,
    analysisCounter:   0,
    lastBarMin:        0,
  }

  // ── Seed the price buffer with recent history ───────────────────────────────
  // Without this the bot starts from an empty buffer and needs minutes of live
  // 5-second ticks before indicators warm up — and then only "sees" noisy 5s
  // samples. Seeding with 1-minute candles (real Binance/TwelveData data, or a
  // mock fallback) lets it analyse and trade almost immediately on proper bars.
  try {
    const candles = await getCandles(bot.symbol, '1m', Math.max(warmupBarsNeeded + 50, 200))
    let closes    = candles.map(c => c.close).filter(n => Number.isFinite(n) && n > 0)
    // Align the historical level to the live price the bot actually ticks on, so
    // appending live ticks doesn't create an artificial gap. Scaling preserves
    // the series' shape (returns/volatility), keeping all indicators valid.
    const live = getPrice(bot.symbol)
    if (live && closes.length > 0) {
      const lastClose = closes[closes.length - 1]
      if (lastClose > 0 && Math.abs(lastClose - live) / live > 0.005) {
        const scale = live / lastClose
        closes = closes.map(c => c * scale)
      }
    }
    if (closes.length > 0) {
      state.priceBuffer       = closes.slice(-500)
      state.warmupBarsCurrent = Math.min(state.priceBuffer.length, warmupBarsNeeded)
      if (state.priceBuffer.length >= warmupBarsNeeded) {
        state.status = 'running'
        addLog(state, 'info', `Seeded ${state.priceBuffer.length} historical bars — engine active immediately`)
      } else {
        addLog(state, 'info', `Seeded ${state.priceBuffer.length} bars — collecting ${warmupBarsNeeded - state.priceBuffer.length} more live`)
      }
    }
  } catch (err) {
    addLog(state, 'warn', `History seed failed (${err instanceof Error ? err.message : 'unknown'}) — warming up on live ticks`)
  }

  // Reconnect to a position only if this bot believed it had one open
  // (persisted `position` is 'long'/'short', not 'none'). Without this guard the
  // bot would adopt — and later auto-close on SL/TP — a position the user opened
  // manually or that another bot on the same symbol owns.
  const persistedSide = (bot.position as string | undefined) ?? 'none'
  if (persistedSide === 'long' || persistedSide === 'short') {
    const { data: pos } = await supabase
      .from('positions')
      .select('id, side, avg_price, stop_loss, take_profit')
      .eq('user_id', userId)
      .eq('mode', botMode)
      .eq('symbol', bot.symbol)
      .eq('side', persistedSide)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pos) {
      state.positionId   = pos.id as string
      state.positionSide = pos.side as 'long' | 'short'
      state.entryPrice   = pos.avg_price as number
      state.currentSL    = pos.stop_loss  as number | null
      state.currentTP    = pos.take_profit as number | null
      addLog(state, 'info', `Reconnected to open ${pos.side} position ${pos.id}`)
    } else {
      // Bot thought it had a position but none exists (closed while stopped) — reset.
      addLog(state, 'info', `No open ${persistedSide} position found on restart — starting flat`)
    }
  }

  addLog(state, 'info', state.status === 'running'
    ? `Bot started — ${bot.strategy} live and analysing`
    : `Bot started — warming up ${warmupBarsNeeded} bars (${bot.strategy})`)

  await supabase.from('bots').update({
    status:              state.status,
    started_at:          new Date().toISOString(),
    warmup_bars_needed:  warmupBarsNeeded,
    warmup_bars_current: state.warmupBarsCurrent,
    updated_at:          new Date().toISOString(),
  }).eq('id', botId)

  state.intervalId = setInterval(() => { tick(botId).catch(console.error) }, TICK_MS)
  running.set(botId, state)
}

export async function stopBotEngine(botId: string, userId: string): Promise<void> {
  const state = running.get(botId)
  if (!state) {
    await supabase.from('bots').update({
      status:     'stopped',
      stopped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', botId).eq('user_id', userId)
    return
  }

  clearInterval(state.intervalId)
  running.delete(botId)
  addLog(state, 'info', 'Bot stopped by user')

  await persist(botId, state, {
    status:     'stopped',
    stopped_at: new Date().toISOString(),
  })
}
