import { Router, Request, Response } from 'express'
import {
  SYMBOLS,
  generateTicker,
  getAllTickers,
  generateOrderBook,
  generateRecentTrades,
  tickSymbol,
  isMarketOpen,
  getSwapRate,
} from '../services/mockDataService'
import { getCandles } from '../services/candleService'

const router = Router()

/**
 * Sanitize a user-supplied symbol string against prototype pollution.
 * Rejects keys that would access special Object prototype properties and
 * restricts to the characters used by all known trading symbols.
 * Returns the sanitized string, or null if the input is disallowed.
 */
function sanitizeSymbol(raw: string): string | null {
  // Block prototype pollution keys
  if (/^(__proto__|constructor|prototype)$/i.test(raw)) return null
  // Restrict to alphanumeric, forward slash, and hyphen (covers all known symbols)
  if (!/^[A-Za-z0-9/\-]+$/.test(raw)) return null
  return raw
}

// GET /api/markets/symbols?assetClass=stock|crypto|forex
router.get('/symbols', (_req: Request, res: Response) => {
  const { assetClass } = _req.query
  const result = assetClass
    ? SYMBOLS.filter(s => s.assetClass === assetClass)
    : SYMBOLS
  return res.json(result)
})

// GET /api/markets/tickers
// Each poll advances the GBM simulation so prices move between requests
router.get('/tickers', (_req: Request, res: Response) => {
  for (const sym of SYMBOLS) {
    try { tickSymbol(sym.symbol) } catch { /* ignore unknown */ }
  }
  return res.json(getAllTickers())
})

// GET /api/markets/ticker/:symbol
router.get('/ticker/:symbol', (req: Request, res: Response) => {
  const raw = sanitizeSymbol(decodeURIComponent(req.params.symbol))
  if (!raw) return res.status(400).json({ error: 'Invalid symbol' })
  const found = SYMBOLS.find(s => s.symbol === raw)
  if (!found) {
    return res.status(404).json({ error: 'Symbol not found' })
  }
  return res.json(generateTicker(found.symbol))
})

// GET /api/markets/candles/:symbol?interval=1h&limit=200
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  const raw = sanitizeSymbol(decodeURIComponent(req.params.symbol))
  if (!raw) return res.status(400).json({ error: 'Invalid symbol' })
  const found = SYMBOLS.find(s => s.symbol === raw)
  const interval = (req.query.interval as string) || '1h'
  const limit = Math.min(parseInt((req.query.limit as string) || '200', 10), 1000)

  if (!found) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  const candles = await getCandles(found.symbol, interval, limit)
  return res.json(candles)
})

// GET /api/markets/orderbook/:symbol?depth=15
router.get('/orderbook/:symbol', (req: Request, res: Response) => {
  const raw = sanitizeSymbol(decodeURIComponent(req.params.symbol))
  if (!raw) return res.status(400).json({ error: 'Invalid symbol' })
  const found = SYMBOLS.find(s => s.symbol === raw)
  const depth = Math.min(parseInt((req.query.depth as string) || '15', 10), 50)

  if (!found) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  // Tick the symbol so the order book reflects the latest GBM price
  try { tickSymbol(found.symbol) } catch { /* ignore */ }
  return res.json(generateOrderBook(found.symbol, depth))
})

// GET /api/markets/trades/:symbol?count=30
router.get('/trades/:symbol', (req: Request, res: Response) => {
  const raw = sanitizeSymbol(decodeURIComponent(req.params.symbol))
  if (!raw) return res.status(400).json({ error: 'Invalid symbol' })
  const found = SYMBOLS.find(s => s.symbol === raw)
  const count = Math.min(parseInt((req.query.count as string) || '30', 10), 100)

  if (!found) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  try { tickSymbol(found.symbol) } catch { /* ignore */ }
  return res.json(generateRecentTrades(found.symbol, count))
})

// GET /api/markets/hours  - returns open/closed status for every symbol
router.get('/hours', (_req: Request, res: Response) => {
  const result: Record<string, { isOpen: boolean }> = {}
  for (const s of SYMBOLS) result[s.symbol] = { isOpen: isMarketOpen(s.symbol) }
  return res.json(result)
})

// GET /api/markets/swap/:symbol  - returns overnight swap rate for a symbol
router.get('/swap/:symbol', (req: Request, res: Response) => {
  const raw = sanitizeSymbol(decodeURIComponent(req.params.symbol))
  if (!raw) return res.status(400).json({ error: 'Invalid symbol' })
  const found = SYMBOLS.find(s => s.symbol === raw)
  if (!found) return res.status(404).json({ error: 'Symbol not found' })
  const rates = getSwapRate(raw)
  return res.json({ symbol: raw, swapLong: rates.long, swapShort: rates.short })
})

export default router
