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
import { parse as parseQs } from 'querystring'
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

/**
 * Resolve the effective URL for Express from the Vercel runtime's req.
 *
 * Vercel's @vercel/node runtime can pass the path in THREE different ways
 * depending on the runtime version:
 *
 *   A) req.url = '/api/markets/tickers'          (full path — ideal)
 *   B) req.url = '/markets/tickers'              (api prefix stripped)
 *   C) req.url = '/?path=markets&path=tickers'   (path as query params — legacy runtime)
 *
 * We normalise all three to '/api/<rest>?<original-qs>'
 */
function resolveUrl(req: IncomingMessage): string {
  const raw: string = (req as any).url ?? '/'

  // ── Case A & B: path is encoded in the URL pathname ─────────────────────
  // Extract just the pathname (before '?')
  const qMark = raw.indexOf('?')
  const rawPath = qMark === -1 ? raw : raw.slice(0, qMark)
  const rawQs   = qMark === -1 ? '' : raw.slice(qMark + 1)

  if (rawPath !== '/' && rawPath !== '') {
    // Already has a real path segment — just ensure /api prefix
    if (rawPath.startsWith('/api')) return raw          // Case A — correct already
    return '/api' + (rawPath.startsWith('/') ? raw : '/' + raw)  // Case B — restore prefix
  }

  // ── Case C: path[] encoded as query-string params by Vercel ─────────────
  // e.g. req.url = '/?path=markets&path=tickers&depth=15'
  if (rawQs) {
    const parsed = parseQs(rawQs)
    const pathSegments = parsed['path']
    if (pathSegments) {
      const segments = Array.isArray(pathSegments) ? pathSegments : [pathSegments]
      // Remaining query params (excluding 'path')
      const rest = Object.entries(parsed)
        .filter(([k]) => k !== 'path')
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      return '/api/' + segments.join('/') + (rest ? '?' + rest : '')
    }
  }

  // Fallback: return as-is (Express will 404 gracefully)
  return raw
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const effectiveUrl = resolveUrl(req)
  console.error('[handler] rawUrl:', (req as any).url, '→ effective:', effectiveUrl)

  // Diagnostic: GET /api/ping — confirms function is deployed and running
  if (effectiveUrl === '/api/ping' || effectiveUrl.startsWith('/api/ping?')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      raw: (req as any).url,
      effective: effectiveUrl,
      node: process.version,
      vercel: process.env.VERCEL,
    }))
    return
  }

  // Apply resolved URL so Express sees the correct path
  ;(req as any).url         = effectiveUrl
  ;(req as any).originalUrl = effectiveUrl   // Express reads this for req.originalUrl
  ;(req as any)._parsedUrl         = null    // clear parseurl cache
  ;(req as any)._parsedOriginalUrl = null

  await initialize()

  return new Promise<void>((resolve) => {
    (app as any)(req, res, () => resolve())
    res.on('finish', resolve)
  })
}
