import { Candle, OrderBook, OrderBookEntry, Trade, MarketSymbol, Ticker } from '../types'

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

/** Generate mock trades for any symbol. */
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

// ---------------------------------------------------------------------------
// Static symbol catalogue (used as fallback when API /markets/symbols fails)
// ---------------------------------------------------------------------------
const SYMBOL_META: {
  symbol: string; name: string; assetClass: 'crypto' | 'stock' | 'forex'
  base: string; quote: string
}[] = [
  { symbol: 'BTC/USDT',  name: 'Bitcoin',        assetClass: 'crypto', base: 'BTC',  quote: 'USDT' },
  { symbol: 'ETH/USDT',  name: 'Ethereum',        assetClass: 'crypto', base: 'ETH',  quote: 'USDT' },
  { symbol: 'SOL/USDT',  name: 'Solana',          assetClass: 'crypto', base: 'SOL',  quote: 'USDT' },
  { symbol: 'BNB/USDT',  name: 'BNB',             assetClass: 'crypto', base: 'BNB',  quote: 'USDT' },
  { symbol: 'XRP/USDT',  name: 'XRP',             assetClass: 'crypto', base: 'XRP',  quote: 'USDT' },
  { symbol: 'AAPL',      name: 'Apple Inc.',       assetClass: 'stock',  base: 'AAPL', quote: 'USD'  },
  { symbol: 'TSLA',      name: 'Tesla Inc.',       assetClass: 'stock',  base: 'TSLA', quote: 'USD'  },
  { symbol: 'NVDA',      name: 'NVIDIA Corp.',     assetClass: 'stock',  base: 'NVDA', quote: 'USD'  },
  { symbol: 'MSFT',      name: 'Microsoft Corp.',  assetClass: 'stock',  base: 'MSFT', quote: 'USD'  },
  { symbol: 'GOOGL',     name: 'Alphabet Inc.',    assetClass: 'stock',  base: 'GOOGL',quote: 'USD'  },
  { symbol: 'AMZN',      name: 'Amazon.com Inc.',  assetClass: 'stock',  base: 'AMZN', quote: 'USD'  },
  { symbol: 'META',      name: 'Meta Platforms',   assetClass: 'stock',  base: 'META', quote: 'USD'  },
  { symbol: 'EUR/USD',   name: 'Euro / US Dollar', assetClass: 'forex',  base: 'EUR',  quote: 'USD'  },
  { symbol: 'GBP/USD',   name: 'British Pound',    assetClass: 'forex',  base: 'GBP',  quote: 'USD'  },
  { symbol: 'USD/JPY',   name: 'US Dollar / Yen',  assetClass: 'forex',  base: 'USD',  quote: 'JPY'  },
  { symbol: 'USD/CHF',   name: 'US Dollar / CHF',  assetClass: 'forex',  base: 'USD',  quote: 'CHF'  },
  { symbol: 'AUD/USD',   name: 'Australian Dollar',assetClass: 'forex',  base: 'AUD',  quote: 'USD'  },
  { symbol: 'USD/CAD',   name: 'US Dollar / CAD',  assetClass: 'forex',  base: 'USD',  quote: 'CAD'  },
  { symbol: 'NZD/USD',   name: 'New Zealand Dollar',assetClass: 'forex', base: 'NZD',  quote: 'USD'  },
  { symbol: 'EUR/GBP',   name: 'Euro / GBP',       assetClass: 'forex',  base: 'EUR',  quote: 'GBP'  },
  { symbol: 'EUR/JPY',   name: 'Euro / Yen',       assetClass: 'forex',  base: 'EUR',  quote: 'JPY'  },
  { symbol: 'GBP/JPY',   name: 'British Pound / Yen',assetClass: 'forex',base: 'GBP',  quote: 'JPY'  },
]

/** Full list of symbols used as fallback when the API is unreachable. */
export function generateMockSymbols(): MarketSymbol[] {
  return SYMBOL_META.map(m => ({
    symbol: m.symbol,
    name: m.name,
    assetClass: m.assetClass,
    baseAsset: m.base,
    quoteAsset: m.quote,
  }))
}

/** Generate mock tickers for all symbols (used when /markets/tickers returns nothing). */
export function generateMockTickers(): Ticker[] {
  return SYMBOL_META.map(m => {
    const base = BASE_PRICES[m.symbol] ?? 100
    const noise = 1 + (Math.random() - 0.5) * 0.004
    const price = +(base * noise).toFixed(base > 100 ? 2 : 5)
    const changePct = +(((Math.random() - 0.48) * 4)).toFixed(2)
    const change = +(price * changePct / 100).toFixed(base > 100 ? 2 : 5)
    const high24h = +(price * (1 + Math.random() * 0.015)).toFixed(base > 100 ? 2 : 5)
    const low24h  = +(price * (1 - Math.random() * 0.015)).toFixed(base > 100 ? 2 : 5)
    const volume24h = +(base * (500 + Math.random() * 1000)).toFixed(2)
    return {
      symbol: m.symbol,
      price,
      change,
      changePercent: changePct,
      high24h,
      low24h,
      volume24h,
      timestamp: Date.now(),
      bid: +(price * 0.9998).toFixed(base > 100 ? 2 : 5),
      ask: +(price * 1.0002).toFixed(base > 100 ? 2 : 5),
    }
  })
}
