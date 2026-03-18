import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, portfolios, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadPortfolio, dbEnsureUser } from '../services/dbSync'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
// ─── Design rule ────────────────────────────────────────────────────────────
// Supabase is the SINGLE SOURCE OF TRUTH.  The in-memory map is only a warm
// cache — it is never trusted over a successful DB read.
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
    // Step 1: ensure FK row — fast ignoreDuplicates upsert.
    // Inside the try block so that a failure causes 503 rather than silently
    // proceeding to dbLoadPortfolio with a broken FK chain.
    await dbEnsureUser(userId, req.user!.email)

    // Step 2-3: always read from DB (authoritative state).
    const dbPortfolio = await dbLoadPortfolio(userId)

    if (dbPortfolio) {
      // Sync the warm-cache so in-process calls (e.g. createOrder) see the
      // real balance, then refresh position prices before responding.
      portfolios.set(userId, dbPortfolio)
      const fresh = refreshPortfolio(dbPortfolio)
      return res.json(fresh)
    }

    // Step 4: first-time user — no portfolio row in DB yet.
    // Return the $100k default WITHOUT writing to DB.  The portfolio row is
    // created on first order placement (orders.ts awaits dbSavePortfolio after
    // executeOrder).  Writing here would corrupt an existing portfolio if
    // maybeSingle ever returns null under load (e.g. Supabase rate-limits
    // the read but not the write that follows).
    const newPortfolio = getPortfolio(userId)
    return res.json(newPortfolio)

  } catch (err) {
    // Step 5: DB unreachable — return 503 so the client KEEPS its current
    // portfolio state instead of overwriting it with a stale $100k default.
    console.error('[Portfolio] DB error — returning 503 to preserve client state:', err)
    return res.status(503).json({ error: 'Portfolio service temporarily unavailable' })
  }
})

export default router
