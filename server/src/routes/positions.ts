import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, closePosition, executeOrder, portfolios, orders, tradeJournal, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadOrders, dbLoadTradeJournal, dbSaveOrder, dbSavePortfolio, dbSaveTradeRecord, dbEnsureUser, recalculateFromOrders } from '../services/dbSync'
import type { AccountMode, Portfolio } from '../types'

const router = Router()
router.use(authenticate)

// GET /api/positions  - list all open positions for the authenticated user
// Mirrors portfolio.ts: always recompute from the orders table so positions
// are consistent even after a server restart or if bots traded offline.
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const accountMode: AccountMode = req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
  try {
    try { await dbEnsureUser(userId, req.user!.email) } catch { /* non-fatal */ }
    const allOrders = await dbLoadOrders(userId, accountMode)
    const { cashBalance, positions, realizedPnl } = recalculateFromOrders(allOrders)
    const portfolio: Portfolio = {
      userId, cashBalance, totalMarketValue: 0, totalEquity: cashBalance,
      unrealizedPnl: 0, realizedPnl, positions,
    }
    portfolios.set(userId, portfolio)
    return res.json({ success: true, data: refreshPortfolio(portfolio).positions })
  } catch { /* fall through to in-memory */ }
  const portfolio = getPortfolio(userId)
  res.json({ success: true, data: portfolio.positions })
})

// DELETE /api/positions/:symbol  - close an open position at market
router.delete('/:symbol', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const accountMode: AccountMode = req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
  const { symbol } = req.params
  try {
    // Rebuild portfolio from order history so positions/leverage are always
    // correct, even after a restart or when bots have been trading.
    try {
      await dbEnsureUser(userId, req.user!.email)
      const allOrders = await dbLoadOrders(userId, accountMode)
      const { cashBalance, positions, realizedPnl } = recalculateFromOrders(allOrders)
      portfolios.set(userId, {
        userId, cashBalance, totalMarketValue: 0, totalEquity: cashBalance,
        unrealizedPnl: 0, realizedPnl, positions,
      } as Portfolio)
      // Restore trade journal so executeOrder can close the correct open entry.
      if ((tradeJournal.get(userId) ?? []).length === 0) {
        const dbJournal = await dbLoadTradeJournal(userId)
        if (dbJournal.length > 0) tradeJournal.set(userId, [...dbJournal].reverse())
      }
    } catch { /* non-fatal - proceed with whatever is in memory */ }

    const order = closePosition(userId, symbol)

    // Execute the sell immediately (closePosition only creates the order;
    // without this the position stays open until the tick loop fires it)
    executeOrder(order.id)

    // Now the sell has filled - grab the fresh order, portfolio, and journal states
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
      saves.push(dbSavePortfolio(userId, portfolio, accountMode).catch((e: unknown) => console.error('[Positions] save portfolio failed:', e)))
    }
    await Promise.all(saves)

    res.json({ success: true, message: `Position in ${symbol} is being closed at market.` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(400).json({ success: false, error: msg })
  }
})

export default router
