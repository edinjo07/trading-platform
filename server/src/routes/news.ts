import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getSentiment } from '../services/newsService'

const router = Router()
router.use(authenticate)

/** GET /api/news/sentiment/:symbol - returns news sentiment for a given symbol */
router.get('/sentiment/:symbol', async (req: AuthRequest, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol).toUpperCase()
    const sentiment = await getSentiment(symbol)
    res.json(sentiment)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
