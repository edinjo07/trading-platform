import { Candle, OrderBook, OrderBookEntry, Trade } from '../types'

// Base prices for common symbols
const BASE_PRICES: Record<string, number> = {
  'BTC/USDT': 84000, 'ETH/USDT': 2200, 'SOL/USDT': 140, 'BNB/USDT': 580,
  'XRP/USDT': 0.52, 'AAPL': 195, 'TSLA': 245, 'NVDA': 880, 'MSFT': 415,
  'GOOGL': 175, 'AMZN': 195, 'META': 510, 'EUR/USD': 1.085, 'GBP/USD': 1.27,
  'USD/JPY': 149.5, 'USD/CHF': 0.895, 'AUD/USD': 0.645, 'USD/CAD': 1.36,
  'NZD/USD': 0.595, 'EUR/GBP': 0.855, 'EUR/JPY': 162, 'GBP/JPY': 190,
}

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '4h': 14400, '1d': 86400,
}

function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function generateMockCandles(symbol: string, interval: string, count = 300): Candle[] {
  const base = BASE_PRICES[symbol] ?? 100
  const step = INTERVAL_SECONDS[interval] ?? 3600
  const now = Math.floor(Date.now() / step) * step
  const startTime = now - step * (count - 1)

  // Volatility per candle proportional to interval
  const annualVol = symbol.includes('USD') && !symbol.includes('BTC') && !symbol.includes('ETH') ? 0.08 : 0.6
  const candleVol = annualVol * Math.sqrt(step / (365.25 * 86400))

  const candles: Candle[] = []
  let price = base

  for (let i = 0; i < count; i++) {
    const t = startTime + i * step
    const ret = randn() * candleVol
    const open = price
    const close = open * Math.exp(ret)
    const high = Math.max(open, close) * (1 + Math.abs(randn()) * candleVol * 0.5)
    const low = Math.min(open, close) * (1 - Math.abs(randn()) * candleVol * 0.5)
    const volume = base * (50 + Math.abs(randn()) * 30)

    candles.push({
      time: t,
      open: +open.toFixed(base > 100 ? 2 : 5),
      high: +high.toFixed(base > 100 ? 2 : 5),
      low: +low.toFixed(base > 100 ? 2 : 5),
      close: +close.toFixed(base > 100 ? 2 : 5),
      volume: +volume.toFixed(2),
    })
    price = close
  }
  return candles
}

/** Generate a realistic-looking order book for any symbol. */
export function generateMockOrderBook(symbol: string, levels = 15): OrderBook {
  const base = BASE_PRICES[symbol] ?? 100
  const tickSize = base > 1000 ? 1 : base > 10 ? 0.01 : base > 1 ? 0.001 : 0.0001
  const spread = tickSize * 2

  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []

  let midPrice = base * (1 + (Math.random() - 0.5) * 0.001)
  let bidTotal = 0
  let askTotal = 0

  for (let i = 0; i < levels; i++) {
    const bidPrice = +(midPrice - spread / 2 - i * tickSize * (1 + Math.random())).toFixed(
      base > 100 ? 2 : 5
    )
    const bidSize = +(0.1 + Math.random() * (base > 1000 ? 0.5 : 50)).toFixed(4)
    bidTotal += bidSize
    bids.push({ price: bidPrice, size: bidSize, total: +bidTotal.toFixed(4) })

    const askPrice = +(midPrice + spread / 2 + i * tickSize * (1 + Math.random())).toFixed(
      base > 100 ? 2 : 5
    )
    const askSize = +(0.1 + Math.random() * (base > 1000 ? 0.5 : 50)).toFixed(4)
    askTotal += askSize
    asks.push({ price: askPrice, size: askSize, total: +askTotal.toFixed(4) })
  }

  return {
    symbol,
    bids,
    asks,
    timestamp: Date.now(),
    spread: +(asks[0].price - bids[0].price).toFixed(base > 100 ? 2 : 5),
    midPrice: +midPrice.toFixed(base > 100 ? 2 : 5),
  }
}

/** Generate a list of recent trades for any symbol. */
export function generateMockTrades(symbol: string, count = 30): Trade[] {
  const base = BASE_PRICES[symbol] ?? 100
  const trades: Trade[] = []
  let price = base * (1 + (Math.random() - 0.5) * 0.002)
  const now = Date.now()

  for (let i = count - 1; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.5) * 0.0005)
    trades.push({
      id: `mock-${now}-${i}`,
      symbol,
      price: +price.toFixed(base > 100 ? 2 : 5),
      size: +(0.01 + Math.random() * (base > 1000 ? 0.2 : 20)).toFixed(4),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      timestamp: now - i * 3000,
    })
  }
  return trades
}
