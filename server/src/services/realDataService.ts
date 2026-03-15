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

export type PriceCallback = (symbol: string, price: number) => void

// ---------------------------------------------------------------------------
// Binance — crypto mapping
// ---------------------------------------------------------------------------
const BINANCE_STREAM_TO_SYMBOL: Record<string, string> = {
  btcusdt: 'BTC/USDT',
  ethusdt: 'ETH/USDT',
  solusdt: 'SOL/USDT',
  bnbusdt: 'BNB/USDT',
  xrpusdt: 'XRP/USDT',
}
const BINANCE_STREAMS = Object.keys(BINANCE_STREAM_TO_SYMBOL).map(s => `${s}@ticker`).join('/')
const BINANCE_URL = `wss://stream.binance.com:9443/stream?streams=${BINANCE_STREAMS}`

function startBinanceFeed(onPrice: PriceCallback, retryMs = 3000): void {
  let ws: WebSocket
  let retryDelay = retryMs

  function connect() {
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
      console.warn(`[Market] ⚠️  Binance WebSocket closed — retrying in ${retryDelay / 1000}s`)
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 60_000)
    })

    ws.on('error', (err: Error) => {
      console.error('[Market] Binance WS error:', err.message)
      // 'close' fires after 'error', so reconnect is handled there
    })
  }

  connect()
}

// ---------------------------------------------------------------------------
// Twelve Data — stocks + forex
// ---------------------------------------------------------------------------
const TD_SYMBOLS = [
  // Stocks
  'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META',
  // Forex — Twelve Data accepts EUR/USD notation directly
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
]
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
          if (price > 0) onPrice(msg.symbol, price)
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
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  SOLUSDT: 'SOL/USDT',
  BNBUSDT: 'BNB/USDT',
  XRPUSDT: 'XRP/USDT',
}

export async function seedInitialPrices(onPrice: PriceCallback): Promise<void> {
  try {
    const symbols = Object.keys(BINANCE_SEED_SYMBOLS).join(',')
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(Object.keys(BINANCE_SEED_SYMBOLS)))}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!resp.ok) {
      console.warn('[Market] Binance price seed HTTP', resp.status)
      return
    }
    const data = await resp.json() as Array<{ symbol: string; price: string }>
    if (!Array.isArray(data)) return
    for (const item of data) {
      const ourSym = BINANCE_SEED_SYMBOLS[item.symbol]
      const price = parseFloat(item.price)
      if (ourSym && price > 0) {
        onPrice(ourSym, price)
        console.log(`[Market] 🌱 Seeded ${ourSym} = $${price}`)
      }
    }
  } catch (err: any) {
    console.warn('[Market] Could not seed initial prices:', err?.message ?? err)
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export function startRealDataFeeds(onPrice: PriceCallback): void {
  // Seed real current prices immediately (async, before WS connects)
  seedInitialPrices(onPrice).catch(() => {})
  startBinanceFeed(onPrice)
  startTwelveDataFeed(onPrice)
}
