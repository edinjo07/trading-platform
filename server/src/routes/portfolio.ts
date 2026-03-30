import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, portfolios, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadPortfolio, dbLoadOrders, dbEnsureUser, dbSavePortfolio, rebuildPositionsFromOrders } from '../services/dbSync'
import type { Portfolio } from '../types'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
// ─── Design rule ────────────────────────────────────────────────────────────
// Positions are ALWAYS rebuilt from the orders table rather than trusting the
// JSONB positions blob.  The blob may have been written by older code that did
// not persist leverage/margin on positions, which causes phantom equity
// inflation (posMargin falls back to full notional when these fields are absent).
//
// Cash balance, realised P&L, peak equity and drawdown ARE read from the DB
// because they are updated atomically after each order fill.
//
// Flow per request:
//   1. Ensure user FK row exists (no-op if already there).
//   2. Load portfolio financials + order history in parallel.
//   3. Rebuild positions from orders (guarantees leverage+margin accuracy).
//   4. Compose portfolio: DB financials + rebuilt positions.
//   5. refreshPortfolio → live prices + correct equity formula.
//   6. Persist back to DB if equity or position count changed.
//   7. Return.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  try {
    try { await dbEnsureUser(userId, req.user!.email) } catch { /* non-fatal on GET */ }

    // Load financials and order history in parallel.
    const [dbPortfolio, allOrders] = await Promise.all([
      dbLoadPortfolio(userId),
      dbLoadOrders(userId),
    ])

    // Rebuild positions from orders — the only source that guarantees the
    // leverage and margin fields are present and correct.
    const rebuiltPositions = rebuildPositionsFromOrders(allOrders)

    let portfolio: Portfolio
    if (dbPortfolio) {
      // Use DB for cash / P&L fields; replace positions with the order-derived set.
      // Also clear a potentially-inflated peakEquity: if it is more than 50 %
      // above cash balance AND we have positions, it was probably written by the
      // old buggy equity formula and will produce a nonsensical drawdown figure.
      const suspectPeak =
        dbPortfolio.peakEquity != null &&
        dbPortfolio.peakEquity > dbPortfolio.cashBalance * 1.5 + 500

      portfolio = {
        ...dbPortfolio,
        positions:   rebuiltPositions,
        peakEquity:  suspectPeak ? undefined : dbPortfolio.peakEquity,
        drawdown:    suspectPeak ? 0         : dbPortfolio.drawdown,
      }
    } else {
      // Genuine new user — start from the $100 k in-memory default.
      portfolio = { ...getPortfolio(userId), positions: rebuiltPositions }
    }

    // Sync warm-cache so in-process order creation uses the real balance.
    portfolios.set(userId, portfolio)

    // Capture equity BEFORE refreshPortfolio mutates the object in-place.
    const storedEquity    = dbPortfolio?.totalEquity ?? 0
    const storedPosCount  = Array.isArray(dbPortfolio?.positions)
      ? (dbPortfolio!.positions as unknown[]).length : 0
    const fresh = refreshPortfolio(portfolio)

    // Write back whenever equity or position count changed (self-healing).
    if (
      Math.abs(storedEquity - fresh.totalEquity) > 0.01 ||
      storedPosCount !== fresh.positions.length
    ) {
      dbSavePortfolio(userId, fresh).catch((e: unknown) =>
        console.error('[Portfolio] save failed:', e)
      )
    }

    return res.json(fresh)

  } catch (err) {
    // DB unreachable — serve in-memory so client remains usable.
    console.error('[Portfolio] DB error - serving in-memory fallback:', err)
    return res.json(refreshPortfolio(getPortfolio(userId)))
  }
})

export default router
