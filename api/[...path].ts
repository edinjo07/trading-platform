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
  const now = Date.now()
  // Re-seed prices every 60 s so they don't go stale on warm containers
  if (!initialized || now - lastSeed > 60_000) {
    if (!initialized) {
      initialized = true
      try {
        await loadFromDB({ users, orders, portfolios, tradeJournal, equityCurve })
      } catch (e) {
        console.error('[Init] DB bootstrap error:', e)
      }
    }
    try {
      await seedInitialPrices(injectRealPrice)
      lastSeed = Date.now()
    } catch {
      // non-fatal — serve stale prices
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await initialize()
  // Express app is a valid (req, res, next) handler — works as a serverless function
  return new Promise<void>((resolve) => {
    (app as any)(req, res, () => resolve())
    res.on('finish', resolve)
  })
}
