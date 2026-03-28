/**
 * api/index.ts
 *
 * Vercel serverless function - ALL /api/* requests are rewritten here by
 * vercel.json: { "source": "/api/(.*)", "destination": "/api/index" }
 * Vercel preserves the original req.url, so Express sees the correct path.
 * WebSocket is unavailable on Vercel; the frontend falls back to REST polling.
 */

// _setup MUST be first - sets process.env before config.ts reads it
import './_setup'

import type { IncomingMessage, ServerResponse } from 'http'
import { parse as parseQs } from 'querystring'
import app from '../server/src/app'
import { loadFromDB } from '../server/src/services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from '../server/src/services/tradingEngine'
import { seedInitialPrices } from '../server/src/services/realDataService'
import { injectRealPrice, inject24hStats } from '../server/src/services/mockDataService'

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
      await seedInitialPrices(injectRealPrice, inject24hStats)
      lastSeed = now
    } catch {
      // non-fatal - serve stale prices
    }
  }
}

/**
 * Resolve the effective URL for Express from the Vercel runtime's req.
 *
 * With the vercel.json rewrite "/api/(.*)" → "/api/index", Vercel preserves
 * the original request URL in req.url (e.g. "/api/markets/tickers").
 * This function handles the rare legacy case where Vercel encodes path
 * segments as query params (?path=markets&path=tickers).
 */
function resolveUrl(req: IncomingMessage): string {
  const raw: string = (req as any).url ?? '/'

  // Check Vercel-forwarded original URL headers first (most reliable)
  const forwarded = (req as any).headers?.['x-matched-path']
    ?? (req as any).headers?.['x-original-url']
    ?? (req as any).headers?.['x-forwarded-url']
  if (typeof forwarded === 'string' && forwarded.startsWith('/api/') && !forwarded.startsWith('/api/index')) {
    return forwarded
  }

  const qMark = raw.indexOf('?')
  const rawPath = qMark === -1 ? raw : raw.slice(0, qMark)
  const rawQs   = qMark === -1 ? '' : raw.slice(qMark + 1)

  // Normal case: path is properly encoded in the URL
  if (rawPath !== '/' && rawPath !== '' && rawPath !== '/api/index') {
    if (rawPath.startsWith('/api')) return raw
    return '/api' + (rawPath.startsWith('/') ? raw : '/' + raw)
  }

  // Legacy Vercel runtime: path encoded as query params
  // e.g. req.url = '/?path=markets&path=tickers&interval=1h'
  if (rawQs) {
    const parsed = parseQs(rawQs)
    const pathSegments = parsed['path']
    if (pathSegments) {
      const segments = Array.isArray(pathSegments) ? pathSegments : [pathSegments]
      const rest = Object.entries(parsed)
        .filter(([k]) => k !== 'path')
        .map(([k, v]) => `${encodeURIComponent(k)}=${v}`)
        .join('&')
      return '/api/' + segments.join('/') + (rest ? '?' + rest : '')
    }
  }

  return raw
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const effectiveUrl = resolveUrl(req)
  console.error('[handler] rawUrl:', (req as any).url, '→ effective:', effectiveUrl)

  // Diagnostic: GET /api/ping - confirms function is deployed and running
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
