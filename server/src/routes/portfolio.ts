import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPortfolio } from '../services/tradingEngine'

const router = Router()
router.use(authenticate)

// GET /api/portfolio
router.get('/', (req: AuthRequest, res: Response) => {
  const portfolio = getPortfolio(req.user!.userId)
  return res.json(portfolio)
})

export default router
