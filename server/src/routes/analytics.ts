import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPerformanceStats, getTradeJournal, tradeJournal } from '../services/tradingEngine'
import { dbLoadTradeJournal } from '../services/dbSync'

const router = Router()
router.use(authenticate)

// Shared helper: populate the in-memory journal from DB on a cold-start container
async function ensureJournalLoaded(userId: string): Promise<void> {
  if ((tradeJournal.get(userId) ?? []).length === 0) {
    try {
      const dbTrades = await dbLoadTradeJournal(userId)
      if (dbTrades.length > 0) {
        // dbLoadTradeJournal returns newest-first; restore chronological order for
        // the in-memory journal so getPerformanceStats processes trades correctly.
        tradeJournal.set(userId, [...dbTrades].reverse())
      }
    } catch (e) {
      console.warn('[Analytics] Failed to load trade journal from DB:', e)
    }
  }
}

// GET /api/analytics
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    await ensureJournalLoaded(userId)
    const stats = getPerformanceStats(userId)
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// GET /api/analytics/trades
router.get('/trades', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const limit = parseInt((req.query.limit as string) ?? '100', 10)
    await ensureJournalLoaded(userId)
    const trades = getTradeJournal(userId).slice(0, limit)
    res.json({ success: true, data: trades, total: trades.length })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

export default router
