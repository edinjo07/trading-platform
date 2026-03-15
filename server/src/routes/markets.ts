import { Router, Request, Response } from 'express'
import {
  SYMBOLS,
  generateTicker,
  getAllTickers,
  generateOrderBook,
  generateRecentTrades,
} from '../services/mockDataService'
import { getCandles } from '../services/candleService'

const router = Router()

// GET /api/markets/symbols?assetClass=stock|crypto|forex
router.get('/symbols', (_req: Request, res: Response) => {
  const { assetClass } = _req.query
  const result = assetClass
    ? SYMBOLS.filter(s => s.assetClass === assetClass)
    : SYMBOLS
  return res.json(result)
})

// GET /api/markets/tickers
router.get('/tickers', (_req: Request, res: Response) => {
  return res.json(getAllTickers())
})

// GET /api/markets/ticker/:symbol
router.get('/ticker/:symbol', (req: Request, res: Response) => {
  const symbol = decodeURIComponent(req.params.symbol)
  if (!SYMBOLS.find(s => s.symbol === symbol)) {
    return res.status(404).json({ error: 'Symbol not found' })
  }
  return res.json(generateTicker(symbol))
})

// GET /api/markets/candles/:symbol?interval=1h&limit=200
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  const symbol = decodeURIComponent(req.params.symbol)
  const interval = (req.query.interval as string) || '1h'
  const limit = Math.min(parseInt((req.query.limit as string) || '200', 10), 1000)

  if (!SYMBOLS.find(s => s.symbol === symbol)) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  const candles = await getCandles(symbol, interval, limit)
  return res.json(candles)
})

// GET /api/markets/orderbook/:symbol?depth=15
router.get('/orderbook/:symbol', (req: Request, res: Response) => {
  const symbol = decodeURIComponent(req.params.symbol)
  const depth = Math.min(parseInt((req.query.depth as string) || '15', 10), 50)

  if (!SYMBOLS.find(s => s.symbol === symbol)) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  return res.json(generateOrderBook(symbol, depth))
})

// GET /api/markets/trades/:symbol?count=30
router.get('/trades/:symbol', (req: Request, res: Response) => {
  const symbol = decodeURIComponent(req.params.symbol)
  const count = Math.min(parseInt((req.query.count as string) || '30', 10), 100)

  if (!SYMBOLS.find(s => s.symbol === symbol)) {
    return res.status(404).json({ error: 'Symbol not found' })
  }

  return res.json(generateRecentTrades(symbol, count))
})

export default router
