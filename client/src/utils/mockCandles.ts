import { Candle, OrderBook, OrderBookEntry, Trade, MarketSymbol, Ticker } from '../types'

// Base prices for common symbols
const BASE_PRICES: Record<string, number> = {
  // Crypto
  'BTC/USDT': 74000, 'ETH/USDT': 1900, 'SOL/USDT': 130, 'BNB/USDT': 590,
  'XRP/USDT': 2.30, 'DOGE/USDT': 0.125, 'AVAX/USDT': 25.5, 'ADA/USDT': 0.45,
  'LINK/USDT': 14.2, 'DOT/USDT': 7.1, 'LTC/USDT': 82, 'MATIC/USDT': 0.72,
  // Stocks
  'AAPL': 187.5, 'TSLA': 204.3, 'NVDA': 875.2, 'MSFT': 415.8, 'GOOGL': 162.4,
  'AMZN': 178.5, 'META': 495.2, 'JPM': 198.5, 'NFLX': 625, 'COIN': 198,
  'AMD': 162, 'DIS': 98.5,
  // Defense & Aerospace
  'LMT': 485, 'RTX': 128.5, 'NOC': 488, 'GD': 295, 'BA': 168,
  'HII': 272, 'LDOS': 168, 'CACI': 455,
  // Energy
  'XOM': 112, 'CVX': 152, 'COP': 112,
  // Forex majors
  'EUR/USD': 1.0885, 'GBP/USD': 1.2745, 'USD/JPY': 149.32, 'USD/CHF': 0.8945,
  'AUD/USD': 0.652, 'USD/CAD': 1.3615, 'NZD/USD': 0.6085, 'EUR/GBP': 0.854,
  'EUR/JPY': 162.45, 'GBP/JPY': 190.2,
  // Forex ME & geopolitical
  'USD/ILS': 3.74, 'USD/SAR': 3.751, 'USD/AED': 3.673, 'USD/TRY': 36.2,
  // Forex Asia
  'USD/CNY': 7.24, 'USD/INR': 83.6, 'USD/HKD': 7.826, 'USD/SGD': 1.344,
  'AUD/JPY': 97.2, 'CAD/JPY': 109.5,
  // Forex Americas & EM
  'USD/MXN': 17.4, 'USD/BRL': 5.32, 'USD/ZAR': 18.6, 'USD/NOK': 10.72, 'USD/SEK': 10.45,
  // Forex Euro crosses
  'EUR/CHF': 0.965, 'EUR/AUD': 1.684, 'EUR/CAD': 1.504,
  // Commodities
  'XAU/USD': 2400, 'XAG/USD': 28.5, 'CRUDE/USD': 78, 'NGAS/USD': 2.2,
  'WHEAT/USD': 540, 'CORN/USD': 435, 'BRENT/USD': 82.5, 'HO/USD': 2.65,
  'XPT/USD': 1000, 'XPD/USD': 1060, 'COPPER/USD': 4.25,
  'COFFEE/USD': 245, 'SUGAR/USD': 21.5, 'COCOA/USD': 9800, 'COTTON/USD': 75.5,
  'SOYBEAN/USD': 1055, 'LUMBER/USD': 540,
  // Indices
  'SPX500': 5200, 'NAS100': 18000, 'DAX40': 18500, 'FTSE100': 7900,
  'DJI30': 38500, 'NIKKEI': 38000,
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
  // Date.now() is in milliseconds; convert to seconds first, then align to interval boundary
  const nowSec = Math.floor(Date.now() / 1000)
  const now = Math.floor(nowSec / step) * step    // unix seconds aligned to interval
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
  symbol: string; name: string; assetClass: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index'
  base: string; quote: string
}[] = [
  // Crypto
  { symbol: 'BTC/USDT',    name: 'Bitcoin',                    assetClass: 'crypto',    base: 'BTC',     quote: 'USDT' },
  { symbol: 'ETH/USDT',    name: 'Ethereum',                   assetClass: 'crypto',    base: 'ETH',     quote: 'USDT' },
  { symbol: 'SOL/USDT',    name: 'Solana',                     assetClass: 'crypto',    base: 'SOL',     quote: 'USDT' },
  { symbol: 'BNB/USDT',    name: 'BNB',                        assetClass: 'crypto',    base: 'BNB',     quote: 'USDT' },
  { symbol: 'XRP/USDT',    name: 'XRP',                        assetClass: 'crypto',    base: 'XRP',     quote: 'USDT' },
  { symbol: 'DOGE/USDT',   name: 'Dogecoin',                   assetClass: 'crypto',    base: 'DOGE',    quote: 'USDT' },
  { symbol: 'AVAX/USDT',   name: 'Avalanche',                  assetClass: 'crypto',    base: 'AVAX',    quote: 'USDT' },
  { symbol: 'ADA/USDT',    name: 'Cardano',                    assetClass: 'crypto',    base: 'ADA',     quote: 'USDT' },
  { symbol: 'LINK/USDT',   name: 'Chainlink',                  assetClass: 'crypto',    base: 'LINK',    quote: 'USDT' },
  { symbol: 'DOT/USDT',    name: 'Polkadot',                   assetClass: 'crypto',    base: 'DOT',     quote: 'USDT' },
  { symbol: 'LTC/USDT',    name: 'Litecoin',                   assetClass: 'crypto',    base: 'LTC',     quote: 'USDT' },
  { symbol: 'MATIC/USDT',  name: 'Polygon',                    assetClass: 'crypto',    base: 'MATIC',   quote: 'USDT' },
  // Stocks
  { symbol: 'AAPL',        name: 'Apple Inc.',                 assetClass: 'stock',     base: 'AAPL',    quote: 'USD'  },
  { symbol: 'TSLA',        name: 'Tesla Inc.',                 assetClass: 'stock',     base: 'TSLA',    quote: 'USD'  },
  { symbol: 'NVDA',        name: 'NVIDIA Corp.',               assetClass: 'stock',     base: 'NVDA',    quote: 'USD'  },
  { symbol: 'MSFT',        name: 'Microsoft Corp.',            assetClass: 'stock',     base: 'MSFT',    quote: 'USD'  },
  { symbol: 'GOOGL',       name: 'Alphabet Inc.',              assetClass: 'stock',     base: 'GOOGL',   quote: 'USD'  },
  { symbol: 'AMZN',        name: 'Amazon.com Inc.',            assetClass: 'stock',     base: 'AMZN',    quote: 'USD'  },
  { symbol: 'META',        name: 'Meta Platforms',             assetClass: 'stock',     base: 'META',    quote: 'USD'  },
  { symbol: 'JPM',         name: 'JPMorgan Chase',             assetClass: 'stock',     base: 'JPM',     quote: 'USD'  },
  { symbol: 'NFLX',        name: 'Netflix Inc.',               assetClass: 'stock',     base: 'NFLX',    quote: 'USD'  },
  { symbol: 'COIN',        name: 'Coinbase Global',            assetClass: 'stock',     base: 'COIN',    quote: 'USD'  },
  { symbol: 'AMD',         name: 'Advanced Micro Devices',     assetClass: 'stock',     base: 'AMD',     quote: 'USD'  },
  { symbol: 'DIS',         name: 'Walt Disney Co.',            assetClass: 'stock',     base: 'DIS',     quote: 'USD'  },
  // Defense & Aerospace
  { symbol: 'LMT',         name: 'Lockheed Martin Corp.',      assetClass: 'stock',     base: 'LMT',     quote: 'USD'  },
  { symbol: 'RTX',         name: 'RTX Corp. (Raytheon)',       assetClass: 'stock',     base: 'RTX',     quote: 'USD'  },
  { symbol: 'NOC',         name: 'Northrop Grumman Corp.',     assetClass: 'stock',     base: 'NOC',     quote: 'USD'  },
  { symbol: 'GD',          name: 'General Dynamics Corp.',     assetClass: 'stock',     base: 'GD',      quote: 'USD'  },
  { symbol: 'BA',          name: 'Boeing Co.',                 assetClass: 'stock',     base: 'BA',      quote: 'USD'  },
  { symbol: 'HII',         name: 'Huntington Ingalls Ind.',    assetClass: 'stock',     base: 'HII',     quote: 'USD'  },
  { symbol: 'LDOS',        name: 'Leidos Holdings Inc.',       assetClass: 'stock',     base: 'LDOS',    quote: 'USD'  },
  { symbol: 'CACI',        name: 'CACI International Inc.',    assetClass: 'stock',     base: 'CACI',    quote: 'USD'  },
  // Energy
  { symbol: 'XOM',         name: 'ExxonMobil Corp.',           assetClass: 'stock',     base: 'XOM',     quote: 'USD'  },
  { symbol: 'CVX',         name: 'Chevron Corp.',              assetClass: 'stock',     base: 'CVX',     quote: 'USD'  },
  { symbol: 'COP',         name: 'ConocoPhillips',             assetClass: 'stock',     base: 'COP',     quote: 'USD'  },
  // Forex majors
  { symbol: 'EUR/USD',     name: 'Euro / US Dollar',           assetClass: 'forex',     base: 'EUR',     quote: 'USD'  },
  { symbol: 'GBP/USD',     name: 'British Pound / US Dollar',  assetClass: 'forex',     base: 'GBP',     quote: 'USD'  },
  { symbol: 'USD/JPY',     name: 'US Dollar / Japanese Yen',   assetClass: 'forex',     base: 'USD',     quote: 'JPY'  },
  { symbol: 'USD/CHF',     name: 'US Dollar / Swiss Franc',    assetClass: 'forex',     base: 'USD',     quote: 'CHF'  },
  { symbol: 'AUD/USD',     name: 'Australian Dollar / USD',    assetClass: 'forex',     base: 'AUD',     quote: 'USD'  },
  { symbol: 'USD/CAD',     name: 'US Dollar / Canadian Dollar',assetClass: 'forex',     base: 'USD',     quote: 'CAD'  },
  { symbol: 'NZD/USD',     name: 'New Zealand Dollar / USD',   assetClass: 'forex',     base: 'NZD',     quote: 'USD'  },
  { symbol: 'EUR/GBP',     name: 'Euro / British Pound',       assetClass: 'forex',     base: 'EUR',     quote: 'GBP'  },
  { symbol: 'EUR/JPY',     name: 'Euro / Japanese Yen',        assetClass: 'forex',     base: 'EUR',     quote: 'JPY'  },
  { symbol: 'GBP/JPY',     name: 'British Pound / Jap. Yen',   assetClass: 'forex',     base: 'GBP',     quote: 'JPY'  },
  // Forex Middle East & Geopolitical
  { symbol: 'USD/ILS',     name: 'US Dollar / Israeli Shekel', assetClass: 'forex',     base: 'USD',     quote: 'ILS'  },
  { symbol: 'USD/SAR',     name: 'US Dollar / Saudi Riyal',    assetClass: 'forex',     base: 'USD',     quote: 'SAR'  },
  { symbol: 'USD/AED',     name: 'US Dollar / UAE Dirham',     assetClass: 'forex',     base: 'USD',     quote: 'AED'  },
  { symbol: 'USD/TRY',     name: 'US Dollar / Turkish Lira',   assetClass: 'forex',     base: 'USD',     quote: 'TRY'  },
  // Forex Asian
  { symbol: 'USD/CNY',     name: 'US Dollar / Chinese Yuan',   assetClass: 'forex',     base: 'USD',     quote: 'CNY'  },
  { symbol: 'USD/INR',     name: 'US Dollar / Indian Rupee',   assetClass: 'forex',     base: 'USD',     quote: 'INR'  },
  { symbol: 'USD/HKD',     name: 'US Dollar / Hong Kong Dollar',assetClass: 'forex',    base: 'USD',     quote: 'HKD'  },
  { symbol: 'USD/SGD',     name: 'US Dollar / Singapore Dollar',assetClass: 'forex',    base: 'USD',     quote: 'SGD'  },
  { symbol: 'AUD/JPY',     name: 'Australian Dollar / Jap. Yen',assetClass: 'forex',   base: 'AUD',     quote: 'JPY'  },
  { symbol: 'CAD/JPY',     name: 'Canadian Dollar / Jap. Yen', assetClass: 'forex',    base: 'CAD',     quote: 'JPY'  },
  // Forex Americas & EM
  { symbol: 'USD/MXN',     name: 'US Dollar / Mexican Peso',   assetClass: 'forex',     base: 'USD',     quote: 'MXN'  },
  { symbol: 'USD/BRL',     name: 'US Dollar / Brazilian Real',  assetClass: 'forex',    base: 'USD',     quote: 'BRL'  },
  { symbol: 'USD/ZAR',     name: 'US Dollar / South African Rand',assetClass: 'forex',  base: 'USD',     quote: 'ZAR'  },
  { symbol: 'USD/NOK',     name: 'US Dollar / Norwegian Krone', assetClass: 'forex',    base: 'USD',     quote: 'NOK'  },
  { symbol: 'USD/SEK',     name: 'US Dollar / Swedish Krona',   assetClass: 'forex',    base: 'USD',     quote: 'SEK'  },
  // Forex Euro crosses
  { symbol: 'EUR/CHF',     name: 'Euro / Swiss Franc',          assetClass: 'forex',    base: 'EUR',     quote: 'CHF'  },
  { symbol: 'EUR/AUD',     name: 'Euro / Australian Dollar',    assetClass: 'forex',     base: 'EUR',     quote: 'AUD'  },
  { symbol: 'EUR/CAD',     name: 'Euro / Canadian Dollar',      assetClass: 'forex',     base: 'EUR',     quote: 'CAD'  },
  // Commodities
  { symbol: 'XAU/USD',     name: 'Gold',                        assetClass: 'commodity', base: 'XAU',     quote: 'USD'  },
  { symbol: 'XAG/USD',     name: 'Silver',                      assetClass: 'commodity', base: 'XAG',     quote: 'USD'  },
  { symbol: 'CRUDE/USD',   name: 'Crude Oil WTI',               assetClass: 'commodity', base: 'CRUDE',   quote: 'USD'  },
  { symbol: 'BRENT/USD',   name: 'Brent Crude Oil',             assetClass: 'commodity', base: 'BRENT',   quote: 'USD'  },
  { symbol: 'NGAS/USD',    name: 'Natural Gas',                 assetClass: 'commodity', base: 'NGAS',    quote: 'USD'  },
  { symbol: 'HO/USD',      name: 'Heating Oil',                 assetClass: 'commodity', base: 'HO',      quote: 'USD'  },
  { symbol: 'XPT/USD',     name: 'Platinum',                    assetClass: 'commodity', base: 'XPT',     quote: 'USD'  },
  { symbol: 'XPD/USD',     name: 'Palladium',                   assetClass: 'commodity', base: 'XPD',     quote: 'USD'  },
  { symbol: 'COPPER/USD',  name: 'Copper',                      assetClass: 'commodity', base: 'COPPER',  quote: 'USD'  },
  { symbol: 'WHEAT/USD',   name: 'Wheat',                       assetClass: 'commodity', base: 'WHEAT',   quote: 'USD'  },
  { symbol: 'CORN/USD',    name: 'Corn',                        assetClass: 'commodity', base: 'CORN',    quote: 'USD'  },
  { symbol: 'COFFEE/USD',  name: 'Coffee',                      assetClass: 'commodity', base: 'COFFEE',  quote: 'USD'  },
  { symbol: 'SUGAR/USD',   name: 'Sugar #11',                   assetClass: 'commodity', base: 'SUGAR',   quote: 'USD'  },
  { symbol: 'COCOA/USD',   name: 'Cocoa',                       assetClass: 'commodity', base: 'COCOA',   quote: 'USD'  },
  { symbol: 'COTTON/USD',  name: 'Cotton #2',                   assetClass: 'commodity', base: 'COTTON',  quote: 'USD'  },
  { symbol: 'SOYBEAN/USD', name: 'Soybeans',                    assetClass: 'commodity', base: 'SOYBEAN', quote: 'USD'  },
  { symbol: 'LUMBER/USD',  name: 'Lumber',                      assetClass: 'commodity', base: 'LUMBER',  quote: 'USD'  },
  // Indices
  { symbol: 'SPX500',      name: 'S&P 500',                     assetClass: 'index',     base: 'SPX500',  quote: 'USD'  },
  { symbol: 'NAS100',      name: 'NASDAQ 100',                  assetClass: 'index',     base: 'NAS100',  quote: 'USD'  },
  { symbol: 'DAX40',       name: 'DAX 40',                      assetClass: 'index',     base: 'DAX40',   quote: 'EUR'  },
  { symbol: 'FTSE100',     name: 'FTSE 100',                    assetClass: 'index',     base: 'FTSE100', quote: 'GBP'  },
  { symbol: 'DJI30',       name: 'Dow Jones 30',                assetClass: 'index',     base: 'DJI30',   quote: 'USD'  },
  { symbol: 'NIKKEI',      name: 'Nikkei 225',                  assetClass: 'index',     base: 'NIKKEI',  quote: 'JPY'  },
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
