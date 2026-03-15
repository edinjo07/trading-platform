import { Router, Request, Response } from 'express'
import { getPerformanceStats, getTradeJournal } from '../services/tradingEngine'

const router = Router()

// GET /api/analytics
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) ?? 'default'
    const stats = getPerformanceStats(userId)
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// GET /api/analytics/trades
router.get('/trades', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) ?? 'default'
    const limit = parseInt((req.query.limit as string) ?? '100', 10)
    const trades = getTradeJournal(userId).slice(0, limit)
    res.json({ success: true, data: trades, total: trades.length })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router
