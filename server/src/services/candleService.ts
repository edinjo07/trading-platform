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
// Public API
// ---------------------------------------------------------------------------
/**
 * Returns OHLCV candles for the given symbol. Uses real Twelve Data data when
 * available (with in-memory caching), otherwise falls back to mock generator.
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

  // Crypto candles come from Binance, not Twelve Data — keep mock for those
  const isCrypto = symbol.includes('/USDT') || symbol.includes('/BTC')

  if (!isCrypto && config.twelveDataApiKey) {
    const real = await fetchFromTwelveData(symbol, interval, limit)
    if (real && real.length > 0) {
      cache.set(key, { candles: real, fetchedAt: Date.now() })
      return real
    }
  }

  // Fallback: mock GBM simulation
  const mock = generateCandles(symbol, interval, limit)
  cache.set(key, { candles: mock, fetchedAt: Date.now() - cacheTtl(interval) + 10_000 })
  return mock
}

/** Clear all cached candles (useful when API key changes at runtime) */
export function clearCandleCache(): void {
  cache.clear()
}
