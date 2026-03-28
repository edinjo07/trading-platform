/**
 * cmcService.ts
 *
 * Fetches real-time cryptocurrency prices and 24-hour stats from the
 * CoinMarketCap Pro API.
 *
 * Endpoint: GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest
 *   ?symbol=BTC,ETH,...&convert=USD
 *   Auth: X-CMC_PRO_API_KEY header
 *
 * Docs: https://coinmarketcap.com/api/documentation/v1/#operation/getV2CryptocurrencyQuotesLatest
 *
 * Credit cost: 1 credit per API call (covers up to ~100 symbols).
 * Default poll interval: 60 s → ~1440 calls/day.
 */

import { config } from '../config'
import type { PriceCallback, StatsCallback } from './realDataService'

// ---------------------------------------------------------------------------
// Symbol mapping: our internal symbol → CMC ticker
// ---------------------------------------------------------------------------
const INTERNAL_TO_CMC: Record<string, string> = {
  BTCUSD:   'BTC',
  ETHUSD:   'ETH',
  SOLUSD:   'SOL',
  BNBUSD:   'BNB',
  XRPUSD:   'XRP',
  LTCUSD:   'LTC',
  BCHUSD:   'BCH',
  DOGEUSD:  'DOGE',
  ADAUSD:   'ADA',
  DOTUSD:   'DOT',
  LNKUSD:   'LINK',
  AVAXUSD:  'AVAX',
  MATICUSD: 'MATIC',
  XLMUSD:   'XLM',
  XTZUSD:   'XTZ',
  UNIUSD:   'UNI',
  DSHUSD:   'DASH',
  NEARUSD:  'NEAR',
  ATOMUSD:  'ATOM',
  ALGOUSD:  'ALGO',
  FILUSD:   'FIL',
}

// Reverse map: CMC ticker → internal symbol
const CMC_TO_INTERNAL: Record<string, string> = Object.fromEntries(
  Object.entries(INTERNAL_TO_CMC).map(([k, v]) => [v, k]),
)

const CMC_SYMBOLS = [...new Set(Object.values(INTERNAL_TO_CMC))].join(',')
const CMC_BASE = 'https://pro-api.coinmarketcap.com'

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------
interface CmcQuote {
  price: number
  volume_24h: number
  percent_change_24h: number
}

interface CmcCoinData {
  symbol: string
  quote: { USD: CmcQuote }
}

interface CmcResponse {
  status: { error_code: number; error_message: string | null }
  data: Record<string, CmcCoinData | CmcCoinData[]>
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------
async function fetchQuotes(): Promise<CmcResponse | null> {
  const apiKey = config.cmcApiKey
  if (!apiKey) return null

  const url = new URL(`${CMC_BASE}/v1/cryptocurrency/quotes/latest`)
  url.searchParams.set('symbol', CMC_SYMBOLS)
  url.searchParams.set('convert', 'USD')

  const resp = await fetch(url.toString(), {
    headers: {
      'X-CMC_PRO_API_KEY': apiKey,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) {
    console.warn(`[CMC] HTTP ${resp.status} ${resp.statusText}`)
    return null
  }

  return resp.json() as Promise<CmcResponse>
}

function processData(
  data: CmcResponse['data'],
  onPrice: PriceCallback,
  onStats?: StatsCallback,
): number {
  let count = 0
  for (const [cmcTicker, entry] of Object.entries(data)) {
    // CMC may return an array when multiple coins share a symbol – use first
    const coin: CmcCoinData = Array.isArray(entry) ? entry[0] : entry
    const usd = coin?.quote?.USD
    if (!usd || !(usd.price > 0)) continue

    const ourSymbol = CMC_TO_INTERNAL[cmcTicker]
    if (!ourSymbol) continue

    onPrice(ourSymbol, usd.price)
    count++

    if (onStats) {
      const pct = usd.percent_change_24h ?? 0
      // Derive the 24 h open from the percentage change
      const openPrice = pct !== 0 ? usd.price / (1 + pct / 100) : usd.price
      // CMC quotes/latest does not include 24 h high/low; pass 0 so
      // inject24hStats ignores those fields and lets GBM fill the range.
      onStats(ourSymbol, openPrice, 0, 0, usd.volume_24h)
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** One-time price seed on startup. */
export async function seedFromCMC(
  onPrice: PriceCallback,
  onStats?: StatsCallback,
): Promise<void> {
  if (!config.cmcApiKey) {
    console.warn('[CMC] ⚠️  CMC_API_KEY not set - skipping CoinMarketCap seed')
    return
  }

  try {
    const result = await fetchQuotes()
    if (!result) return
    if (result.status.error_code !== 0) {
      console.warn('[CMC] Seed API error:', result.status.error_message)
      return
    }
    const count = processData(result.data, onPrice, onStats)
    console.log(`[CMC] ✅ Seeded ${count} crypto prices from CoinMarketCap`)
  } catch (err: unknown) {
    console.warn('[CMC] Seed error:', err instanceof Error ? err.message : String(err))
  }
}

let pollRunning = false

/** Start polling CoinMarketCap every `intervalMs` milliseconds.
 * Default: 5 minutes (300 s) → 288 calls/day → 8,640/month.
 * CMC free plan gives 10,000 credits/month. Binance WS already streams
 * live crypto tick-by-tick, so CMC is a quality backup, not a real-time feed.
 */
export function startCMCPolling(
  onPrice: PriceCallback,
  onStats?: StatsCallback,
  intervalMs = 300_000,
): void {
  if (pollRunning || !config.cmcApiKey) return
  pollRunning = true
  console.log(`[CMC] 🔄 Starting CoinMarketCap polling (every ${intervalMs / 1000} s)`)

  async function poll(): Promise<void> {
    try {
      const result = await fetchQuotes()
      if (!result) return
      if (result.status.error_code !== 0) {
        console.warn('[CMC] Poll API error:', result.status.error_message)
        return
      }
      processData(result.data, onPrice, onStats)
    } catch (err: unknown) {
      console.warn('[CMC] Poll error:', err instanceof Error ? err.message : String(err))
    }
  }

  // First poll after a short delay (seed already ran at startup)
  setTimeout(() => {
    poll().catch(() => {})
    setInterval(() => { poll().catch(() => {}) }, intervalMs)
  }, 10_000)
}
