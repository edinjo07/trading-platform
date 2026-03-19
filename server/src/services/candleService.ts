/**
 * candleService.ts
 *
 * Fetches real OHLCV candlestick data from Twelve Data REST API.
 * Falls back to the mock generator when the API key is absent or the
 * request fails.
 *
 * Twelve Data time_series:
 *   GET https://api.twelvedata.com/time_series
 *     ?symbol=EUR/USD&interval=1min&outputsize=200&date_format=timestamp&apikey=KEY
 *
 * Interval mapping (our format → Twelve Data format):
 *   1m → 1min | 5m → 5min | 15m → 15min | 30m → 30min
 *   1h → 1h   | 4h → 4h   | 1d → 1day   | 1w → 1week
 */

import { config } from '../config'
import { generateCandles } from './mockDataService'
import { Candle } from '../types'

// ---------------------------------------------------------------------------
// Interval / output-size mapping
// ---------------------------------------------------------------------------
const TD_INTERVAL: Record<string, string> = {
  '1m':  '1min',
  '5m':  '5min',
  '15m': '15min',
  '30m': '30min',
  '1h':  '1h',
  '2h':  '2h',
  '4h':  '4h',
  '1d':  '1day',
  '1w':  '1week',
  // legacy aliases used elsewhere in the codebase
  '1min':  '1min',
  '5min':  '5min',
  '15min': '15min',
  '30min': '30min',
  '1day':  '1day',
  '1week': '1week',
}

// Twelve Data uses "Forex" asset class suffix for forex pairs
const FOREX_RE = /^[A-Z]{3}\/[A-Z]{3}$/

