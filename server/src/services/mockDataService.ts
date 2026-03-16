import { Candle, Ticker, OrderBook, OrderBookEntry, Trade, Symbol } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { startRealDataFeeds } from './realDataService'

// ---------------------------------------------------------------------------
// Public event bus — emits 'candle' events for live streaming
// ---------------------------------------------------------------------------
export const marketEvents = new EventEmitter()
marketEvents.setMaxListeners(100)

// ---------------------------------------------------------------------------
// Market definitions
// ---------------------------------------------------------------------------
export const SYMBOLS: Symbol[] = [
  // Stocks
  { symbol: 'AAPL',  name: 'Apple Inc.',       assetClass: 'stock',  baseAsset: 'AAPL',  quoteAsset: 'USD' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',        assetClass: 'stock',  baseAsset: 'TSLA',  quoteAsset: 'USD' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',      assetClass: 'stock',  baseAsset: 'NVDA',  quoteAsset: 'USD' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',   assetClass: 'stock',  baseAsset: 'MSFT',  quoteAsset: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',     assetClass: 'stock',  baseAsset: 'GOOGL', quoteAsset: 'USD' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',   assetClass: 'stock',  baseAsset: 'AMZN',  quoteAsset: 'USD' },
  { symbol: 'META',  name: 'Meta Platforms',    assetClass: 'stock',  baseAsset: 'META',  quoteAsset: 'USD' },
  // Crypto
  { symbol: 'BTC/USDT', name: 'Bitcoin',   assetClass: 'crypto', baseAsset: 'BTC', quoteAsset: 'USDT' },
  { symbol: 'ETH/USDT', name: 'Ethereum',  assetClass: 'crypto', baseAsset: 'ETH', quoteAsset: 'USDT' },
  { symbol: 'SOL/USDT', name: 'Solana',    assetClass: 'crypto', baseAsset: 'SOL', quoteAsset: 'USDT' },
  { symbol: 'BNB/USDT', name: 'BNB',       assetClass: 'crypto', baseAsset: 'BNB', quoteAsset: 'USDT' },
  { symbol: 'XRP/USDT', name: 'XRP',       assetClass: 'crypto', baseAsset: 'XRP', quoteAsset: 'USDT' },
  // Forex
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',           assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'USD' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar',  assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'USD' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen',   assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'JPY' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc',    assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CHF' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / USD',    assetClass: 'forex', baseAsset: 'AUD', quoteAsset: 'USD' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', assetClass: 'forex', baseAsset: 'USD', quoteAsset: 'CAD' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / USD',   assetClass: 'forex', baseAsset: 'NZD', quoteAsset: 'USD' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound',       assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'GBP' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen',        assetClass: 'forex', baseAsset: 'EUR', quoteAsset: 'JPY' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', assetClass: 'forex', baseAsset: 'GBP', quoteAsset: 'JPY' },
]

// ---------------------------------------------------------------------------
// Instrument parameters for GBM simulation
// ---------------------------------------------------------------------------
interface InstrumentParams {
  basePrice: number
  annualVol: number      // annualized volatility (e.g. 0.40 = 40%)
  annualDrift: number    // annualized drift
  priceDecimals: number  // decimal places for display
  tickSize: number       // minimum price increment
  avgSpread: number      // typical bid-ask spread as fraction of price
  baseVolume: number     // average daily volume units
}

const PARAMS: Record<string, InstrumentParams> = {
  // Stocks
  AAPL:  { basePrice: 187.50,  annualVol: 0.28, annualDrift: 0.12, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 8e7  },
  TSLA:  { basePrice: 204.30,  annualVol: 0.60, annualDrift: 0.15, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0002, baseVolume: 1.2e8 },
  NVDA:  { basePrice: 875.20,  annualVol: 0.55, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 4.5e7 },
  MSFT:  { basePrice: 415.80,  annualVol: 0.25, annualDrift: 0.10, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 2.5e7 },
  GOOGL: { basePrice: 162.40,  annualVol: 0.28, annualDrift: 0.11, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 2e7  },
  AMZN:  { basePrice: 178.50,  annualVol: 0.30, annualDrift: 0.12, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 3e7  },
  META:  { basePrice: 495.20,  annualVol: 0.42, annualDrift: 0.18, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0001, baseVolume: 1.5e7 },
  // Crypto — base prices reflect March 2026 market levels; seedInitialPrices() overrides
  // these with live Binance data on every Vercel request, so they only matter for cold-start
  'BTC/USDT': { basePrice: 74_000,  annualVol: 0.70, annualDrift: 0.25, priceDecimals: 1, tickSize: 0.10, avgSpread: 0.0002, baseVolume: 3e10 },
  'ETH/USDT': { basePrice: 1_900,   annualVol: 0.75, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 1.5e10 },
  'SOL/USDT': { basePrice: 130.00,  annualVol: 1.10, annualDrift: 0.30, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0005, baseVolume: 2e9  },
  'BNB/USDT': { basePrice: 590.00,  annualVol: 0.65, annualDrift: 0.20, priceDecimals: 2, tickSize: 0.01, avgSpread: 0.0003, baseVolume: 8e8  },
  'XRP/USDT': { basePrice: 2.30,    annualVol: 0.85, annualDrift: 0.15, priceDecimals: 4, tickSize: 0.0001, avgSpread: 0.0005, baseVolume: 5e9  },
  // Forex
  'EUR/USD': { basePrice: 1.0885, annualVol: 0.07, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00005, baseVolume: 5e11 },
  'GBP/USD': { basePrice: 1.2745, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 3e11 },
  'USD/JPY': { basePrice: 149.32, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.005,   baseVolume: 4e11 },
  'USD/CHF': { basePrice: 0.8945, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 2e11 },
  'AUD/USD': { basePrice: 0.6520, annualVol: 0.09, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00007, baseVolume: 2.5e11 },
  'USD/CAD': { basePrice: 1.3615, annualVol: 0.06, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00008, baseVolume: 2e11  },
  'NZD/USD': { basePrice: 0.6085, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00009, baseVolume: 1e11  },
  'EUR/GBP': { basePrice: 0.8540, annualVol: 0.05, annualDrift: 0.00, priceDecimals: 5, tickSize: 0.00001, avgSpread: 0.00006, baseVolume: 1.5e11 },
  'EUR/JPY': { basePrice: 162.45, annualVol: 0.08, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.007,   baseVolume: 2e11  },
  'GBP/JPY': { basePrice: 190.20, annualVol: 0.10, annualDrift: 0.00, priceDecimals: 3, tickSize: 0.001,   avgSpread: 0.009,   baseVolume: 1.5e11 },
}

// ---------------------------------------------------------------------------
// GBM state per symbol
// ---------------------------------------------------------------------------
interface GBMState {
  price: number
  open24h: number
  high24h: number
  low24h: number
  volume24h: number
  lastTick: number
}

const gbmState: Record<string, GBMState> = {}
for (const sym of SYMBOLS) {
  const p = PARAMS[sym.symbol]
  gbmState[sym.symbol] = {
    price: p.basePrice,
    open24h: p.basePrice,
    high24h: p.basePrice * 1.015,
    low24h:  p.basePrice * 0.985,
    volume24h: p.baseVolume * 0.04,
    lastTick: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Live candle state (1-minute candle currently being built)
// ---------------------------------------------------------------------------
interface LiveCandle { open: number; high: number; low: number; close: number; volume: number; time: number }
const liveCandles: Record<string, LiveCandle> = {}
for (const sym of SYMBOLS) {
  const p = PARAMS[sym.symbol]
  const minuteTs = Math.floor(Date.now() / 60000) * 60
  liveCandles[sym.symbol] = { time: minuteTs, open: p.basePrice, high: p.basePrice, low: p.basePrice, close: p.basePrice, volume: 0 }
}

// ---------------------------------------------------------------------------
// Recent trades ring buffer (per symbol, max 100)
// ---------------------------------------------------------------------------
const recentTradesBuffer: Record<string, Trade[]> = {}
for (const sym of SYMBOLS) recentTradesBuffer[sym.symbol] = []

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

// ---------------------------------------------------------------------------
// GBM tick — called every 500ms per symbol
// ---------------------------------------------------------------------------
export function tickSymbol(symbol: string): { trade: Trade; candleUpdate: LiveCandle; isNewCandle: boolean } {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p) throw new Error(`Unknown symbol: ${symbol}`)

  const now = Date.now()
  const dtSec = Math.max((now - state.lastTick) / 1000, 0.001)
  state.lastTick = now

  // Geometric Brownian Motion: dS = S*(mu*dt + sigma*sqrt(dt)*Z)
  const annualSec = 252 * 6.5 * 3600
  const mu = p.annualDrift / annualSec
  const sigma = p.annualVol / Math.sqrt(annualSec)
  const z = randn()
  const ret = mu * dtSec + sigma * Math.sqrt(dtSec) * z
  const newPrice = round(state.price * Math.exp(ret), p.priceDecimals)

  state.price = newPrice
  state.high24h = Math.max(state.high24h, newPrice)
  state.low24h  = Math.min(state.low24h,  newPrice)

  // Volume tick
  const tickVol = round(randBetween(p.baseVolume * 0.000002, p.baseVolume * 0.00001), 4)
  state.volume24h += tickVol

  // Add a micro-trade to buffer
  const side = ret >= 0 ? 'buy' : 'sell'
  const trade: Trade = {
    id: uuidv4(),
    symbol,
    price: newPrice,
    size: round(tickVol, 4),
    side,
    timestamp: now,
  }
  recentTradesBuffer[symbol].unshift(trade)
  if (recentTradesBuffer[symbol].length > 100) recentTradesBuffer[symbol].pop()

  // Live candle management
  const minuteTs = Math.floor(now / 60000) * 60
  let isNewCandle = false
  let lc = liveCandles[symbol]

  if (minuteTs > lc.time) {
    // Emit the completed candle before rolling
    marketEvents.emit('candle', symbol, { ...lc })
    isNewCandle = true
    lc = { time: minuteTs, open: newPrice, high: newPrice, low: newPrice, close: newPrice, volume: tickVol }
    liveCandles[symbol] = lc
  } else {
    lc.close  = newPrice
    lc.high   = Math.max(lc.high, newPrice)
    lc.low    = Math.min(lc.low,  newPrice)
    lc.volume = round(lc.volume + tickVol, 4)
  }

  return { trade, candleUpdate: { ...lc }, isNewCandle }
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------
export function getLivePrice(symbol: string): number {
  return gbmState[symbol]?.price ?? PARAMS[symbol]?.basePrice ?? 100
}

export function getAssetClass(symbol: string): 'stock' | 'crypto' | 'forex' {
  const sym = SYMBOLS.find(s => s.symbol === symbol)
  return sym?.assetClass ?? 'stock'
}

export function getSymbolInfo(symbol: string) {
  return SYMBOLS.find(s => s.symbol === symbol) ?? null
}

/** Returns current market session for a stock (ET) – always 'regular' for crypto/forex */
export function getMarketSession(symbol: string): 'pre' | 'regular' | 'post' | 'closed' {
  const ac = getAssetClass(symbol)
  if (ac !== 'stock') return 'regular'
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const h = et.getHours(), m = et.getMinutes()
  const mins = h * 60 + m
  const day = et.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return 'closed'
  if (mins >= 4 * 60 && mins < 9 * 60 + 30)  return 'pre'
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'regular'
  if (mins >= 16 * 60 && mins < 20 * 60)     return 'post'
  return 'closed'
}

export function getSpread(symbol: string): { bid: number; ask: number } {
  const p = PARAMS[symbol]
  const mid = getLivePrice(symbol)
  const half = round(mid * (p?.avgSpread ?? 0.0001) / 2, p?.priceDecimals ?? 4)
  return { bid: round(mid - half, p?.priceDecimals ?? 4), ask: round(mid + half, p?.priceDecimals ?? 4) }
}

export function getLiveCandle(symbol: string): LiveCandle {
  return { ...liveCandles[symbol] }
}

// ---------------------------------------------------------------------------
// Historical OHLCV with GBM seeding from current price
// ---------------------------------------------------------------------------
export function generateCandles(symbol: string, interval: string, limit = 300): Candle[] {
  const intervalMs: Record<string, number> = {
    '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000,
    '30m': 1_800_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
  }
  const ms = intervalMs[interval] ?? 3_600_000
  const p = PARAMS[symbol]
  if (!p) return []

  const now = Math.floor(Date.now() / ms) * ms
  // Anchor GBM simulation to the current real price (avoids stale basePrice)
  let price = getLivePrice(symbol)

  // Volatility scaled to candle interval
  const annualBars = (252 * 6.5 * 3600 * 1000) / ms
  const barVol = p.annualVol / Math.sqrt(annualBars)
  const barDrift = p.annualDrift / annualBars

  const candles: Candle[] = []
  for (let i = 0; i < limit; i++) {
    const time = Math.floor((now - (limit - i) * ms) / 1000)
    const open = price
    // Generate 5 intra-bar ticks for realistic OHLC
    let high = open, low = open, close = open
    for (let t = 0; t < 5; t++) {
      const tickRet = barDrift / 5 + (barVol / Math.sqrt(5)) * randn()
      close = round(close * Math.exp(tickRet), p.priceDecimals)
      high  = Math.max(high, close)
      low   = Math.min(low,  close)
    }
    const volume = round(randBetween(p.baseVolume * 0.001, p.baseVolume * 0.005) * (ms / 86_400_000), 2)
    candles.push({ time, open, high, low, close, volume })
    price = close
  }

  // Stitch the live candle prices into the last bar, but keep the formula-computed time.
  // liveCandles[symbol].time is set at module-init and never updated on Vercel serverless
  // (no tickSymbol interval runs), so using lc.time would embed a stale cold-start timestamp.
  const lc = liveCandles[symbol]
  if (lc) {
    const last = candles[candles.length - 1]
    candles[candles.length - 1] = {
      time:   last.time,              // keep the formula-derived current timestamp
      open:   last.open,
      high:   Math.max(last.high, lc.high),
      low:    Math.min(last.low, lc.low),
      close:  lc.close,              // real live price as close
      volume: lc.volume || last.volume,
    }
  }

  return candles
}

// ---------------------------------------------------------------------------
// Persistent ticker (uses tracked 24h stats)
// ---------------------------------------------------------------------------
export function generateTicker(symbol: string): Ticker {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p) return { symbol, price: 0, change: 0, changePercent: 0, high24h: 0, low24h: 0, volume24h: 0, timestamp: Date.now() }
  const price = state.price
  const change = round(price - state.open24h, p.priceDecimals)
  const changePercent = round((change / state.open24h) * 100, 2)
  return { symbol, price, change, changePercent, high24h: state.high24h, low24h: state.low24h, volume24h: round(state.volume24h, 2), timestamp: Date.now() }
}

export function getAllTickers(): Ticker[] {
  return SYMBOLS.map(s => generateTicker(s.symbol))
}

// ---------------------------------------------------------------------------
// Professional order book with realistic spread + depth clustering
// ---------------------------------------------------------------------------
export function generateOrderBook(symbol: string, depth = 20): OrderBook {
  const { bid, ask } = getSpread(symbol)
  const p = PARAMS[symbol]

  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []
  let bidTotal = 0
  let askTotal = 0

  // Larger orders cluster near the spread, smaller further away
  for (let i = 1; i <= depth; i++) {
    const distanceFactor = Math.pow(i, 1.3)
    const bidPrice = round(bid - (i - 1) * p.tickSize * distanceFactor * randBetween(1, 2.5), p.priceDecimals)
    const askPrice = round(ask + (i - 1) * p.tickSize * distanceFactor * randBetween(1, 2.5), p.priceDecimals)

    // Volume is bigger near the spread (iceberg model)
    const baseSize = p.baseVolume * 0.000005
    const bidSize = round(baseSize * randBetween(0.3, 3) / i, 4)
    const askSize = round(baseSize * randBetween(0.3, 3) / i, 4)

    bidTotal += bidSize
    askTotal += askSize
    bids.push({ price: bidPrice, size: bidSize, total: round(bidTotal, 4) })
    asks.push({ price: askPrice, size: askSize, total: round(askTotal, 4) })
  }

  return {
    symbol, bids, asks, timestamp: Date.now(),
    spread:   asks.length && bids.length ? round(asks[0].price - bids[0].price, 8) : 0,
    midPrice: asks.length && bids.length ? round((asks[0].price + bids[0].price) / 2, 8) : 0,
  }
}

// ---------------------------------------------------------------------------
// Recent trades from ring buffer
// ---------------------------------------------------------------------------
export function getRecentTradesFromBuffer(symbol: string, count = 50): Trade[] {
  return recentTradesBuffer[symbol]?.slice(0, count) ?? []
}

export function generateRecentTrades(symbol: string, count = 50): Trade[] {
  return getRecentTradesFromBuffer(symbol, count)
}

// ---------------------------------------------------------------------------
// Boot: seed recent trades buffer with synthetic history
// ---------------------------------------------------------------------------
export function seedTradeHistory(): void {
  for (const sym of SYMBOLS) {
    const p = PARAMS[sym.symbol]
    let price = p.basePrice
    let t = Date.now() - 5 * 60 * 1000  // 5 minutes of history
    const buf: Trade[] = []
    while (t < Date.now()) {
      const interval = Math.floor(randBetween(300, 3000))
      t += interval
      const ret = (p.annualVol / Math.sqrt(252 * 6.5 * 3600)) * Math.sqrt(interval / 1000) * randn()
      price = round(price * Math.exp(ret), p.priceDecimals)
      buf.push({
        id: uuidv4(), symbol: sym.symbol, price,
        size: round(randBetween(p.baseVolume * 0.000002, p.baseVolume * 0.00002), 4),
        side: ret >= 0 ? 'buy' : 'sell', timestamp: t,
      })
    }
    recentTradesBuffer[sym.symbol] = buf.reverse().slice(0, 100)
  }
}

// Seed on import
seedTradeHistory()

// ---------------------------------------------------------------------------
// Real-price injection — called by realDataService on every live tick
// ---------------------------------------------------------------------------
export function injectRealPrice(symbol: string, price: number): void {
  const state = gbmState[symbol]
  const p = PARAMS[symbol]
  if (!state || !p || price <= 0) return
  const rounded = round(price, p.priceDecimals)
  state.price   = rounded
  state.high24h = Math.max(state.high24h, rounded)
  state.low24h  = Math.min(state.low24h,  rounded)
  // lastTick intentionally NOT updated — GBM still runs for smooth intra-tick movement

  // ── Also update the live 1-minute candle with the real price ──────────────
  // This ensures the current bar's close always reflects the real market price
  // even if the GBM ticker hasn't fired yet since the last real tick.
  const lc = liveCandles[symbol]
  if (lc) {
    lc.close = rounded
    lc.high  = Math.max(lc.high, rounded)
    lc.low   = Math.min(lc.low,  rounded)
  }
}

// Auto-connect to live market feeds (Binance WS + Twelve Data WS)
// Skipped on Vercel (serverless) — prices are seeded via REST in api/[...path].ts instead
if (!process.env.VERCEL) {
  startRealDataFeeds(injectRealPrice)
}
