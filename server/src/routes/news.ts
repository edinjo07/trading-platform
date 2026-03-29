import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getSentiment, getBloombergNews } from '../services/newsService'

const router = Router()

/** GET /api/news/bloomberg - proxy Bloomberg RSS feeds (authenticated) */
router.get('/bloomberg', authenticate, async (_req, res) => {
  try {
    const articles = await getBloombergNews()
    res.json(articles)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

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
