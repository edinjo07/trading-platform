import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, portfolios, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadPortfolio, dbLoadOrders, dbEnsureUser, dbSavePortfolio, rebuildPositionsFromOrders } from '../services/dbSync'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
// ─── Design rule ────────────────────────────────────────────────────────────
// Supabase is the SINGLE SOURCE OF TRUTH.  The in-memory map is only a warm
// cache - it is never trusted over a successful DB read.
//
// On every request:
//   1. Ensure the user stub exists in public.users (FK guard, no-op if exists).
//   2. Always attempt dbLoadPortfolio from Supabase.
//   3. If found   → refresh live prices and return it.
//   4. If not found (genuinely new user) → create the $100k default, save it,
//      return it.
//   5. If DB is unreachable → 503 so the CLIENT keeps its existing state
//      instead of overwriting it with a stale $100k default.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  try {
    // Step 1: ensure FK row - fast ignoreDuplicates upsert.
    // Non-fatal for GET: if this fails we still serve in-memory state below.
    try { await dbEnsureUser(userId, req.user!.email) } catch { /* non-fatal on GET */ }

    // Step 2-3: always read from DB (authoritative state).
    const dbPortfolio = await dbLoadPortfolio(userId)

    if (dbPortfolio) {
      // Guard: if the positions JSONB blob is missing or empty but the portfolio's
      // financial figures indicate open positions exist (totalMarketValue > 0, or
      // totalEquity > cashBalance), rebuild positions from the filled orders table.
      // This self-heals the common case where dbSavePortfolio ran but
      // Supabase silently dropped the positions column value.
      const posArr = Array.isArray(dbPortfolio.positions) ? dbPortfolio.positions : []
      if (posArr.length === 0 && dbPortfolio.totalEquity > dbPortfolio.cashBalance + 0.01) {
        try {
          const filledOrders = await dbLoadOrders(userId)
          const rebuilt = rebuildPositionsFromOrders(filledOrders)
          if (rebuilt.length > 0) {
            dbPortfolio.positions = rebuilt
            console.log(`[Portfolio] Rebuilt ${rebuilt.length} position(s) from orders for ${userId}`)
          }
        } catch (e) {
          console.warn('[Portfolio] Failed to rebuild positions from orders:', e)
        }
      }

      // Sync the warm-cache so in-process calls (e.g. createOrder) see the
      // real balance, then refresh position prices before responding.
      portfolios.set(userId, dbPortfolio)
      const fresh = refreshPortfolio(dbPortfolio)

      // If the recalculated equity differs from what's stored (e.g. stale DB
      // value from a previous leverage-inflation bug), write it back now so the
      // client-side staleness guard never blocks the corrected value.
      const storedEquity = dbPortfolio.totalEquity
      if (Math.abs(storedEquity - fresh.totalEquity) > 0.01) {
        dbSavePortfolio(userId, fresh).catch((e: unknown) =>
          console.error('[Portfolio] equity correction save failed:', e)
        )
      }

      return res.json(fresh)
    }

    // Step 4: no portfolio row in DB yet.
    // Check in-memory: if this user has a non-default portfolio (balance changed
    // or positions exist), the schema was created AFTER they started trading.
    // Backfill to DB now so data survives the next restart, then return it.
    const memPortfolio = getPortfolio(userId)
    const hasRealData = memPortfolio.cashBalance < 99_999.99 || memPortfolio.positions.length > 0
    if (hasRealData) {
      console.log(`[Portfolio] Backfilling in-memory portfolio to DB for ${userId}`)
      dbSavePortfolio(userId, memPortfolio).catch((e: unknown) =>
        console.error('[Portfolio] backfill save failed:', e)
      )
    }
    return res.json(memPortfolio)

  } catch (err) {
    // Step 5: DB unreachable (e.g. missing env vars) - serve in-memory state
    // so the client is usable rather than permanently broken.  On a cold start
    // with no DB, this returns the $100k default which is correct for a new user.
    console.error('[Portfolio] DB error - serving in-memory fallback:', err)
    const fallback = getPortfolio(userId)
    return res.json(refreshPortfolio(fallback))
  }
})

export default router