function tdSymbol(symbol: string): string {
  // crypto symbols use USDT pairs — TD doesn't need a suffix for crypto
  // Forex: e.g. EUR/USD → EUR/USD (TD understands this directly)
  return symbol
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------
interface CacheEntry { candles: Candle[]; fetchedAt: number }
const cache = new Map<string, CacheEntry>()

/** TTL per interval (ms) — shorter intervals refresh more often */
function cacheTtl(interval: string): number {
  if (interval.endsWith('min') || interval === '1m' || interval === '5m') return 60_000      // 1 min
  if (interval === '15m' || interval === '30m')                             return 3 * 60_000 // 3 min
  if (interval === '1h' || interval === '2h')                               return 5 * 60_000 // 5 min
  return 15 * 60_000 // 15 min for 4h / 1d / 1w
}

function cacheKey(symbol: string, interval: string, limit: number): string {
  return `${symbol}|${interval}|${limit}`
}

// ---------------------------------------------------------------------------
// Twelve Data response shape
// ---------------------------------------------------------------------------
interface TdValue {
  datetime: string | number
  open: string
  high: string
  low: string
  close: string
  volume: string
}
interface TdResponse {
  status: string
  message?: string
  code?: number
  values?: TdValue[]
}

// ---------------------------------------------------------------------------
// Core fetch function
// ---------------------------------------------------------------------------
async function fetchFromTwelveData(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[] | null> {
  const apiKey = config.twelveDataApiKey
  if (!apiKey) return null

  const tdInterval = TD_INTERVAL[interval] ?? '1h'
  const outputSize = Math.min(limit, 5000)

  // Twelve Data uses "USD/JPY" for forex (slash notation) but stocks are plain
  const sym = tdSymbol(symbol)

  const url = new URL('https://api.twelvedata.com/time_series')
  url.searchParams.set('symbol',      sym)
  url.searchParams.set('interval',    tdInterval)
  url.searchParams.set('outputsize',  String(outputSize))
  url.searchParams.set('apikey',      apiKey)

  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return null

    const data = (await resp.json()) as TdResponse

    if (data.status !== 'ok' || !Array.isArray(data.values) || data.values.length === 0) {
      if (data.message) {
        console.warn(`[Candles] Twelve Data warning for ${symbol}: ${data.message}`)
      }
      return null
    }

    // TD returns newest-first → reverse to chronological order
    const candles: Candle[] = data.values
      .slice()
      .reverse()
      .map(v => {
        // date_format=timestamp → numeric ms; fallback → ISO/datetime string
        let time: number
        const raw = v.datetime
        if (typeof raw === 'number') {
          time = Math.floor(raw / 1000)
        } else {
          const ms = Date.parse(raw.replace(' ', 'T') + (raw.includes('T') ? '' : 'Z'))
          time = Number.isFinite(ms) ? Math.floor(ms / 1000) : 0
        }
        return {
          time,
          open:   parseFloat(v.open),
          high:   parseFloat(v.high),
          low:    parseFloat(v.low),
          close:  parseFloat(v.close),
          volume: parseFloat(v.volume) || 0,
        }
      })

    return candles
  } catch (err: any) {
    console.warn(`[Candles] Fetch error for ${symbol}: ${err?.message ?? err}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Binance — crypto OHLCV klines (free REST API, no key required)
// ---------------------------------------------------------------------------
const BINANCE_INTERVAL: Record<string, string> = {
  '1m': '1m',  '3m': '3m',   '5m': '5m',  '15m': '15m', '30m': '30m',
  '1h': '1h',  '2h': '2h',   '4h': '4h',  '6h': '6h',   '12h': '12h',
  '1d': '1d',  '1w': '1w',
  // legacy aliases
  '1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m', '1day': '1d', '1week': '1w',
}

// IC Markets crypto symbol → Binance REST API symbol
const CRYPTO_BINANCE_MAP: Record<string, string> = {
  BTCUSD:   'BTCUSDT',
  ETHUSD:   'ETHUSDT',
  LTCUSD:   'LTCUSDT',
  BCHUSD:   'BCHUSDT',
  DSHUSD:   'DASHUSDT',
  XRPUSD:   'XRPUSDT',
  DOTUSD:   'DOTUSDT',
  LNKUSD:   'LINKUSDT',
  ADAUSD:   'ADAUSDT',
  BNBUSD:   'BNBUSDT',
  SOLUSD:   'SOLUSDT',
  AVAXUSD:  'AVAXUSDT',
  MATICUSD: 'MATICUSDT',
  DOGEUSD:  'DOGEUSDT',
  XLMUSD:   'XLMUSDT',
  XTZUSD:   'XTZUSDT',
  UNIUSD:   'UNIUSDT',
}

function toBinanceSymbol(symbol: string): string | null {
  return CRYPTO_BINANCE_MAP[symbol] ?? null
}

async function fetchFromBinance(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[] | null> {
  const binSym = toBinanceSymbol(symbol)
  if (!binSym) return null
  const binInterval = BINANCE_INTERVAL[interval] ?? '1h'
  const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${binInterval}&limit=${Math.min(limit, 1000)}`
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!resp.ok) {
      console.warn(`[Candles] Binance klines HTTP ${resp.status} for ${symbol}`)
      return null
    }
    // Each row: [openTime, open, high, low, close, volume, closeTime, ...]
    const data = (await resp.json()) as Array<[number, string, string, string, string, string, ...unknown[]]>
    if (!Array.isArray(data) || data.length === 0) return null
    return data.map(k => ({
      time:   Math.floor(k[0] / 1000),
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  } catch (err: any) {
    console.warn(`[Candles] Binance fetch error for ${symbol}: ${err?.message ?? err}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Returns real OHLCV candles:
 *   • Crypto  → Binance REST klines (free, no auth)
 *   • Stocks  → Twelve Data REST (needs TWELVE_DATA_API_KEY)
 *   • Forex   → Twelve Data REST (needs TWELVE_DATA_API_KEY)
 * Falls back to GBM mock simulation if all real sources fail.
 */
export async function getCandles(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  const key = cacheKey(symbol, interval, limit)
  const cached = cache.get(key)

  if (cached && Date.now() - cached.fetchedAt < cacheTtl(interval)) {
    return cached.candles
  }

  const isCrypto = symbol.includes('USDT') || symbol.includes('/BTC')

  // ── Crypto: Binance REST klines ──────────────────────────────────────────
  if (isCrypto) {
    const real = await fetchFromBinance(symbol, interval, limit)
    if (real && real.length > 0) {
      cache.set(key, { candles: real, fetchedAt: Date.now() })
      return real
    }
  }

  // ── Stocks / Forex: Twelve Data ──────────────────────────────────────────
  if (!isCrypto && config.twelveDataApiKey) {
    const real = await fetchFromTwelveData(symbol, interval, limit)
    if (real && real.length > 0) {
      cache.set(key, { candles: real, fetchedAt: Date.now() })
      return real
    }
  }

  // ── Fallback: GBM simulation (anchored to current real price) ────────────
  const mock = generateCandles(symbol, interval, limit)
  cache.set(key, { candles: mock, fetchedAt: Date.now() - cacheTtl(interval) + 10_000 })
  return mock
}

/** Clear all cached candles (useful when API key changes at runtime) */
export function clearCandleCache(): void {
  cache.clear()
}
