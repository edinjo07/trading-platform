/**
 * realDataService.ts
 *
 * Connects to two live market-data sources and calls onPrice() for every tick:
 *   1. Binance Combined Stream WebSocket  → crypto (free, no key required)
 *   2. Twelve Data WebSocket              → stocks + forex (free plan, API key required)
 *
 * If a connection drops it auto-reconnects with exponential back-off.
 * If TWELVE_DATA_API_KEY is not set the service logs a warning and stocks/forex
 * continue to run on the GBM simulation.
 */

import WebSocket from 'ws'
import { config } from '../config'
import { seedFromCMC, startCMCPolling } from './cmcService'

export type PriceCallback   = (symbol: string, price: number) => void
export type StatsCallback   = (symbol: string, open: number, high: number, low: number, volume: number) => void

// ---------------------------------------------------------------------------
// Binance — crypto mapping
// ---------------------------------------------------------------------------
const BINANCE_STREAM_TO_SYMBOL: Record<string, string> = {
  btcusdt:   'BTCUSD',
  ethusdt:   'ETHUSD',
  solusdt:   'SOLUSD',
  bnbusdt:   'BNBUSD',
  xrpusdt:   'XRPUSD',
  ltcusdt:   'LTCUSD',
  bchusdt:   'BCHUSD',
  dogeusdt:  'DOGEUSD',
  adausdt:   'ADAUSD',
  dotusdt:   'DOTUSD',
  linkusdt:  'LNKUSD',
  avaxusdt:  'AVAXUSD',
  maticusdt: 'MATICUSD',
  xlmusdt:   'XLMUSD',
  xtzusdt:   'XTZUSD',
  uniusdt:   'UNIUSD',
  dashusdt:  'DSHUSD',
}
const BINANCE_STREAMS = Object.keys(BINANCE_STREAM_TO_SYMBOL).map(s => `${s}@ticker`).join('/')
const BINANCE_URL = `wss://stream.binance.com:9443/stream?streams=${BINANCE_STREAMS}`

function startBinanceFeed(onPrice: PriceCallback, retryMs = 3000): void {
  let ws: WebSocket
  let retryDelay = retryMs
  let gaveUp = false

  function connect() {
    if (gaveUp) return
    ws = new WebSocket(BINANCE_URL)

    ws.on('open', () => {
      retryDelay = retryMs
      console.log('[Market] ✅ Binance WebSocket connected — streaming crypto')
    })

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as { stream: string; data: { c?: string } }
        if (!msg?.data?.c) return
        const streamName = msg.stream?.split('@')[0] // e.g. "btcusdt"
        const ourSymbol = BINANCE_STREAM_TO_SYMBOL[streamName]
        const price = parseFloat(msg.data.c)
        if (ourSymbol && price > 0) onPrice(ourSymbol, price)
      } catch {
        // ignore malformed frames
      }
    })

    ws.on('close', () => {
      if (gaveUp) return
      console.warn(`[Market] ⚠️  Binance WebSocket closed — retrying in ${retryDelay / 1000}s`)
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 60_000)
    })

    ws.on('error', (err: Error) => {
      console.error('[Market] Binance WS error:', err.message)
      if (err.message.includes('451')) {
        console.warn('[Market] Binance geo-blocked (HTTP 451) — crypto will use GBM simulation')
        gaveUp = true
      }
      // 'close' fires after 'error', so reconnect is handled there
    })
  }

  connect()
}

// ---------------------------------------------------------------------------
// Twelve Data — stocks + forex
// ---------------------------------------------------------------------------
/**
 * Maps Twelve Data symbol → internal IC Markets symbol.
 * Built programmatically from the asset-class lists below.
 */
const TD_SYMBOL_TO_INTERNAL: Record<string, string> = {}

// ── Stocks (23) — TD symbol matches internal symbol ─────────────────────
const TD_STOCKS = [
  'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META',
  'JPM', 'NFLX', 'COIN', 'AMD', 'DIS',
  'LMT', 'RTX', 'NOC', 'GD', 'BA', 'HII', 'LDOS', 'CACI',
  'XOM', 'CVX', 'COP',
]
TD_STOCKS.forEach(s => { TD_SYMBOL_TO_INTERNAL[s] = s })

