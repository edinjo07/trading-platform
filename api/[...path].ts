/**
 * api/[...path].ts
 *
 * Vercel serverless catch-all that wraps the Express app.
 * REST endpoints work fully. WebSocket is not available (Vercel limitation) —
 * the frontend falls back to polling /api/markets/tickers automatically.
 */

// _setup MUST be first — sets process.env before config.ts reads it
import './_setup'

import type { IncomingMessage, ServerResponse } from 'http'
import app from '../server/src/app'
import { loadFromDB } from '../server/src/services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from '../server/src/services/tradingEngine'
import { seedInitialPrices } from '../server/src/services/realDataService'
import { injectRealPrice } from '../server/src/services/mockDataService'

let initialized = false
let lastSeed = 0

async function initialize(): Promise<void> {
  // DB load: only once per container lifetime
  if (!initialized) {
    initialized = true
    try {
      await loadFromDB({ users, orders, portfolios, tradeJournal, equityCurve })
    } catch (e) {
      console.error('[Init] DB bootstrap error:', e)
    }
  }
  // Price seed: re-sync from Binance REST on every request, debounced at 5 s.
  // Vercel serverless containers don't run the GBM tick loop, so without this
  // the module carries whatever price it had at module-init (which can be days stale).
  const now = Date.now()
  if (now - lastSeed > 5_000) {
    try {
      await seedInitialPrices(injectRealPrice)
      lastSeed = now
    } catch {
      // non-fatal — serve stale prices
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl: string = (req as any).url ?? '/'

  // Always log the incoming URL so it appears in Vercel function logs
  console.error('[handler] rawUrl:', rawUrl)

  // Diagnostic: GET /api/ping — confirms function is running
  // Match with or without trailing slash / query string
  if (rawUrl === '/api/ping' || rawUrl === '/ping' ||
      rawUrl.startsWith('/api/ping?') || rawUrl.startsWith('/ping?') ||
      rawUrl === '/api/ping/' || rawUrl === '/ping/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, receivedUrl: rawUrl, node: process.version }))
    return
  }

  // Some @vercel/node versions strip the /api prefix from req.url before invoking the handler.
  // Express routes are all mounted at /api/* so we must restore the prefix if it was removed.
  if (!rawUrl.startsWith('/api')) {
    const fixed = '/api' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl)
    ;(req as any).url = fixed
    // Clear Express's cached parsed URL so it re-parses from the updated req.url
    ;(req as any)._parsedUrl = null
    console.error('[handler] fixed url to:', fixed)
  }

  await initialize()
  // Express app is a valid (req, res, next) handler — works as a serverless function
  return new Promise<void>((resolve) => {
    (app as any)(req, res, () => resolve())
    res.on('finish', resolve)
  })
}
