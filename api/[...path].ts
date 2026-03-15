/**
 * api/[...path].ts
 *
 * Vercel serverless catch-all that wraps the Express app.
 * REST endpoints work fully. WebSocket is not available (Vercel limitation) —
 * the frontend falls back to polling /api/markets/tickers automatically.
 */

// ── Production env defaults (used when Vercel dashboard vars are not set) ────
const ENV_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'production',
  JWT_SECRET: 'ZeSEhpkwHrFett5bD2dzp/0bLaPR8YwDCvjjK/Oe4jPQeV0xS19sk+lpExySC/oQHUEN22d7kwmqYfJJBonYmw==',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'https://trading-platform-client.vercel.app',
  SUPABASE_URL: 'https://tkplwifmstnkecevgbyi.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcGx3aWZtc3Rua2VjZXZnYnlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzgwMjAsImV4cCI6MjA4OTExNDAyMH0.6Nr-8Wm2BinIbj_Due97c5jGMGuh2zQH-An-27WP9Lo',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcGx3aWZtc3Rua2VjZXZnYnlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUzODAyMCwiZXhwIjoyMDg5MTE0MDIwfQ.U_9Z7xCrjUxjF47lr9Xhje1CLd_-xIahpyD62yjsdag',
  DATABASE_URL: 'postgres://postgres.tkplwifmstnkecevgbyi:Ku0VMyfTcgPtc4tk@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  TWELVE_DATA_API_KEY: '7d377303fc50432eba0d5931422e9ad2',
}
for (const [key, value] of Object.entries(ENV_DEFAULTS)) {
  if (!process.env[key]) process.env[key] = value
}
// ─────────────────────────────────────────────────────────────────────────────

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