// ── Forex (61 pairs) — TD uses 'EUR/USD', internal is 'EURUSD' ─────────
const TD_FOREX = [
  // Majors
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'USD/CAD', 'AUD/USD', 'NZD/USD',
  // Minors
  'AUD/CAD', 'AUD/CHF', 'AUD/JPY', 'AUD/NZD', 'CAD/CHF', 'CAD/JPY', 'CHF/JPY',
  'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/GBP', 'EUR/JPY', 'EUR/NZD',
  'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY', 'GBP/NZD',
  'NZD/CAD', 'NZD/CHF', 'NZD/JPY',
  // Exotics
  'EUR/HUF', 'EUR/NOK', 'EUR/PLN', 'EUR/SEK', 'EUR/ZAR', 'EUR/MXN', 'EUR/TRY',
  'GBP/NOK', 'GBP/PLN', 'GBP/SEK', 'GBP/ZAR',
  'USD/CNH', 'USD/CZK', 'USD/DKK', 'USD/HKD', 'USD/HUF', 'USD/ILS', 'USD/MXN',
  'USD/NOK', 'USD/PLN', 'USD/SEK', 'USD/SGD', 'USD/THB', 'USD/ZAR', 'USD/TRY',
  'NOK/JPY', 'SGD/JPY',
  'AUD/MXN', 'AUD/SGD', 'EUR/SGD', 'GBP/SGD', 'NZD/SGD', 'EUR/CZK',
]
TD_FOREX.forEach(p => { TD_SYMBOL_TO_INTERNAL[p] = p.replace('/', '') })

// ── Precious Metals (TD treats these as forex-style pairs) ──────────────
;['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD'].forEach(m => {
  TD_SYMBOL_TO_INTERNAL[m] = m.replace('/', '')
})

// ── Indices — TD symbol differs from internal IC Markets symbol ─────────
const TD_INDEX_ENTRIES: [string, string][] = [
  ['SPX',      'US500'],
  ['NDX',      'USTEC'],
  ['DJI',      'US30'],
  ['UKX',      'UK100'],
  ['GDAXI',    'DE40'],
  ['FCHI',     'F40'],
  ['N225',     'JP225'],
  ['AXJO',     'AUS200'],
  ['STOXX50E', 'STOXX50'],
  ['HSI',      'HK50'],
  ['IBEX',     'ES35'],
  ['FTSEMIB',  'IT40'],
  ['AEX',      'NL25'],
  ['SSMI',     'CH20'],
  ['STI',      'SING'],
  ['NSEI',     'IN50'],
  ['DXY',      'DX'],
  ['VIX',      'VIX'],
]
TD_INDEX_ENTRIES.forEach(([td, ic]) => { TD_SYMBOL_TO_INTERNAL[td] = ic })

// ── Energy commodities ──────────────────────────────────────────────────
const TD_ENERGY_ENTRIES: [string, string][] = [
  ['CL', 'WTI'],
  ['BZ', 'BRENT'],
  ['NG', 'NGAS'],
  ['HO', 'HO'],
]
TD_ENERGY_ENTRIES.forEach(([td, ic]) => { TD_SYMBOL_TO_INTERNAL[td] = ic })

// ── Agricultural & soft commodities (CME/ICE futures symbols) ───────────
const TD_AGRI_ENTRIES: [string, string][] = [
  ['CC', 'COCOA'],
  ['KC', 'COFFEE'],
  ['ZC', 'CORN'],
  ['CT', 'COTTON'],
  ['OJ', 'OJ'],
  ['ZS', 'SOYBEAN'],
  ['SB', 'SUGAR'],
  ['ZW', 'WHEAT'],
  ['HG', 'COPPER'],
]
TD_AGRI_ENTRIES.forEach(([td, ic]) => { TD_SYMBOL_TO_INTERNAL[td] = ic })

// All symbols to subscribe to on Twelve Data WebSocket
const TD_SYMBOLS = Object.keys(TD_SYMBOL_TO_INTERNAL)
const TD_WS_BASE = 'wss://ws.twelvedata.com/v1/quotes/price'

function startTwelveDataFeed(onPrice: PriceCallback, retryMs = 5000): void {
  const apiKey = config.twelveDataApiKey
  if (!apiKey) {
    console.warn('[Market] ⚠️  TWELVE_DATA_API_KEY not set — stocks & forex will use GBM simulation')
    console.warn('[Market]    Add TWELVE_DATA_API_KEY=<key> to server/.env (get a free key at twelvedata.com)')
    return
  }

  let ws: WebSocket
  let retryDelay = retryMs
  let heartbeatTimer: NodeJS.Timeout | null = null

  function clearHB() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  }

  function connect() {
    ws = new WebSocket(`${TD_WS_BASE}?apikey=${apiKey}`)

    ws.on('open', () => {
      retryDelay = retryMs
      console.log('[Market] ✅ Twelve Data WebSocket connected — streaming stocks & forex')

      // Subscribe to all symbols
      ws.send(JSON.stringify({
        action: 'subscribe',
        params: { symbols: TD_SYMBOLS.join(',') },
      }))

      // Heartbeat ping every 30 s to keep connection alive
      clearHB()
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping()
      }, 30_000)
    })

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          event?: string
          symbol?: string
          price?: number | string
          status?: string
          message?: string
        }

        if (msg.event === 'price' && msg.symbol && msg.price) {
          const price = typeof msg.price === 'string' ? parseFloat(msg.price) : msg.price
          const ourSymbol = TD_SYMBOL_TO_INTERNAL[msg.symbol]
          if (ourSymbol && price > 0) onPrice(ourSymbol, price)
        } else if (msg.event === 'subscribe-status') {
          console.log(`[Market] Twelve Data subscription: ${msg.status ?? ''} — ${msg.message ?? ''}`)
        }
      } catch {
        // ignore malformed frames
      }
    })

    ws.on('close', () => {
      clearHB()
      console.warn(`[Market] ⚠️  Twelve Data WebSocket closed — retrying in ${retryDelay / 1000}s`)
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 60_000)
    })

    ws.on('error', (err: Error) => {
      console.error('[Market] Twelve Data WS error:', err.message)
    })
  }

  connect()
}

