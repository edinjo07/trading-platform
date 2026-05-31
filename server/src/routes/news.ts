import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getSentiment, getBloombergNews, getEconomicCalendar, getMacroNews } from '../services/newsService'

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

/** GET /api/news/economic-calendar — live Forex Factory calendar (15-min cache) */
router.get('/economic-calendar', authenticate, async (_req, res) => {
  try {
    const events = await getEconomicCalendar()
    res.json(events)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
})

/** GET /api/news/macro — aggregated macro financial news (10-min cache) */
router.get('/macro', authenticate, async (_req, res) => {
  try {
    const news = await getMacroNews()
    res.json(news)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' })
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
