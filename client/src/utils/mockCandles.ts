import { Candle, OrderBook, OrderBookEntry, Trade, MarketSymbol, Ticker } from '../types'

// Base prices for all IC Markets instruments
const BASE_PRICES: Record<string, number> = {
  // Stocks
  AAPL: 187.5, TSLA: 204.3, NVDA: 875.2, MSFT: 415.8, GOOGL: 162.4,
  AMZN: 178.5, META: 495.2, JPM: 198.5, NFLX: 625, COIN: 198,
  AMD: 162, DIS: 98.5,
  LMT: 485, RTX: 128.5, NOC: 488, GD: 295, BA: 168, HII: 272, LDOS: 168, CACI: 455,
  XOM: 112, CVX: 152, COP: 112,
  // Crypto (IC Markets: USD not USDT)
  BTCUSD: 74000, ETHUSD: 1900, LTCUSD: 82, BCHUSD: 380, DSHUSD: 28,
  XRPUSD: 2.30, DOTUSD: 7.1, LNKUSD: 14.2, ADAUSD: 0.45, BNBUSD: 590,
  SOLUSD: 130, AVAXUSD: 25.5, MATICUSD: 0.72, DOGEUSD: 0.125,
  XLMUSD: 0.28, XTZUSD: 0.75, UNIUSD: 8.5,
  EMCUSD: 0.08, NMCUSD: 0.35, PPCUSD: 0.40, LUNAUSD: 0.50,
  // Forex Majors
  EURUSD: 1.0885, GBPUSD: 1.2745, USDJPY: 149.32, USDCHF: 0.8945,
  USDCAD: 1.3615, AUDUSD: 0.652, NZDUSD: 0.6085,
  // Forex Minors
  AUDCAD: 0.8875, AUDCHF: 0.5830, AUDJPY: 97.2, AUDNZD: 1.0715,
  CADCHF: 0.658, CADJPY: 109.5, CHFJPY: 168.0,
  EURAUD: 1.684, EURCAD: 1.504, EURCHF: 0.965, EURGBP: 0.854,
  EURJPY: 162.45, EURNZD: 1.793,
  GBPAUD: 1.968, GBPCAD: 1.757, GBPCHF: 1.130, GBPJPY: 190.2, GBPNZD: 2.095,
  NZDCAD: 0.828, NZDCHF: 0.544, NZDJPY: 90.7,
  // Forex Exotics
  EURHUF: 398.5, EURNOK: 11.75, EURPLN: 4.265, EURSEK: 11.35,
  EURZAR: 20.5, EURMXN: 19.2, EURTRY: 387.0,
  GBPNOK: 13.76, GBPPLN: 4.99, GBPSEK: 13.28, GBPZAR: 24.05,
  USDCNH: 7.24, USDCZK: 23.4, USDDKK: 6.89, USDHKD: 7.826,
  USDHUF: 365.6, USDILS: 3.74, USDMXN: 17.4, USDNOK: 10.72,
  USDPLN: 3.916, USDSEK: 10.45, USDSGD: 1.344, USDTHB: 35.2,
  USDZAR: 18.6, USDTRY: 36.2,
  NOKJPY: 13.92, SGDJPY: 111.1,
  AUDMXN: 11.35, AUDSGD: 0.875, EURSGD: 1.462, GBPSGD: 1.710,
  NZDSGD: 0.817, EURCZK: 25.45,
  // Commodities
  XAUUSD: 2400, XAGUSD: 28.5, XPTUSD: 1000, XPDUSD: 1060,
  XBRUSD: 82.5, WTI: 78, BRENT: 83, NGAS: 2.20, GC25: 2420,
  COCOA: 9800, COFFEE: 245, CORN: 435, COTTON: 75.5,
  OJ: 285, SOYBEAN: 1055, SUGAR: 21.5, WHEAT: 540,
  COPPER: 4.25, LUMBER: 480, HO: 2.60,
  // Indices
  US500: 5200, USTEC: 18000, US30: 38500, UK100: 7900, DE40: 18500,
  F40: 8100, JP225: 38000, AUS200: 7800, STOXX50: 5050, CA60: 22000,
  CH20: 11800, HK50: 18500, ES35: 11200, IT40: 34000, NL25: 875,
  NO25: 1380, SING: 3350, PL40: 2450, ZA50: 74000, TW50: 20500,
  IN50: 22000, KO200: 380, DX: 104.5, VIX: 18.5, EUSTX50: 5050,
  // Bonds
  TNOTE: 108.5, BUND: 131.2, GILT: 95.8, JGB: 144.5, OAT: 128.9,
  BTP: 117.5, AUB: 96.2, BONO: 112.8, USBOND: 109.5,
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
  symbol: string; name: string; assetClass: 'crypto' | 'stock' | 'forex' | 'commodity' | 'index' | 'bond'
  base: string; quote: string
}[] = [
  // Stocks
  { symbol: 'AAPL',  name: 'Apple Inc.',                assetClass: 'stock',     base: 'AAPL',  quote: 'USD' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                assetClass: 'stock',     base: 'TSLA',  quote: 'USD' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',              assetClass: 'stock',     base: 'NVDA',  quote: 'USD' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',           assetClass: 'stock',     base: 'MSFT',  quote: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',             assetClass: 'stock',     base: 'GOOGL', quote: 'USD' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',           assetClass: 'stock',     base: 'AMZN',  quote: 'USD' },
  { symbol: 'META',  name: 'Meta Platforms',            assetClass: 'stock',     base: 'META',  quote: 'USD' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',            assetClass: 'stock',     base: 'JPM',   quote: 'USD' },
  { symbol: 'NFLX',  name: 'Netflix Inc.',              assetClass: 'stock',     base: 'NFLX',  quote: 'USD' },
  { symbol: 'COIN',  name: 'Coinbase Global',           assetClass: 'stock',     base: 'COIN',  quote: 'USD' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',    assetClass: 'stock',     base: 'AMD',   quote: 'USD' },
  { symbol: 'DIS',   name: 'Walt Disney Co.',           assetClass: 'stock',     base: 'DIS',   quote: 'USD' },
  { symbol: 'LMT',   name: 'Lockheed Martin Corp.',     assetClass: 'stock',     base: 'LMT',   quote: 'USD' },
  { symbol: 'RTX',   name: 'RTX Corp. (Raytheon)',      assetClass: 'stock',     base: 'RTX',   quote: 'USD' },
  { symbol: 'NOC',   name: 'Northrop Grumman Corp.',    assetClass: 'stock',     base: 'NOC',   quote: 'USD' },
  { symbol: 'GD',    name: 'General Dynamics Corp.',    assetClass: 'stock',     base: 'GD',    quote: 'USD' },
  { symbol: 'BA',    name: 'Boeing Co.',                assetClass: 'stock',     base: 'BA',    quote: 'USD' },
  { symbol: 'HII',   name: 'Huntington Ingalls Ind.',   assetClass: 'stock',     base: 'HII',   quote: 'USD' },
  { symbol: 'LDOS',  name: 'Leidos Holdings Inc.',      assetClass: 'stock',     base: 'LDOS',  quote: 'USD' },
  { symbol: 'CACI',  name: 'CACI International Inc.',   assetClass: 'stock',     base: 'CACI',  quote: 'USD' },
  { symbol: 'XOM',   name: 'ExxonMobil Corp.',          assetClass: 'stock',     base: 'XOM',   quote: 'USD' },
  { symbol: 'CVX',   name: 'Chevron Corp.',             assetClass: 'stock',     base: 'CVX',   quote: 'USD' },
  { symbol: 'COP',   name: 'ConocoPhillips',            assetClass: 'stock',     base: 'COP',   quote: 'USD' },
  // Crypto (IC Markets naming)
  { symbol: 'BTCUSD',   name: 'Bitcoin',       assetClass: 'crypto', base: 'BTC',   quote: 'USD' },
  { symbol: 'ETHUSD',   name: 'Ethereum',      assetClass: 'crypto', base: 'ETH',   quote: 'USD' },
  { symbol: 'LTCUSD',   name: 'Litecoin',      assetClass: 'crypto', base: 'LTC',   quote: 'USD' },
  { symbol: 'BCHUSD',   name: 'Bitcoin Cash',  assetClass: 'crypto', base: 'BCH',   quote: 'USD' },
  { symbol: 'DSHUSD',   name: 'Dash',          assetClass: 'crypto', base: 'DSH',   quote: 'USD' },
  { symbol: 'XRPUSD',   name: 'XRP',           assetClass: 'crypto', base: 'XRP',   quote: 'USD' },
  { symbol: 'DOTUSD',   name: 'Polkadot',      assetClass: 'crypto', base: 'DOT',   quote: 'USD' },
  { symbol: 'LNKUSD',   name: 'Chainlink',     assetClass: 'crypto', base: 'LNK',   quote: 'USD' },
  { symbol: 'ADAUSD',   name: 'Cardano',       assetClass: 'crypto', base: 'ADA',   quote: 'USD' },
  { symbol: 'BNBUSD',   name: 'BNB',           assetClass: 'crypto', base: 'BNB',   quote: 'USD' },
  { symbol: 'SOLUSD',   name: 'Solana',        assetClass: 'crypto', base: 'SOL',   quote: 'USD' },
  { symbol: 'AVAXUSD',  name: 'Avalanche',     assetClass: 'crypto', base: 'AVAX',  quote: 'USD' },
  { symbol: 'MATICUSD', name: 'Polygon',       assetClass: 'crypto', base: 'MATIC', quote: 'USD' },
  { symbol: 'DOGEUSD',  name: 'Dogecoin',      assetClass: 'crypto', base: 'DOGE',  quote: 'USD' },
  { symbol: 'XLMUSD',   name: 'Stellar',       assetClass: 'crypto', base: 'XLM',   quote: 'USD' },
  { symbol: 'XTZUSD',   name: 'Tezos',         assetClass: 'crypto', base: 'XTZ',   quote: 'USD' },
  { symbol: 'UNIUSD',   name: 'Uniswap',       assetClass: 'crypto', base: 'UNI',   quote: 'USD' },
  { symbol: 'EMCUSD',   name: 'Emercoin',      assetClass: 'crypto', base: 'EMC',   quote: 'USD' },
  { symbol: 'NMCUSD',   name: 'Namecoin',      assetClass: 'crypto', base: 'NMC',   quote: 'USD' },
  { symbol: 'PPCUSD',   name: 'Peercoin',      assetClass: 'crypto', base: 'PPC',   quote: 'USD' },
  { symbol: 'LUNAUSD',  name: 'Terra Luna',    assetClass: 'crypto', base: 'LUNA',  quote: 'USD' },
  // Forex Majors
  { symbol: 'EURUSD', name: 'Euro / US Dollar',               assetClass: 'forex', base: 'EUR', quote: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar',      assetClass: 'forex', base: 'GBP', quote: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen',       assetClass: 'forex', base: 'USD', quote: 'JPY' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc',        assetClass: 'forex', base: 'USD', quote: 'CHF' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar',    assetClass: 'forex', base: 'USD', quote: 'CAD' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / USD',        assetClass: 'forex', base: 'AUD', quote: 'USD' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / USD',       assetClass: 'forex', base: 'NZD', quote: 'USD' },
  // Forex Minors
  { symbol: 'AUDCAD', name: 'AUD / CAD',  assetClass: 'forex', base: 'AUD', quote: 'CAD' },
  { symbol: 'AUDCHF', name: 'AUD / CHF',  assetClass: 'forex', base: 'AUD', quote: 'CHF' },
  { symbol: 'AUDJPY', name: 'AUD / JPY',  assetClass: 'forex', base: 'AUD', quote: 'JPY' },
  { symbol: 'AUDNZD', name: 'AUD / NZD',  assetClass: 'forex', base: 'AUD', quote: 'NZD' },
  { symbol: 'CADCHF', name: 'CAD / CHF',  assetClass: 'forex', base: 'CAD', quote: 'CHF' },
  { symbol: 'CADJPY', name: 'CAD / JPY',  assetClass: 'forex', base: 'CAD', quote: 'JPY' },
  { symbol: 'CHFJPY', name: 'CHF / JPY',  assetClass: 'forex', base: 'CHF', quote: 'JPY' },
  { symbol: 'EURAUD', name: 'EUR / AUD',  assetClass: 'forex', base: 'EUR', quote: 'AUD' },
  { symbol: 'EURCAD', name: 'EUR / CAD',  assetClass: 'forex', base: 'EUR', quote: 'CAD' },
  { symbol: 'EURCHF', name: 'EUR / CHF',  assetClass: 'forex', base: 'EUR', quote: 'CHF' },
  { symbol: 'EURGBP', name: 'EUR / GBP',  assetClass: 'forex', base: 'EUR', quote: 'GBP' },
  { symbol: 'EURJPY', name: 'EUR / JPY',  assetClass: 'forex', base: 'EUR', quote: 'JPY' },
  { symbol: 'EURNZD', name: 'EUR / NZD',  assetClass: 'forex', base: 'EUR', quote: 'NZD' },
  { symbol: 'GBPAUD', name: 'GBP / AUD',  assetClass: 'forex', base: 'GBP', quote: 'AUD' },
  { symbol: 'GBPCAD', name: 'GBP / CAD',  assetClass: 'forex', base: 'GBP', quote: 'CAD' },
  { symbol: 'GBPCHF', name: 'GBP / CHF',  assetClass: 'forex', base: 'GBP', quote: 'CHF' },
  { symbol: 'GBPJPY', name: 'GBP / JPY',  assetClass: 'forex', base: 'GBP', quote: 'JPY' },
  { symbol: 'GBPNZD', name: 'GBP / NZD',  assetClass: 'forex', base: 'GBP', quote: 'NZD' },
  { symbol: 'NZDCAD', name: 'NZD / CAD',  assetClass: 'forex', base: 'NZD', quote: 'CAD' },
  { symbol: 'NZDCHF', name: 'NZD / CHF',  assetClass: 'forex', base: 'NZD', quote: 'CHF' },
  { symbol: 'NZDJPY', name: 'NZD / JPY',  assetClass: 'forex', base: 'NZD', quote: 'JPY' },
  // Forex Exotics
  { symbol: 'EURHUF',  name: 'EUR / HUF', assetClass: 'forex', base: 'EUR', quote: 'HUF' },
  { symbol: 'EURNOK',  name: 'EUR / NOK', assetClass: 'forex', base: 'EUR', quote: 'NOK' },
  { symbol: 'EURPLN',  name: 'EUR / PLN', assetClass: 'forex', base: 'EUR', quote: 'PLN' },
  { symbol: 'EURSEK',  name: 'EUR / SEK', assetClass: 'forex', base: 'EUR', quote: 'SEK' },
  { symbol: 'EURZAR',  name: 'EUR / ZAR', assetClass: 'forex', base: 'EUR', quote: 'ZAR' },
  { symbol: 'EURMXN',  name: 'EUR / MXN', assetClass: 'forex', base: 'EUR', quote: 'MXN' },
  { symbol: 'EURTRY',  name: 'EUR / TRY', assetClass: 'forex', base: 'EUR', quote: 'TRY' },
  { symbol: 'GBPNOK',  name: 'GBP / NOK', assetClass: 'forex', base: 'GBP', quote: 'NOK' },
  { symbol: 'GBPPLN',  name: 'GBP / PLN', assetClass: 'forex', base: 'GBP', quote: 'PLN' },
  { symbol: 'GBPSEK',  name: 'GBP / SEK', assetClass: 'forex', base: 'GBP', quote: 'SEK' },
  { symbol: 'GBPZAR',  name: 'GBP / ZAR', assetClass: 'forex', base: 'GBP', quote: 'ZAR' },
  { symbol: 'USDCNH',  name: 'USD / CNH', assetClass: 'forex', base: 'USD', quote: 'CNH' },
  { symbol: 'USDCZK',  name: 'USD / CZK', assetClass: 'forex', base: 'USD', quote: 'CZK' },
  { symbol: 'USDDKK',  name: 'USD / DKK', assetClass: 'forex', base: 'USD', quote: 'DKK' },
  { symbol: 'USDHKD',  name: 'USD / HKD', assetClass: 'forex', base: 'USD', quote: 'HKD' },
  { symbol: 'USDHUF',  name: 'USD / HUF', assetClass: 'forex', base: 'USD', quote: 'HUF' },
  { symbol: 'USDILS',  name: 'USD / ILS', assetClass: 'forex', base: 'USD', quote: 'ILS' },
  { symbol: 'USDMXN',  name: 'USD / MXN', assetClass: 'forex', base: 'USD', quote: 'MXN' },
  { symbol: 'USDNOK',  name: 'USD / NOK', assetClass: 'forex', base: 'USD', quote: 'NOK' },
  { symbol: 'USDPLN',  name: 'USD / PLN', assetClass: 'forex', base: 'USD', quote: 'PLN' },
  { symbol: 'USDSEK',  name: 'USD / SEK', assetClass: 'forex', base: 'USD', quote: 'SEK' },
  { symbol: 'USDSGD',  name: 'USD / SGD', assetClass: 'forex', base: 'USD', quote: 'SGD' },
  { symbol: 'USDTHB',  name: 'USD / THB', assetClass: 'forex', base: 'USD', quote: 'THB' },
  { symbol: 'USDZAR',  name: 'USD / ZAR', assetClass: 'forex', base: 'USD', quote: 'ZAR' },
  { symbol: 'USDTRY',  name: 'USD / TRY', assetClass: 'forex', base: 'USD', quote: 'TRY' },
  { symbol: 'NOKJPY',  name: 'NOK / JPY', assetClass: 'forex', base: 'NOK', quote: 'JPY' },
  { symbol: 'SGDJPY',  name: 'SGD / JPY', assetClass: 'forex', base: 'SGD', quote: 'JPY' },
  { symbol: 'AUDMXN',  name: 'AUD / MXN', assetClass: 'forex', base: 'AUD', quote: 'MXN' },
  { symbol: 'AUDSGD',  name: 'AUD / SGD', assetClass: 'forex', base: 'AUD', quote: 'SGD' },
  { symbol: 'EURSGD',  name: 'EUR / SGD', assetClass: 'forex', base: 'EUR', quote: 'SGD' },
  { symbol: 'GBPSGD',  name: 'GBP / SGD', assetClass: 'forex', base: 'GBP', quote: 'SGD' },
  { symbol: 'NZDSGD',  name: 'NZD / SGD', assetClass: 'forex', base: 'NZD', quote: 'SGD' },
  { symbol: 'EURCZK',  name: 'EUR / CZK', assetClass: 'forex', base: 'EUR', quote: 'CZK' },
  // Commodities
  { symbol: 'XAUUSD',  name: 'Gold',              assetClass: 'commodity', base: 'XAU',    quote: 'USD' },
  { symbol: 'XAGUSD',  name: 'Silver',            assetClass: 'commodity', base: 'XAG',    quote: 'USD' },
  { symbol: 'XPTUSD',  name: 'Platinum',          assetClass: 'commodity', base: 'XPT',    quote: 'USD' },
  { symbol: 'XPDUSD',  name: 'Palladium',         assetClass: 'commodity', base: 'XPD',    quote: 'USD' },
  { symbol: 'XBRUSD',  name: 'Brent Crude (Spot)', assetClass: 'commodity', base: 'XBR',   quote: 'USD' },
  { symbol: 'WTI',     name: 'Crude Oil WTI',     assetClass: 'commodity', base: 'WTI',    quote: 'USD' },
  { symbol: 'BRENT',   name: 'Brent Crude Oil',   assetClass: 'commodity', base: 'BRENT',  quote: 'USD' },
  { symbol: 'NGAS',    name: 'Natural Gas',        assetClass: 'commodity', base: 'NGAS',   quote: 'USD' },
  { symbol: 'GC25',    name: 'Gold Futures',       assetClass: 'commodity', base: 'GC',     quote: 'USD' },
  { symbol: 'COCOA',   name: 'Cocoa',              assetClass: 'commodity', base: 'COCOA',  quote: 'USD' },
  { symbol: 'COFFEE',  name: 'Coffee',             assetClass: 'commodity', base: 'COFFEE', quote: 'USD' },
  { symbol: 'CORN',    name: 'Corn',               assetClass: 'commodity', base: 'CORN',   quote: 'USD' },
  { symbol: 'COTTON',  name: 'Cotton',             assetClass: 'commodity', base: 'COTTON', quote: 'USD' },
  { symbol: 'OJ',      name: 'Orange Juice',       assetClass: 'commodity', base: 'OJ',     quote: 'USD' },
  { symbol: 'SOYBEAN', name: 'Soybeans',           assetClass: 'commodity', base: 'SOYBEAN',quote: 'USD' },
  { symbol: 'SUGAR',   name: 'Sugar',              assetClass: 'commodity', base: 'SUGAR',  quote: 'USD' },
  { symbol: 'WHEAT',   name: 'Wheat',              assetClass: 'commodity', base: 'WHEAT',  quote: 'USD' },
  { symbol: 'COPPER',  name: 'Copper',             assetClass: 'commodity', base: 'COPPER', quote: 'USD' },
  { symbol: 'LUMBER',  name: 'Lumber',             assetClass: 'commodity', base: 'LUMBER', quote: 'USD' },
  { symbol: 'HO',      name: 'Heating Oil',        assetClass: 'commodity', base: 'HO',     quote: 'USD' },
  // Indices
  { symbol: 'US500',   name: 'S&P 500',          assetClass: 'index', base: 'US500',   quote: 'USD' },
  { symbol: 'USTEC',   name: 'NASDAQ 100',        assetClass: 'index', base: 'USTEC',   quote: 'USD' },
  { symbol: 'US30',    name: 'Dow Jones 30',      assetClass: 'index', base: 'US30',    quote: 'USD' },
  { symbol: 'UK100',   name: 'FTSE 100',          assetClass: 'index', base: 'UK100',   quote: 'GBP' },
  { symbol: 'DE40',    name: 'DAX 40',            assetClass: 'index', base: 'DE40',    quote: 'EUR' },
  { symbol: 'F40',     name: 'CAC 40',            assetClass: 'index', base: 'F40',     quote: 'EUR' },
  { symbol: 'JP225',   name: 'Nikkei 225',        assetClass: 'index', base: 'JP225',   quote: 'JPY' },
  { symbol: 'AUS200',  name: 'ASX 200',           assetClass: 'index', base: 'AUS200',  quote: 'AUD' },
  { symbol: 'STOXX50', name: 'Euro Stoxx 50',     assetClass: 'index', base: 'STOXX50', quote: 'EUR' },
  { symbol: 'CA60',    name: 'S&P/TSX 60',        assetClass: 'index', base: 'CA60',    quote: 'CAD' },
  { symbol: 'CH20',    name: 'SMI 20',            assetClass: 'index', base: 'CH20',    quote: 'CHF' },
  { symbol: 'HK50',    name: 'Hang Seng 50',      assetClass: 'index', base: 'HK50',    quote: 'HKD' },
  { symbol: 'ES35',    name: 'IBEX 35',           assetClass: 'index', base: 'ES35',    quote: 'EUR' },
  { symbol: 'IT40',    name: 'FTSE MIB 40',       assetClass: 'index', base: 'IT40',    quote: 'EUR' },
  { symbol: 'NL25',    name: 'AEX 25',            assetClass: 'index', base: 'NL25',    quote: 'EUR' },
  { symbol: 'NO25',    name: 'OBX 25',            assetClass: 'index', base: 'NO25',    quote: 'NOK' },
  { symbol: 'SING',    name: 'Singapore STI',     assetClass: 'index', base: 'SING',    quote: 'SGD' },
  { symbol: 'PL40',    name: 'WIG 40',            assetClass: 'index', base: 'PL40',    quote: 'PLN' },
  { symbol: 'ZA50',    name: 'SA Top 40',         assetClass: 'index', base: 'ZA50',    quote: 'ZAR' },
  { symbol: 'TW50',    name: 'TWSE 50',           assetClass: 'index', base: 'TW50',    quote: 'TWD' },
  { symbol: 'IN50',    name: 'Nifty 50',          assetClass: 'index', base: 'IN50',    quote: 'INR' },
  { symbol: 'KO200',   name: 'KOSPI 200',         assetClass: 'index', base: 'KO200',   quote: 'KRW' },
  { symbol: 'DX',      name: 'US Dollar Index',   assetClass: 'index', base: 'DX',      quote: 'USD' },
  { symbol: 'VIX',     name: 'CBOE Volatility',   assetClass: 'index', base: 'VIX',     quote: 'USD' },
  { symbol: 'EUSTX50', name: 'Euro Stoxx 50 CFD', assetClass: 'index', base: 'EUSTX50', quote: 'EUR' },
  // Government Bonds
  { symbol: 'TNOTE',  name: 'US 10-Year T-Note',  assetClass: 'bond', base: 'TNOTE',  quote: 'USD' },
  { symbol: 'BUND',   name: 'German Bund',         assetClass: 'bond', base: 'BUND',   quote: 'EUR' },
  { symbol: 'GILT',   name: 'UK Gilt',             assetClass: 'bond', base: 'GILT',   quote: 'GBP' },
  { symbol: 'JGB',    name: 'Japan Gov. Bond',     assetClass: 'bond', base: 'JGB',    quote: 'JPY' },
  { symbol: 'OAT',    name: 'French OAT',          assetClass: 'bond', base: 'OAT',    quote: 'EUR' },
  { symbol: 'BTP',    name: 'Italian BTP',         assetClass: 'bond', base: 'BTP',    quote: 'EUR' },
  { symbol: 'AUB',    name: 'Australian Bond',     assetClass: 'bond', base: 'AUB',    quote: 'AUD' },
  { symbol: 'BONO',   name: 'Spanish Bond',        assetClass: 'bond', base: 'BONO',   quote: 'EUR' },
  { symbol: 'USBOND', name: 'US 30-Year Bond',     assetClass: 'bond', base: 'USBOND', quote: 'USD' },
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