// ---------------------------------------------------------------------------
// Seed initial prices from Binance REST API so the GBM simulation starts
// at the real current market price instead of hardcoded basePrice values.
// ---------------------------------------------------------------------------
const BINANCE_SEED_SYMBOLS: Record<string, string> = {
  BTCUSDT:   'BTCUSD',
  ETHUSDT:   'ETHUSD',
  SOLUSDT:   'SOLUSD',
  BNBUSDT:   'BNBUSD',
  XRPUSDT:   'XRPUSD',
  LTCUSDT:   'LTCUSD',
  BCHUSDT:   'BCHUSD',
  DOGEUSDT:  'DOGEUSD',
  ADAUSDT:   'ADAUSD',
  DOTUSDT:   'DOTUSD',
  LINKUSDT:  'LNKUSD',
  AVAXUSDT:  'AVAXUSD',
  MATICUSDT: 'MATICUSD',
  XLMUSDT:   'XLMUSD',
  XTZUSDT:   'XTZUSD',
  UNIUSDT:   'UNIUSD',
  DASHUSDT:  'DSHUSD',
}

// CoinGecko id → our symbol (full coverage for all 17+ crypto)
const COINGECKO_TO_SYMBOL: Record<string, string> = {
  bitcoin:      'BTCUSD',
  ethereum:     'ETHUSD',
  solana:       'SOLUSD',
  binancecoin:  'BNBUSD',
  ripple:       'XRPUSD',
  litecoin:     'LTCUSD',
  'bitcoin-cash': 'BCHUSD',
  dogecoin:     'DOGEUSD',
  cardano:      'ADAUSD',
  polkadot:     'DOTUSD',
  chainlink:    'LNKUSD',
  'avalanche-2': 'AVAXUSD',
  'matic-network': 'MATICUSD',
  stellar:      'XLMUSD',
  tezos:        'XTZUSD',
  uniswap:      'UNIUSD',
  dash:         'DSHUSD',
}

// CoinGecko /coins/markets response shape
interface CoinGeckoMarket {
  id: string
  current_price: number
  high_24h: number
  low_24h: number
  price_change_percentage_24h: number
  total_volume: number
}

async function seedFromCoinGecko(
  onPrice: PriceCallback,
  onStats?: StatsCallback,
): Promise<void> {
  try {
    const ids = Object.keys(COINGECKO_TO_SYMBOL).join(',')
    // /coins/markets gives current price + 24h high/low/vol/change in one call
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!resp.ok) {
      console.warn('[Market] CoinGecko seed HTTP', resp.status)
      return
    }
    const data = await resp.json() as CoinGeckoMarket[]
    for (const item of data) {
      const ourSym = COINGECKO_TO_SYMBOL[item.id]
      if (!ourSym || !(item.current_price > 0)) continue
      onPrice(ourSym, item.current_price)
      if (onStats) {
        const pct = item.price_change_percentage_24h ?? 0
        const openPrice = pct !== 0
          ? item.current_price / (1 + pct / 100)
          : item.current_price
        onStats(ourSym, openPrice, item.high_24h, item.low_24h, item.total_volume)
      }
      console.log(
        `[Market] 🌱 Seeded ${ourSym} = $${item.current_price}` +
        ` (24h: ${(item.price_change_percentage_24h ?? 0).toFixed(2)}%, CoinGecko)`,
      )
    }
  } catch (err: unknown) {
    console.warn('[Market] CoinGecko seed failed:', err instanceof Error ? err.message : err)
  }
}

