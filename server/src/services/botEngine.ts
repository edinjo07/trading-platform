/**
 * botEngine.ts
 *
 * In-memory bot runner. Each bot runs on a setInterval tick, reads live prices,
 * computes strategy signals, and executes trades via orderEngine.
 * State is persisted to Supabase after each tick so the client always sees fresh data.
 */

import { supabase } from '../db'
import { getPrice } from './priceService'
import { placeMarketOrder, closePosition } from './orderEngine'

const TICK_MS  = 5_000  // one price bar every 5 seconds
const MAX_LOGS = 150    // ring-buffer cap for bot logs

// ─── In-memory types ──────────────────────────────────────────────────────────

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
}

interface BotLog {
  ts:      string
  level:   'info' | 'signal' | 'trade' | 'risk' | 'warn' | 'error'
  message: string
}

interface BotMemState {
  intervalId:          NodeJS.Timeout
  userId:              string
  mode:                'demo' | 'real'
  symbol:              string
  strategy:            string
  params:              BotParams
  priceBuffer:         number[]
  positionId:          string | null
  entryPrice:          number | null
  currentSL:           number | null
  currentTP:           number | null
  status:              string
  trades:              number
  wins:                number
  losses:              number
  pnl:                 number
  peakPnl:             number
  maxDrawdown:         number
  equityCurve:         Array<{ ts: number; pnl: number }>
  dailyTrades:         number
  dailyLoss:           number
  dailyResetDate:      string
  warmupBarsNeeded:    number
  warmupBarsCurrent:   number
  logs:                BotLog[]
  confirmCount:        number
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
    case 'ma_crossover': return (params.slowPeriod  ?? 20) + 1
    case 'rsi':          return (params.rsiPeriod   ?? 14) + 2
    case 'macd':         return (params.macdSlow    ?? 26) + (params.macdSignal ?? 9) + 5
    case 'momentum':     return (params.lookbackPeriod ?? 10) + 2
    default:             return 20
  }
}

// ─── Technical indicators ─────────────────────────────────────────────────────

