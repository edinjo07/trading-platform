import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { getLivePrice, marketEvents } from './mockDataService'
import { getCandles } from './candleService'
import { createOrder, getPortfolio } from './tradingEngine'
import { getSentiment, getCachedSentiment } from './newsService'
import { dbSaveBot, dbDeleteBot, dbLoadAllBots, BotRow } from './dbSync'
import { Candle } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Public event bus — forward bot events to wsServer without circular deps
// ─────────────────────────────────────────────────────────────────────────────
export const botEvents = new EventEmitter()
botEvents.setMaxListeners(1000)

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type BotStrategy = 'ma_crossover' | 'rsi' | 'macd' | 'momentum'
export type BotStatus   = 'idle' | 'warming_up' | 'running' | 'paused' | 'stopped' | 'error'
export type BotPosition = 'long' | 'none'
export type LogLevel    = 'info' | 'signal' | 'trade' | 'risk' | 'warn' | 'error'

export interface BotParams {
  // MA Crossover
  fastPeriod?:        number
  slowPeriod?:        number
  // MACD
  macdFast?:          number
  macdSlow?:          number
  macdSignal?:        number
  // RSI
  rsiPeriod?:         number
  rsiOverbought?:     number
  rsiOversold?:       number
  // Momentum
  lookbackPeriod?:    number
  // Universal risk management
  tradeSize:          number
  stopLossPercent?:   number
  takeProfitPercent?: number
  maxDailyLoss?:      number
  maxDailyTrades?:    number
  confirmBars?:       number
  // News & sentiment filter
  useNewsFilter?:     boolean   // only trade when news sentiment agrees with signal
  newsWeight?:        number    // 0‒1 blend weight for sentiment in signal confidence (default 0.3)
}

export interface BotLog {
  ts:      string
  level:   LogLevel
  message: string
}

export interface BotEquityPoint {
  ts:  number
  pnl: number
}

export interface Bot {
  id:              string
  userId:          string
  name:            string
  symbol:          string
  strategy:        BotStrategy
  params:          BotParams
  status:          BotStatus
  position:        BotPosition
  createdAt:       string
  startedAt?:      string
  stoppedAt?:      string
  trades:          number
  wins:            number
  losses:          number
  pnl:             number
  peakPnl:         number
  maxDrawdown:     number
  equityCurve:     BotEquityPoint[]
  dailyTrades:     number
  dailyLoss:       number
  dailyResetDate:  string
  currentEntryPrice?: number
  currentSL?:         number
  currentTP?:         number
  warmupBarsNeeded:   number
  warmupBarsCurrent:  number
  logs:            BotLog[]
  // Risk acceptance (user must accept T&C before bot can trade)
  riskAccepted?:      boolean
  riskAcceptedAt?:    string
  // internal (stripped from wire)
  priceBuffer:        number[]
  pendingSignal:      'buy' | 'sell' | null
  pendingSignalBars:  number
  candleHandler?:     (symbol: string, candle: Candle) => void
  slTpHandle?:        ReturnType<typeof setInterval>
  dailyHandle?:       ReturnType<typeof setInterval>
}

// ─────────────────────────────────────────────────────────────────────────────
// Indicator library
// ─────────────────────────────────────────────────────────────────────────────

function sma(prices: number[], period: number): number {
  if (prices.length < period) return NaN
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period
}

function ema(prices: number[], period: number): number {
  if (prices.length < 1) return NaN
  const k = 2 / (period + 1)
  let val = prices[0]
  for (let i = 1; i < prices.length; i++) val = prices[i] * k + val * (1 - k)
  return val
}

function calcRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50
  const slice = prices.slice(-(period + 1))
  let gains = 0, losses = 0
  for (let i = 1; i < slice.length; i++) {
    const d = slice[i] - slice[i - 1]
    if (d >= 0) gains += d; else losses -= d
  }
  gains /= period; losses /= period
  if (losses === 0) return 100
  return 100 - 100 / (1 + gains / losses)
}