export async function seedInitialPrices(
  onPrice: PriceCallback,
  onStats?: StatsCallback,
): Promise<void> {
  // 1. CoinMarketCap — authenticated, covers all 20+ crypto, most reliable
  if (config.cmcApiKey) {
    await seedFromCMC(onPrice, onStats)
    return
  }

  // 2. Binance REST (free, fast; geo-blocked in some regions)
  try {
    // Use the 24-hour ticker endpoint so we get the real openPrice, highPrice,
    // lowPrice and volume — not just the current price. This gives an accurate
    // 24-hour change % from the very first cold start.
    const symbolsJson = JSON.stringify(Object.keys(BINANCE_SEED_SYMBOLS))
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!resp.ok) {
      console.warn('[Market] Binance price seed HTTP', resp.status, '— falling back to CoinGecko')
      // Always fall back to CoinGecko on any Binance failure (geo-block, rate limit, etc.)
      await seedFromCoinGecko(onPrice, onStats)
      return
    }
    const data = await resp.json() as Array<{
      symbol: string
      lastPrice: string
      openPrice: string
      highPrice: string
      lowPrice: string
      volume: string
    }>
    if (!Array.isArray(data)) return
    for (const item of data) {
      const ourSym = BINANCE_SEED_SYMBOLS[item.symbol]
      const price = parseFloat(item.lastPrice)
      if (ourSym && price > 0) {
        onPrice(ourSym, price)
        console.log(`[Market] 🌱 Seeded ${ourSym} = $${price}`)
        if (onStats) {
          onStats(
            ourSym,
            parseFloat(item.openPrice),
            parseFloat(item.highPrice),
            parseFloat(item.lowPrice),
            parseFloat(item.volume),
          )
        }
      }
    }
  } catch (err: unknown) {
    console.warn('[Market] Could not seed initial prices:', err instanceof Error ? err.message : err)
  }
}

// ---------------------------------------------------------------------------
// Continuous REST polling fallback
// ---------------------------------------------------------------------------
// When Binance WebSocket is geo-blocked or fails, this polls CoinGecko every
// 15 s so crypto prices stay accurate.  Also polls Binance REST as primary
// (faster updates, falls back to CoinGecko on 451/403).
// ---------------------------------------------------------------------------
let restPollRunning = false

function startRestPolling(onPrice: PriceCallback, onStats?: StatsCallback): void {
  if (restPollRunning) return
  restPollRunning = true
  console.log('[Market] 🔄 Starting REST polling fallback (every 10 s)')

  async function pollBinanceRest(): Promise<boolean> {
    try {
      const symbolsJson = JSON.stringify(Object.keys(BINANCE_SEED_SYMBOLS))
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`
      const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) })
      if (!resp.ok) return false
      const data = await resp.json() as Array<{
        symbol: string; lastPrice: string
        openPrice: string; highPrice: string; lowPrice: string; volume: string
      }>
      if (!Array.isArray(data)) return false
      for (const item of data) {
        const ourSym = BINANCE_SEED_SYMBOLS[item.symbol]
        const price = parseFloat(item.lastPrice)
        if (ourSym && price > 0) {
          onPrice(ourSym, price)
          if (onStats) {
            onStats(ourSym, parseFloat(item.openPrice), parseFloat(item.highPrice),
              parseFloat(item.lowPrice), parseFloat(item.volume))
          }
        }
      }
      return true
    } catch { return false }
  }

  async function pollCoinGecko(): Promise<void> {
    try {
      const ids = Object.keys(COINGECKO_TO_SYMBOL).join(',')
      // Use /coins/markets to also get 24h open/high/low/vol so change % stays accurate
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1`
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!resp.ok) return
      const data = await resp.json() as CoinGeckoMarket[]
      for (const item of data) {
        const ourSym = COINGECKO_TO_SYMBOL[item.id]
        if (!ourSym || !(item.current_price > 0)) continue
        onPrice(ourSym, item.current_price)
        if (onStats) {
          const pct = item.price_change_percentage_24h ?? 0
          const openPrice = pct !== 0
            ? item.current_price / (1 + pct / 100)
            : item.current_price
          onStats(ourSym, openPrice, item.high_24h, item.low_24h, item.total_volume)
        }
      }
    } catch { /* silent */ }
  }

  async function poll() {
    const binanceOk = await pollBinanceRest()
    if (!binanceOk) await pollCoinGecko()
  }

  // First poll immediately, then every 10 s (reduced from 15 s to limit drift between polls)
  poll().catch(() => {})
  setInterval(() => { poll().catch(() => {}) }, 10_000)
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export function startRealDataFeeds(onPrice: PriceCallback, onStats?: StatsCallback): void {
  // Seed real current prices immediately (async, before WS connects)
  seedInitialPrices(onPrice, onStats).catch(() => {})
  startBinanceFeed(onPrice)
  startTwelveDataFeed(onPrice)
  // CMC polling: 60-second refresh for all crypto (no-op if key not set)
  startCMCPolling(onPrice, onStats)
  // Always start REST polling as a safety net — if WebSocket is delivering
  // data the REST prices simply reinforce the anchor; if WS is down the REST
  // poll keeps prices accurate.
  startRestPolling(onPrice, onStats)
}
