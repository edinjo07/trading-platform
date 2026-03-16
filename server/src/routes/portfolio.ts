import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio, portfolios, refreshPortfolio } from '../services/tradingEngine'
import { dbLoadPortfolio } from '../services/dbSync'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
// On Vercel, a cold-start container loads from DB in initialize(), but if DB
// is unavailable or the user's portfolio wasn't found, we fall back to a
// direct DB lookup here before creating a fresh $100k default.
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  let portfolio = portfolios.get(userId)
  if (!portfolio) {
    // Not in module-level cache — try a direct DB read
    const dbPortfolio = await dbLoadPortfolio(userId)
    if (dbPortfolio) {
      portfolios.set(userId, dbPortfolio)
      portfolio = refreshPortfolio(dbPortfolio)
    } else {
      // Still not found — getPortfolio creates a default $100k portfolio
      portfolio = getPortfolio(userId)
    }
  } else {
    portfolio = refreshPortfolio(portfolio)
  }
  return res.json(portfolio)
})

export default router
