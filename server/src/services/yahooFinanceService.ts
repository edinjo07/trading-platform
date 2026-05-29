/**
 * yahooFinanceService.ts
 *
 * Real price feeds for stocks, indices, energy and commodities via Yahoo Finance.
 * No API key required. Uses the public v7/finance/quote batch endpoint.
 *
 * Poll cadence:
 *   - 60 s during US regular market hours (Mon–Fri 09:30–16:00 ET)
 *   - 5 min outside market hours (prices still anchor GBM from last close)
 *
 * Covers everything not handled by Binance (crypto) or Twelve Data (forex/XAU):
 *   23 US stocks · 16 global indices · 3 energy futures · 8 agricultural futures
 */

import { PriceCallback, StatsCallback } from './realDataService'

// ── Symbol map: Yahoo Finance symbol → internal symbol ──────────────────────

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // US stocks
  AAPL: 'AAPL', TSLA: 'TSLA', NVDA: 'NVDA', MSFT: 'MSFT',
  GOOGL: 'GOOGL', AMZN: 'AMZN', META: 'META', JPM: 'JPM',
  NFLX: 'NFLX', COIN: 'COIN', AMD: 'AMD', DIS: 'DIS',
  LMT: 'LMT', RTX: 'RTX', NOC: 'NOC', GD: 'GD',
  BA: 'BA', HII: 'HII', LDOS: 'LDOS', CACI: 'CACI',
  XOM: 'XOM', CVX: 'CVX', COP: 'COP',
  // Global indices
  '^GSPC':     'US500',
  '^NDX':      'USTEC',
  '^DJI':      'US30',
  '^FTSE':     'UK100',
  '^GDAXI':    'DE40',
  '^FCHI':     'F40',
  '^N225':     'JP225',
  '^AXJO':     'AUS200',
  '^STOXX50E': 'STOXX50',
  '^HSI':      'HK50',
  '^IBEX':     'ES35',
  '^FTSEMIB':  'IT40',
  '^AEX':      'NL25',
  '^SSMI':     'CH20',
  'DX-Y.NYB':  'DX',
  '^VIX':      'VIX',
  // Precious metals futures
  'GC=F': 'XAUUSD',
  'SI=F': 'XAGUSD',
  'PL=F': 'XPTUSD',
  'PA=F': 'XPDUSD',
  // Energy futures
  'CL=F': 'WTI',
  'BZ=F': 'BRENT',
  'NG=F': 'NGAS',
  // Agricultural / soft commodity futures
  'CC=F': 'COCOA',
  'KC=F': 'COFFEE',
  'ZC=F': 'CORN',
  'CT=F': 'COTTON',
  'ZS=F': 'SOYBEAN',
  'SB=F': 'SUGAR',
  'ZW=F': 'WHEAT',
  'HG=F': 'COPPER',
}

const ALL_SYMBOLS = Object.keys(YAHOO_SYMBOL_MAP)

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Approximate US market hours check (Mon–Fri, 09:30–16:00 ET / UTC-4) */
function isUSMarketHours(): boolean {
  const now = new Date()
  if ([0, 6].includes(now.getUTCDay())) return false
  const etMins = ((now.getUTCHours() - 4 + 24) % 24) * 60 + now.getUTCMinutes()
  return etMins >= 570 && etMins < 960
}

// ── Yahoo Finance fetch ───────────────────────────────────────────────────────

interface YFQuote {
  symbol:                string
  regularMarketPrice?:   number
  regularMarketOpen?:    number
  regularMarketDayHigh?: number
  regularMarketDayLow?:  number
  regularMarketVolume?:  number
}

interface YFResponse {
  quoteResponse?: { result?: YFQuote[] }
}

const YF_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

async function fetchBatch(
  symbols: string[],
  onPrice: PriceCallback,
  onStats?: StatsCallback,
): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: YF_HEADERS })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const data = await resp.json() as YFResponse
  const results = data?.quoteResponse?.result ?? []
  let count = 0

  for (const q of results) {
    const ourSym = YAHOO_SYMBOL_MAP[q.symbol]
    const price  = q.regularMarketPrice
    if (!ourSym || !price || price <= 0) continue

    onPrice(ourSym, price)
    count++

    if (onStats && q.regularMarketOpen && q.regularMarketDayHigh && q.regularMarketDayLow) {
      onStats(ourSym, q.regularMarketOpen, q.regularMarketDayHigh, q.regularMarketDayLow, q.regularMarketVolume ?? 0)
    }
  }

  return count
}

// ── Public entry point ────────────────────────────────────────────────────────

export function startYahooFinanceFeed(onPrice: PriceCallback, onStats?: StatsCallback): void {
  const BATCHES = chunk(ALL_SYMBOLS, 25) // 2 batches: ~25 symbols each

  async function poll(label?: string): Promise<void> {
    let total = 0
    for (const batch of BATCHES) {
      try {
        total += await fetchBatch(batch, onPrice, onStats)
      } catch (err: unknown) {
        console.warn('[Market] Yahoo Finance poll error:', err instanceof Error ? err.message : err)
      }
    }
    if (label) console.log(`[Market] ✅ Yahoo Finance: ${label} (${total} symbols seeded)`)
  }

  // Immediate seed so GBM starts from real prices
  poll('stocks, indices, energy & commodities seeded').catch(() => {})

  // Adaptive polling: faster during market hours
  function scheduleNext(): void {
    const delay = isUSMarketHours() ? 60_000 : 5 * 60_000
    setTimeout(async () => {
      await poll().catch(() => {})
      scheduleNext()
    }, delay)
  }
  scheduleNext()
}