interface MacdResult { macd: number; signal: number; histogram: number }
function calcMACD(prices: number[], fast: number, slow: number, sig: number): MacdResult {
  if (prices.length < slow + sig) return { macd: 0, signal: 0, histogram: 0 }
  const macdLine: number[] = []
  for (let i = slow - 1; i < prices.length; i++) {
    const slice = prices.slice(0, i + 1)
    const f = ema(slice, fast), s = ema(slice, slow)
    if (!isNaN(f) && !isNaN(s)) macdLine.push(f - s)
  }
  if (macdLine.length < sig) return { macd: 0, signal: 0, histogram: 0 }
  const macdVal = macdLine[macdLine.length - 1]
  const sigVal  = ema(macdLine, sig)
  return { macd: macdVal, signal: sigVal, histogram: macdVal - sigVal }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy signal functions
// ─────────────────────────────────────────────────────────────────────────────
type Signal = 'buy' | 'sell' | 'hold'

function signalMA(prices: number[], fast: number, slow: number): Signal {
  if (prices.length < slow + 2) return 'hold'
  const fastNow  = sma(prices, fast),             slowNow  = sma(prices, slow)
  const fastPrev = sma(prices.slice(0, -1), fast), slowPrev = sma(prices.slice(0, -1), slow)
  if (isNaN(fastNow) || isNaN(slowNow) || isNaN(fastPrev) || isNaN(slowPrev)) return 'hold'
  if (fastPrev <= slowPrev && fastNow > slowNow) return 'buy'
  if (fastPrev >= slowPrev && fastNow < slowNow) return 'sell'
  return 'hold'
}

function signalRSI(prices: number[], period: number, ob: number, os: number): Signal {
  if (prices.length < period + 2) return 'hold'
  const now  = calcRSI(prices, period)
  const prev = calcRSI(prices.slice(0, -1), period)
  if (prev < os && now >= os) return 'buy'
  if (prev > ob && now <= ob) return 'sell'
  return 'hold'
}

function signalMACD(prices: number[], fast: number, slow: number, sig: number): Signal {
  const n = prices.length
  if (n < slow + sig + 2) return 'hold'
  const curr = calcMACD(prices, fast, slow, sig)
  const prev = calcMACD(prices.slice(0, -1), fast, slow, sig)
  if (prev.histogram < 0 && curr.histogram >= 0) return 'buy'
  if (prev.histogram > 0 && curr.histogram <= 0) return 'sell'
  return 'hold'
}

function signalMomentum(prices: number[], lookback: number): Signal {
  if (prices.length < lookback + 1) return 'hold'
  const current = prices[prices.length - 1]
  const window  = prices.slice(-lookback - 1, -1)
  const hi = Math.max(...window), lo = Math.min(...window)
  if (current > hi) return 'buy'
  if (current < lo) return 'sell'
  return 'hold'
}

// ─────────────────────────────────────────────────────────────────────────────
// Warmup bar requirements per strategy
// ─────────────────────────────────────────────────────────────────────────────
function barsNeeded(strategy: BotStrategy, params: BotParams): number {
  switch (strategy) {
    case 'ma_crossover': return (params.slowPeriod   ?? 21) + 3
    case 'rsi':          return (params.rsiPeriod    ?? 14) + 3
    case 'macd':         return (params.macdSlow     ?? 26) + (params.macdSignal ?? 9) + 3
    case 'momentum':     return (params.lookbackPeriod ?? 20) + 3
    default:             return 30
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Bot Engine (singleton)
// ─────────────────────────────────────────────────────────────────────────────
class BotEngine {
  private bots = new Map<string, Bot>()

  // ── CRUD ────────────────────────────────────────────────────────────────────

  createBot(userId: string, name: string, symbol: string, strategy: BotStrategy, params: BotParams): Bot {
    const needed = barsNeeded(strategy, params)
    const bot: Bot = {
      id: uuidv4(), userId, name, symbol, strategy, params,
      status: 'idle', position: 'none',
      createdAt: new Date().toISOString(),
      trades: 0, wins: 0, losses: 0, pnl: 0, peakPnl: 0, maxDrawdown: 0,
      equityCurve: [], dailyTrades: 0, dailyLoss: 0, dailyResetDate: today(),
      warmupBarsNeeded: needed, warmupBarsCurrent: 0,
      logs: [], priceBuffer: [], pendingSignal: null, pendingSignalBars: 0,
    }
    this.bots.set(bot.id, bot)
    this.log(bot, 'info',
      `[TradePilot] Bot created — ${strategy.toUpperCase()} on ${symbol} | size=${params.tradeSize}` +
      (params.stopLossPercent   ? ` | SL=${params.stopLossPercent}%`   : '') +
      (params.takeProfitPercent ? ` | TP=${params.takeProfitPercent}%` : '') +
      ` | warmup=${needed} bars`)
    dbSaveBot(this.toRow(bot)).catch(e => console.error('[Bot] save on create:', e))
    return bot
  }

  getBotsForUser(userId: string): Bot[] {
    return [...this.bots.values()].filter(b => b.userId === userId).map(b => this.wireView(b))
  }

  getBotById(id: string): Bot | undefined {
    const b = this.bots.get(id)
    return b ? this.wireView(b) : undefined
  }

  // ── Start / Stop ─────────────────────────────────────────────────────────

  /** Internal boot: wire candle listener, SL/TP check, warmup. No auth check. */
  private bootBot(bot: Bot, logMsg: string): void {
    bot.status    = 'warming_up'
    bot.startedAt = new Date().toISOString()
    bot.stoppedAt = undefined

    const handler = (symbol: string, candle: Candle) => {
      if (symbol === bot.symbol) this.onCandle(bot, candle)
    }
    bot.candleHandler = handler
    marketEvents.on('candle', handler)

    bot.slTpHandle  = setInterval(() => this.checkSlTp(bot), 3000)
    bot.dailyHandle = setInterval(() => this.checkDailyReset(bot), 60_000)

    this.warmupAsync(bot)

    this.log(bot, 'info', logMsg)

    if (bot.params.useNewsFilter) {
      getSentiment(bot.symbol)
        .then(s => this.log(bot, 'info', `News cache warm — ${s.label} (${s.score >= 0 ? '+' : ''}${s.score.toFixed(2)}) — "${s.headlines[0]?.title?.slice(0, 60)}…"`))
        .catch(() => this.log(bot, 'info', 'News cache warm — using fallback sentiment'))
    }
  }

  startBot(id: string, userId: string): Bot {
    const bot = this.getOwned(id, userId)
    if (bot.status === 'running' || bot.status === 'warming_up')
      throw new Error('Bot is already running')

    this.bootBot(bot, `Bot started — fetching real historical bars for ${bot.symbol}…`)
    return this.wireView(bot)
  }

  stopBot(id: string, userId: string): Bot {
    const bot = this.getOwned(id, userId)
    this.halt(bot, 'stopped')
    this.log(bot, 'info', 'Bot stopped by user')
    return this.wireView(bot)
  }

  deleteBot(id: string, userId: string): void {
    const bot = this.getOwned(id, userId)
    this.halt(bot, 'stopped')
    this.bots.delete(id)
    dbDeleteBot(id).catch(e => console.error('[Bot] delete from DB:', e))
  }

  // ── Warmup ─────────────────────────────────────────────────────────────────

  // ── Async warmup — populates priceBuffer from real OHLCV data ──────────────
  //   Crypto  → Binance REST klines (free, no auth needed)
  //   Stocks  → Twelve Data REST (TWELVE_DATA_API_KEY env var)
  //   Fallback → live candles accumulate organically during warming_up
  private async warmupAsync(bot: Bot): Promise<void> {
    const barsNeeded = Math.max(bot.warmupBarsNeeded + 20, 100)
    try {
      const candles = await getCandles(bot.symbol, '1m', barsNeeded)
      // Bot may have been stopped while the fetch was in-flight
      if (bot.status === 'stopped' || bot.status === 'error') return
      if (candles.length === 0) {
        this.log(bot, 'warn', 'No historical bars returned — accumulating from live candles')
        return
      }
      // Merge: replace buffer with real history; keep any live bars accumulated so far
      const livePrices = bot.priceBuffer.slice()  // bars collected during the fetch
      bot.priceBuffer = [...candles.map(c => c.close), ...livePrices].slice(-500)
      bot.warmupBarsCurrent = bot.priceBuffer.length
      if (bot.warmupBarsCurrent >= bot.warmupBarsNeeded) {
        if (bot.status === 'warming_up') bot.status = 'running'
        this.log(bot, 'info',
          `✅ Warmup complete — ${candles.length} real bars loaded for ${bot.symbol}` +
          (bot.symbol.includes('USDT') ? ' (Binance)' : ' (Twelve Data/fallback)'))
        this.emit(bot)
      } else {
        this.log(bot, 'warn',
          `Partial warmup: ${bot.warmupBarsCurrent}/${bot.warmupBarsNeeded} bars — collecting live candles`)
      }
    } catch (e: any) {
      if (bot.status !== 'stopped' && bot.status !== 'error') {
        this.log(bot, 'warn', `Warmup fetch failed (${e.message}) — bot will warm up from live candles`)
      }
    }
  }

  // ── Candle event handler (main bot logic) ─────────────────────────────────

  private onCandle(bot: Bot, candle: Candle): void {
    if (bot.status !== 'running' && bot.status !== 'warming_up') return

    bot.priceBuffer.push(candle.close)
    if (bot.priceBuffer.length > 500) bot.priceBuffer.shift()

    if (bot.status === 'warming_up') {
      bot.warmupBarsCurrent++
      if (bot.warmupBarsCurrent >= bot.warmupBarsNeeded) {
        bot.status = 'running'
        this.log(bot, 'info', `Warmup complete (${bot.warmupBarsCurrent} bars) — now trading live`)
        this.emit(bot)
      }
      return
    }

    this.checkDailyReset(bot)

    const price = candle.close
    const p = bot.params

    if (p.maxDailyTrades && bot.dailyTrades >= p.maxDailyTrades) {
      this.log(bot, 'risk', `Daily trade cap (${bot.dailyTrades}/${p.maxDailyTrades}) — skipping signal`)
      return
    }
    if (p.maxDailyLoss && bot.dailyLoss >= p.maxDailyLoss) {
      bot.status = 'paused'
      this.log(bot, 'risk',
        `Daily loss limit $${p.maxDailyLoss} reached ($${bot.dailyLoss.toFixed(2)}) — pausing until tomorrow`)
      this.emit(bot); return
    }

    const rawSignal = this.computeSignal(bot)
    const confirmBars = p.confirmBars ?? 1
    let actionSignal: Signal = 'hold'

    if (rawSignal !== 'hold') {
      if (rawSignal === bot.pendingSignal) {
        bot.pendingSignalBars++
        if (bot.pendingSignalBars >= confirmBars) {
          actionSignal = rawSignal
          bot.pendingSignal = null; bot.pendingSignalBars = 0
        }
      } else {
        bot.pendingSignal = rawSignal; bot.pendingSignalBars = 1
        if (confirmBars <= 1) { actionSignal = rawSignal; bot.pendingSignal = null; bot.pendingSignalBars = 0 }
      }
    } else {
      bot.pendingSignal = null; bot.pendingSignalBars = 0
    }

    const indLine = this.indicatorSummary(bot, price)
    if (rawSignal !== 'hold') {
      this.log(bot, 'signal',
        `${rawSignal.toUpperCase()}${actionSignal !== 'hold' ? ' ✓ CONFIRMED' : ` (${bot.pendingSignalBars}/${confirmBars})`}` +
        ` @ ${price.toFixed(5)} | ${indLine}`)
    }

    try {
      if (actionSignal === 'buy' && bot.position === 'none') {
        // ── News sentiment filter gate ────────────────────────────────────
        if (bot.params.useNewsFilter) {
          const s = getCachedSentiment(bot.symbol)
          if (s) {
            const tag = `[News: ${s.label} ${s.score >= 0 ? '+' : ''}${s.score.toFixed(2)}]`
            if (s.score < -0.1) {
              this.log(bot, 'risk',
                `Buy blocked by news filter ${tag} — "${s.headlines[0]?.title?.slice(0, 55)}…"`)
              // refresh cache in background so next candle has fresh data
              getSentiment(bot.symbol).catch(() => {})
              return
            }
            this.log(bot, 'info', `News filter passed ${tag}`)
          } else {
            // no cache yet — fire off async fetch and proceed (don't block)
            getSentiment(bot.symbol).catch(() => {})
          }
        }
        this.enterLong(bot, price)
      } else if (actionSignal === 'sell' && bot.position === 'long') {
        this.exitLong(bot, price, 'signal')
      }
    } catch (err: any) { this.log(bot, 'error', `Trade error: ${err.message}`) }
  }

  // ── Entry / Exit ──────────────────────────────────────────────────────────

  private enterLong(bot: Bot, price: number): void {
    const p = bot.params
    const portfolio = getPortfolio(bot.userId)
    if (portfolio.cashBalance < p.tradeSize * price) {
      this.log(bot, 'warn',
        `Skipping buy — need $${(p.tradeSize * price).toFixed(2)}, have $${portfolio.cashBalance.toFixed(2)}`)
      return
    }
    createOrder(bot.userId, bot.symbol, 'buy', 'market', p.tradeSize)
    bot.position          = 'long'
    bot.currentEntryPrice = price
    bot.currentSL = p.stopLossPercent   ? price * (1 - p.stopLossPercent   / 100) : undefined
    bot.currentTP = p.takeProfitPercent ? price * (1 + p.takeProfitPercent / 100) : undefined
    bot.dailyTrades++
    this.log(bot, 'trade',
      `🟢 BUY  ${p.tradeSize} ${bot.symbol} @ ${price.toFixed(5)}` +
      (bot.currentSL ? ` | SL ${bot.currentSL.toFixed(5)}` : '') +
      (bot.currentTP ? ` | TP ${bot.currentTP.toFixed(5)}` : ''))
    this.emit(bot)
  }

  private exitLong(bot: Bot, price: number, reason: 'signal' | 'sl' | 'tp'): void {
    const p = bot.params
    const portfolio = getPortfolio(bot.userId)
    const pos = portfolio.positions.find(pos => pos.symbol === bot.symbol)
    if (!pos || pos.quantity < p.tradeSize - 1e-6) {
      bot.position = 'none'; bot.currentEntryPrice = undefined
      bot.currentSL = undefined; bot.currentTP = undefined
      this.log(bot, 'info', 'Position closed externally — bot re-synced'); return
    }
    createOrder(bot.userId, bot.symbol, 'sell', 'market', p.tradeSize)
    const tradePnl = (price - (bot.currentEntryPrice ?? price)) * p.tradeSize
    bot.pnl += tradePnl; bot.trades++
    if (tradePnl < 0) { bot.dailyLoss += Math.abs(tradePnl); bot.losses++ } else { bot.wins++ }
    bot.dailyTrades++
    if (bot.pnl > bot.peakPnl) bot.peakPnl = bot.pnl
    const dd = bot.peakPnl > 0 ? ((bot.peakPnl - bot.pnl) / bot.peakPnl) * 100 : 0
    if (dd > bot.maxDrawdown) bot.maxDrawdown = dd
    bot.equityCurve.push({ ts: Date.now(), pnl: bot.pnl })
    if (bot.equityCurve.length > 200) bot.equityCurve.shift()
    const lbl = reason === 'sl' ? '🔴 SL HIT' : reason === 'tp' ? '🟡 TP HIT' : '🔵 SELL'
    this.log(bot, 'trade',
      `${lbl} ${p.tradeSize} ${bot.symbol} @ ${price.toFixed(5)} | ` +
      `P&L: ${tradePnl >= 0 ? '+' : ''}$${tradePnl.toFixed(2)} | ` +
      `Total: ${bot.pnl >= 0 ? '+' : ''}$${bot.pnl.toFixed(2)}`)
    bot.position = 'none'; bot.currentEntryPrice = undefined
    bot.currentSL = undefined; bot.currentTP = undefined
    this.emit(bot)
  }

  // ── SL/TP intra-candle check ──────────────────────────────────────────────

  private checkSlTp(bot: Bot): void {
    if (bot.status !== 'running' || bot.position !== 'long') return
    const price = getLivePrice(bot.symbol)
    if (!price || price <= 0) return
    if (bot.currentSL && price <= bot.currentSL) {
      this.log(bot, 'risk', `Stop-loss triggered @ ${price.toFixed(5)} (SL: ${bot.currentSL.toFixed(5)})`)
      try { this.exitLong(bot, price, 'sl') } catch (e: any) { this.log(bot, 'error', e.message) }
      return
    }
    if (bot.currentTP && price >= bot.currentTP) {
      this.log(bot, 'risk', `Take-profit triggered @ ${price.toFixed(5)} (TP: ${bot.currentTP.toFixed(5)})`)
      try { this.exitLong(bot, price, 'tp') } catch (e: any) { this.log(bot, 'error', e.message) }
    }
  }

  // ── Daily reset ───────────────────────────────────────────────────────────

  private checkDailyReset(bot: Bot): void {
    const t = today()
    if (t !== bot.dailyResetDate) {
      bot.dailyTrades = 0; bot.dailyLoss = 0; bot.dailyResetDate = t
      if (bot.status === 'paused') {
        bot.status = 'running'
        this.log(bot, 'info', 'New trading day — daily limits reset, bot resumed')
        this.emit(bot)
      }
    }
  }

  // ── Strategy dispatch ─────────────────────────────────────────────────────

  private computeSignal(bot: Bot): Signal {
    const buf = bot.priceBuffer, p = bot.params
    switch (bot.strategy) {
      case 'ma_crossover': return signalMA(buf, p.fastPeriod ?? 9, p.slowPeriod ?? 21)
      case 'rsi':          return signalRSI(buf, p.rsiPeriod ?? 14, p.rsiOverbought ?? 70, p.rsiOversold ?? 30)
      case 'macd':         return signalMACD(buf, p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSignal ?? 9)
      case 'momentum':     return signalMomentum(buf, p.lookbackPeriod ?? 20)
      default:             return 'hold'
    }
  }

  private indicatorSummary(bot: Bot, price: number): string {
    const buf = bot.priceBuffer, p = bot.params
    switch (bot.strategy) {
      case 'ma_crossover': {
        const f = sma(buf, p.fastPeriod ?? 9), s = sma(buf, p.slowPeriod ?? 21)
        return `MA(${p.fastPeriod ?? 9})=${isNaN(f) ? 'n/a' : f.toFixed(4)} MA(${p.slowPeriod ?? 21})=${isNaN(s) ? 'n/a' : s.toFixed(4)}`
      }
      case 'rsi': {
        const r = calcRSI(buf, p.rsiPeriod ?? 14)
        return `RSI(${p.rsiPeriod ?? 14})=${r.toFixed(1)} [${p.rsiOversold ?? 30}/${p.rsiOverbought ?? 70}]`
      }
      case 'macd': {
        const m = calcMACD(buf, p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSignal ?? 9)
        return `MACD=${m.macd.toFixed(4)} Sig=${m.signal.toFixed(4)} Hist=${m.histogram.toFixed(4)}`
      }
      case 'momentum': {
        const lb = p.lookbackPeriod ?? 20
        const hi = Math.max(...buf.slice(-lb)), lo = Math.min(...buf.slice(-lb))
        return `Price=${price.toFixed(4)} HH=${hi.toFixed(4)} LL=${lo.toFixed(4)}`
      }
      default: return ''
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private log(bot: Bot, level: LogLevel, message: string): void {
    bot.logs.push({ ts: new Date().toISOString(), level, message })
    if (bot.logs.length > 250) bot.logs.shift()
  }

  private halt(bot: Bot, status: BotStatus): void {
    if (bot.candleHandler) { marketEvents.off('candle', bot.candleHandler); bot.candleHandler = undefined }
    if (bot.slTpHandle)    { clearInterval(bot.slTpHandle);  bot.slTpHandle  = undefined }
    if (bot.dailyHandle)   { clearInterval(bot.dailyHandle); bot.dailyHandle = undefined }
    bot.status = status; bot.stoppedAt = new Date().toISOString()
    dbSaveBot(this.toRow(bot)).catch(e => console.error('[Bot] save on halt:', e))
  }

  private emit(bot: Bot): void {
    botEvents.emit('botUpdate', bot.userId, bot.id, this.wireView(bot))
    dbSaveBot(this.toRow(bot)).catch(e => console.error('[Bot] save on emit:', e))
  }

  private getOwned(id: string, userId: string): Bot {
    const b = this.bots.get(id)
    if (!b)                throw new Error('Bot not found')
    if (b.userId !== userId) throw new Error('Not authorized')
    return b
  }

  private wireView(bot: Bot): Bot {
    const { candleHandler, slTpHandle, dailyHandle, priceBuffer, pendingSignal, pendingSignalBars, ...rest } = bot
    return { ...rest, priceBuffer: [], pendingSignal: null, pendingSignalBars: 0 } as Bot
  }

  private toRow(bot: Bot): BotRow {
    return {
      id: bot.id, userId: bot.userId, name: bot.name,
      symbol: bot.symbol, strategy: bot.strategy, params: bot.params,
      status: bot.status, position: bot.position,
      trades: bot.trades, wins: bot.wins, losses: bot.losses,
      pnl: bot.pnl, peakPnl: bot.peakPnl, maxDrawdown: bot.maxDrawdown,
      equityCurve: bot.equityCurve ?? [],
      dailyTrades: bot.dailyTrades, dailyLoss: bot.dailyLoss,
      dailyResetDate: bot.dailyResetDate,
      warmupBarsNeeded: bot.warmupBarsNeeded, warmupBarsCurrent: bot.warmupBarsCurrent,
      logs: bot.logs ?? [],
      riskAccepted: bot.riskAccepted, riskAcceptedAt: bot.riskAcceptedAt,
      createdAt: bot.createdAt, startedAt: bot.startedAt, stoppedAt: bot.stoppedAt,
    }
  }

  // ── Restore from DB on server startup ─────────────────────────────────────
  async loadFromDB(): Promise<void> {
    try {
      const rows = await dbLoadAllBots()
      for (const row of rows) {
        if (this.bots.has(row.id)) continue  // already in memory
        const needed = row.warmupBarsNeeded || barsNeeded(row.strategy as BotStrategy, row.params as BotParams)
        const bot: Bot = {
          id: row.id, userId: row.userId, name: row.name,
          symbol: row.symbol, strategy: row.strategy as BotStrategy,
          params: row.params as BotParams,
          // Preserve saved status so we can auto-resume after deploy
          status: (row.status === 'running' || row.status === 'warming_up') ? 'running' : (row.status as BotStatus ?? 'idle'),
          position: (row.position as BotPosition) ?? 'none',
          createdAt: row.createdAt, startedAt: row.startedAt, stoppedAt: row.stoppedAt,
          trades: row.trades, wins: row.wins, losses: row.losses,
          pnl: row.pnl, peakPnl: row.peakPnl, maxDrawdown: row.maxDrawdown,
          equityCurve: row.equityCurve ?? [],
          dailyTrades: row.dailyTrades, dailyLoss: row.dailyLoss,
          dailyResetDate: row.dailyResetDate || today(),
          warmupBarsNeeded: needed, warmupBarsCurrent: 0,
          logs: ((row.logs ?? []) as BotLog[]).slice(-50),
          riskAccepted: row.riskAccepted, riskAcceptedAt: row.riskAcceptedAt,
          priceBuffer: [], pendingSignal: null, pendingSignalBars: 0,
        }
        this.bots.set(bot.id, bot)
      }
      // Auto-resume bots that were running before the server restarted
      const toResume = rows.filter(r => r.status === 'running' || r.status === 'warming_up')
      for (const row of toResume) {
        const bot = this.bots.get(row.id)
        if (bot) {
          this.bootBot(bot, `Bot auto-resumed after server restart — warming up ${bot.symbol}…`)
          console.log(`[Bot] ⏩ Auto-resumed "${bot.name}" (${bot.symbol})`)
        }
      }
      if (rows.length > 0) console.log(`[Bot] ✓ ${rows.length} bot(s) restored from DB (${toResume.length} auto-resumed)`)
    } catch (e: unknown) {
      console.error('[Bot] loadFromDB failed:', e)
    }
  }
}

function today(): string { return new Date().toISOString().slice(0, 10) }

export const botEngine = new BotEngine()