function sma(arr: number[], period: number): number {
  if (arr.length < period) return NaN
  const s = arr.slice(-period)
  return s.reduce((a, b) => a + b, 0) / period
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

// ─── Strategy signals ─────────────────────────────────────────────────────────

type Signal = 'buy' | 'sell' | 'hold'

function maCrossoverSignal(prices: number[], fast: number, slow: number): Signal {
  if (prices.length < slow + 1) return 'hold'
  const prev = prices.slice(0, -1)
  const fp = sma(prev, fast), sp = sma(prev, slow)
  const fn = sma(prices, fast), sn = sma(prices, slow)
  if ([fp, sp, fn, sn].some(isNaN)) return 'hold'
  if (fp <= sp && fn > sn) return 'buy'
  if (fp >= sp && fn < sn) return 'sell'
  return 'hold'
}

function rsiSignal(prices: number[], period: number, overbought: number, oversold: number): Signal {
  const r = calcRsi(prices, period)
  if (isNaN(r)) return 'hold'
  if (r < oversold)   return 'buy'
  if (r > overbought) return 'sell'
  return 'hold'
}

function macdSignalFn(prices: number[], fast: number, slow: number, signal: number): Signal {
  // Only use the last (slow + signal + 20) bars for performance
  const window = slow + signal + 20
  const p = prices.length > window ? prices.slice(-window) : prices
  if (p.length < slow + signal + 1) return 'hold'

  const macdLine: number[] = []
  for (let i = slow - 1; i < p.length; i++) {
    const s = p.slice(0, i + 1)
    const e = ema(s, fast) - ema(s, slow)
    if (!isNaN(e)) macdLine.push(e)
  }
  if (macdLine.length < signal + 1) return 'hold'

  const sigNow  = ema(macdLine, signal)
  const sigPrev = ema(macdLine.slice(0, -1), signal)
  const mNow    = macdLine[macdLine.length - 1]
  const mPrev   = macdLine[macdLine.length - 2]
  if (isNaN(sigNow) || isNaN(sigPrev)) return 'hold'

  if (mPrev <= sigPrev && mNow > sigNow) return 'buy'
  if (mPrev >= sigPrev && mNow < sigNow) return 'sell'
  return 'hold'
}

function momentumSignal(prices: number[], lookback: number): Signal {
  if (prices.length < lookback + 1) return 'hold'
  const curr  = prices[prices.length - 1]
  const start = prices[prices.length - 1 - lookback]
  const pct   = (curr - start) / start
  if (pct >  0.005) return 'buy'
  if (pct < -0.005) return 'sell'
  return 'hold'
}

function generateSignal(strategy: string, params: BotParams, prices: number[]): Signal {
  switch (strategy) {
    case 'ma_crossover': return maCrossoverSignal(prices, params.fastPeriod ?? 10, params.slowPeriod ?? 20)
    case 'rsi':          return rsiSignal(prices, params.rsiPeriod ?? 14, params.rsiOverbought ?? 70, params.rsiOversold ?? 30)
    case 'macd':         return macdSignalFn(prices, params.macdFast ?? 12, params.macdSlow ?? 26, params.macdSignal ?? 9)
    case 'momentum':     return momentumSignal(prices, params.lookbackPeriod ?? 10)
    default:             return 'hold'
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
    position:            state.positionId ? 'long' : 'none',
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

// ─── Main tick ────────────────────────────────────────────────────────────────

async function tick(botId: string) {
  const state = running.get(botId)
  if (!state) return

  const price = getPrice(state.symbol)
  if (!price) {
    addLog(state, 'warn', `No price available for ${state.symbol}`)
    return
  }

  state.priceBuffer.push(price)
  if (state.priceBuffer.length > 500) state.priceBuffer.shift()

  checkDailyReset(state)

  // ── Warmup phase ──────────────────────────────────────────────────────────
  if (state.status === 'warming_up') {
    state.warmupBarsCurrent++
    addLog(state, 'info', `Warming up ${state.warmupBarsCurrent}/${state.warmupBarsNeeded} — price ${price.toFixed(4)}`)
    if (state.warmupBarsCurrent >= state.warmupBarsNeeded) {
      state.status = 'running'
      addLog(state, 'info', 'Warmup complete — bot is now active')
    }
    await persist(botId, state)
    return
  }

  if (state.status !== 'running') return

  // ── SL/TP check on open position ─────────────────────────────────────────
  if (state.positionId) {
    const sl = state.currentSL
    const tp = state.currentTP
    let closeReason = ''

    if (sl !== null && price <= sl)   closeReason = `Stop-loss hit @ ${price.toFixed(4)} (SL: ${sl.toFixed(4)})`
    else if (tp !== null && price >= tp) closeReason = `Take-profit hit @ ${price.toFixed(4)} (TP: ${tp.toFixed(4)})`

    if (closeReason) {
      try {
        const result = await closePosition(state.positionId, state.userId, state.mode)
        recordClose(state, result.netPnl)
        addLog(state, 'trade', `${closeReason} | net PnL: ${fmt(result.netPnl)}`)
      } catch (err) {
        addLog(state, 'error', `SL/TP close failed: ${String(err instanceof Error ? err.message : err)}`)
        state.positionId = null  // position may have been already closed
      }
      await persist(botId, state)
      return
    }
  }

  // ── Generate signal ───────────────────────────────────────────────────────
  const signal = generateSignal(state.strategy, state.params, state.priceBuffer)
  if (signal !== 'hold') addLog(state, 'signal', `${signal.toUpperCase()} signal @ ${price.toFixed(4)}`)

  // ── Risk guards ───────────────────────────────────────────────────────────
  const maxDailyTrades = state.params.maxDailyTrades ?? 10
  const maxDailyLoss   = state.params.maxDailyLoss   ?? 500
  if (state.dailyTrades >= maxDailyTrades) {
    if (signal !== 'hold') addLog(state, 'risk', `Daily trade limit (${maxDailyTrades}) reached — skipping`)
    await persist(botId, state)
    return
  }
  if (state.dailyLoss >= maxDailyLoss) {
    if (signal !== 'hold') addLog(state, 'risk', `Daily loss limit ($${maxDailyLoss}) reached — skipping`)
    await persist(botId, state)
    return
  }

  // ── Confirm bars ──────────────────────────────────────────────────────────
  const confirmBars = state.params.confirmBars ?? 1
  if (signal !== 'hold') state.confirmCount++
  else                    state.confirmCount = 0
  const confirmed = state.confirmCount >= confirmBars

  // ── Open long ─────────────────────────────────────────────────────────────
  if (signal === 'buy' && !state.positionId && confirmed) {
    try {
      const slPct = (state.params.stopLossPercent   ?? 2) / 100
      const tpPct = (state.params.takeProfitPercent ?? 4) / 100
      const sl = parseFloat((price * (1 - slPct)).toFixed(8))
      const tp = parseFloat((price * (1 + tpPct)).toFixed(8))

      const result = await placeMarketOrder(state.userId, state.mode, {
        symbol:     state.symbol,
        side:       'buy',
        quantity:   state.params.tradeSize,
        leverage:   1,
        stopLoss:   sl,
        takeProfit: tp,
      })

      // Fetch the newly created position ID
      const { data: pos } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', state.userId)
        .eq('mode', state.mode)
        .eq('symbol', state.symbol)
        .eq('side', 'long')
        .maybeSingle()

      state.positionId   = pos?.id ?? null
      state.entryPrice   = result.fillPrice
      state.currentSL    = sl
      state.currentTP    = tp
      state.confirmCount = 0
      addLog(state, 'trade',
        `Opened LONG ${state.params.tradeSize} ${state.symbol} @ ${result.fillPrice.toFixed(4)} | SL: ${sl.toFixed(4)} TP: ${tp.toFixed(4)}`)
    } catch (err) {
      addLog(state, 'error', `Open failed: ${String(err instanceof Error ? err.message : err)}`)
      state.confirmCount = 0
    }
  }

  // ── Close long ────────────────────────────────────────────────────────────
  if (signal === 'sell' && state.positionId && confirmed) {
    try {
      const result = await closePosition(state.positionId, state.userId, state.mode)
      recordClose(state, result.netPnl)
      addLog(state, 'trade', `Closed LONG ${state.symbol} @ ${result.exitPrice.toFixed(4)} | net PnL: ${fmt(result.netPnl)}`)
    } catch (err) {
      addLog(state, 'error', `Close failed: ${String(err instanceof Error ? err.message : err)}`)
      state.positionId = null
      state.confirmCount = 0
    }
  }

  await persist(botId, state)
}

// ─── Trade recording helper ───────────────────────────────────────────────────

function recordClose(state: BotMemState, netPnl: number) {
  state.trades++
  state.dailyTrades++
  if (netPnl > 0) state.wins++
  else { state.losses++; state.dailyLoss += Math.abs(netPnl) }
  state.pnl        += netPnl
  state.peakPnl     = Math.max(state.peakPnl, state.pnl)
  state.maxDrawdown = Math.max(state.maxDrawdown, state.peakPnl - state.pnl)
  state.equityCurve.push({ ts: Date.now(), pnl: state.pnl })
  state.positionId   = null
  state.entryPrice   = null
  state.currentSL    = null
  state.currentTP    = null
  state.confirmCount = 0
}

function fmt(n: number) { return `${n >= 0 ? '+' : ''}$${n.toFixed(2)}` }

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startBotEngine(botId: string, userId: string): Promise<void> {
  if (running.has(botId)) return

  const { data: bot, error } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .eq('user_id', userId)
    .single()

  if (error || !bot) throw new Error('Bot not found')

  const params             = bot.params as BotParams
  const warmupBarsNeeded   = calcWarmupBarsNeeded(bot.strategy, params)
  const botMode            = (bot.mode ?? 'demo') as 'demo' | 'real'

  const state: BotMemState = {
    intervalId:          null as unknown as NodeJS.Timeout,
    userId,
    mode:                botMode,
    symbol:              bot.symbol,
    strategy:            bot.strategy,
    params,
    priceBuffer:         [],
    positionId:          null,
    entryPrice:          null,
    currentSL:           null,
    currentTP:           null,
    status:              'warming_up',
    trades:              Number(bot.trades),
    wins:                Number(bot.wins),
    losses:              Number(bot.losses),
    pnl:                 Number(bot.pnl),
    peakPnl:             Number(bot.peak_pnl),
    maxDrawdown:         Number(bot.max_drawdown),
    equityCurve:         (bot.equity_curve as Array<{ ts: number; pnl: number }>) ?? [],
    dailyTrades:         Number(bot.daily_trades),
    dailyLoss:           Number(bot.daily_loss),
    dailyResetDate:      bot.daily_reset_date as string,
    warmupBarsNeeded,
    warmupBarsCurrent:   0,
    logs:                (bot.logs as BotLog[]) ?? [],
    confirmCount:        0,
  }

  // Reload open position if one exists
  const { data: pos } = await supabase
    .from('positions')
    .select('id, avg_price, stop_loss, take_profit')
    .eq('user_id', userId)
    .eq('mode', botMode)
    .eq('symbol', bot.symbol)
    .eq('side', 'long')
    .maybeSingle()

  if (pos) {
    state.positionId = pos.id as string
    state.entryPrice = pos.avg_price as number
    state.currentSL  = pos.stop_loss as number | null
    state.currentTP  = pos.take_profit as number | null
    addLog(state, 'info', `Reconnected to open position ${pos.id}`)
  }

  addLog(state, 'info', `Bot started — warming up for ${warmupBarsNeeded} bars`)

  await supabase.from('bots').update({
    status:              'warming_up',
    started_at:          new Date().toISOString(),
    warmup_bars_needed:  warmupBarsNeeded,
    warmup_bars_current: 0,
    updated_at:          new Date().toISOString(),
  }).eq('id', botId)

  state.intervalId = setInterval(() => { tick(botId).catch(console.error) }, TICK_MS)
  running.set(botId, state)
}

export async function stopBotEngine(botId: string, userId: string): Promise<void> {
  const state = running.get(botId)
  if (!state) {
    // Not in-memory but make sure DB is consistent
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
