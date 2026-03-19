import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, closePosition, executeOrder, portfolios, orders, tradeJournal, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadPortfolio, dbLoadTradeJournal, dbSaveOrder, dbSavePortfolio, dbSaveTradeRecord, dbEnsureUser } from '../services/dbSync'

const router = Router()
router.use(authenticate)

// GET /api/positions  — list all open positions for the authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  try {
    try { await dbEnsureUser(userId, req.user!.email) } catch { /* non-fatal */ }
    const dbPortfolio = await dbLoadPortfolio(userId)
    if (dbPortfolio) {
      portfolios.set(userId, dbPortfolio)
      return res.json({ success: true, data: refreshPortfolio(dbPortfolio).positions })
    }
  } catch { /* fall through to in-memory */ }
  const portfolio = getPortfolio(userId)
  res.json({ success: true, data: portfolio.positions })
})

// DELETE /api/positions/:symbol  — close an open position at market
router.delete('/:symbol', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const { symbol } = req.params
  try {
    // Always reload from DB first so in-memory has the current position
    // even after a container restart
    try {
      await dbEnsureUser(userId, req.user!.email)
      const dbPortfolio = await dbLoadPortfolio(userId)
      if (dbPortfolio) portfolios.set(userId, dbPortfolio)
      // Also restore trade journal so close-trade records are appended correctly
      if ((tradeJournal.get(userId) ?? []).length === 0) {
        const dbJournal = await dbLoadTradeJournal(userId)
        if (dbJournal.length > 0) tradeJournal.set(userId, [...dbJournal].reverse())
      }
    } catch { /* non-fatal — proceed with whatever is in memory */ }

    const order = closePosition(userId, symbol)

    // Execute the sell immediately (closePosition only creates the order;
    // without this the position stays open until the tick loop fires it)
    executeOrder(order.id)

    // Now the sell has filled — grab the fresh order, portfolio, and journal states
    const filledOrder = orders.get(order.id) ?? order
    const portfolio   = portfolios.get(userId)
    const journal     = tradeJournal.get(userId) ?? []

    // Find the trade record that was just closed by executeOrder.
    // The journal entry for a long has orderId = opening buy order id; after close,
    // executeOrder sets closedAt on it.  Grab the most recently-closed entry.
    const justClosed = [...journal].reverse().find(t => t.symbol === symbol && t.closedAt)

    const saves: Promise<void>[] = [
      dbSaveOrder(filledOrder).catch((e: unknown) => console.error('[Positions] save order failed:', e)),
      ...(justClosed
        ? [dbSaveTradeRecord(justClosed).catch((e: unknown) => console.error('[Positions] save trade record failed:', e))]
        : []),
    ]
    if (portfolio) {
      saves.push(dbSavePortfolio(userId, portfolio).catch((e: unknown) => console.error('[Positions] save portfolio failed:', e)))
    }
    await Promise.all(saves)

    res.json({ success: true, message: `Position in ${symbol} is being closed at market.` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ success: false, error: msg })
  }
})

export default router
