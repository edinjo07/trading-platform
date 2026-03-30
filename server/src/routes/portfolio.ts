import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { portfolios, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadOrders, dbEnsureUser, dbSavePortfolio, recalculateFromOrders } from '../services/dbSync'
import type { Portfolio } from '../types'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio is computed ENTIRELY from the orders table on every request.
// No stale positions JSONB or cashBalance from the portfolios table is used.
//
// Why: the DB portfolios row may have been written by older code that:
//   - omitted leverage/margin on the positions JSONB blob, causing posMargin to
//     fall back to full notional (inflating equity for leveraged trades), OR
//   - stored a totalEquity that was already inflated.
//
// recalculateFromOrders() replays every filled order from a $100 k starting
// balance to produce the ground-truth cashBalance, open positions, and
// realised P&L — completely deterministically.
//
// The result is saved back to the DB so that:
//   - orders.ts pre-flight balance checks see the real cash figure, and
//   - subsequent requests have a warm DB row (latency optimisation only;
//     this route never reads it back).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  try {
    // Best-effort FK guard — non-fatal if DB is slow/unreachable.
    try { await dbEnsureUser(userId, req.user!.email) } catch { /* ok */ }

    // Load every order for this user.
    const allOrders = await dbLoadOrders(userId)

    // Replay orders → ground-truth cash, positions, realised P&L.
    const { cashBalance, positions, realizedPnl } = recalculateFromOrders(allOrders)

    const portfolio: Portfolio = {
      userId,
      cashBalance,
      totalMarketValue: 0,   // refreshPortfolio fills in
      totalEquity:      cashBalance,
      unrealizedPnl:    0,
      realizedPnl,
      positions,
    }

    // Warm the in-process cache so order pre-flight checks use the real balance.
    portfolios.set(userId, portfolio)

    // Add live prices and correct equity formula.
    const fresh = refreshPortfolio(portfolio)

    // Persist back to DB (fire-and-forget — latency optimisation only).
    dbSavePortfolio(userId, fresh).catch((e: unknown) =>
      console.error('[Portfolio] save failed:', e)
    )

    return res.json(fresh)

  } catch (err) {
    console.error('[Portfolio] error — serving in-memory fallback:', err)
    // DB unreachable: serve whatever the in-memory engine has for this user.
    const fallback = portfolios.get(userId) ?? {
      userId, cashBalance: 100_000, totalMarketValue: 0, totalEquity: 100_000,
      unrealizedPnl: 0, realizedPnl: 0, positions: [],
    }
    return res.json(refreshPortfolio(fallback as Portfolio))
  }
})

export default router

export default router
