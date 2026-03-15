import { Router, Request, Response } from 'express'
import { getPortfolio, closePosition } from '../services/tradingEngine'

const router = Router()

// GET /api/positions  — list all open positions for a user
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) ?? 'default'
    const portfolio = getPortfolio(userId)
    res.json({ success: true, data: portfolio.positions })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// DELETE /api/positions/:symbol  — close an open position at market
router.delete('/:symbol', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) ?? 'default'
    const { symbol } = req.params
    closePosition(userId, symbol)
    res.json({ success: true, message: `Position in ${symbol} is being closed at market.` })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message ?? String(err) })
  }
})

export default router
