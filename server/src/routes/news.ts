import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getSentiment, getBloombergNews, getEconomicCalendar, getMacroNews } from '../services/newsService'
import { getNewsImpact } from '../services/newsImpactService'
import { getLiveVideoId } from '../services/webtvService'

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

/** GET /api/news/webtv/:channelId — resolve a channel's current live video id */
router.get('/webtv/:channelId', authenticate, async (req, res) => {
  try {
    const channelId = String(req.params.channelId).replace(/[^\w-]/g, '')
    if (!channelId) { res.status(400).json({ videoId: null, isLive: false }); return }
    res.json(await getLiveVideoId(channelId))
  } catch (err: unknown) {
    res.status(200).json({ videoId: null, isLive: false })
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

/** GET /api/news/impact/:symbol - instrument-specific causal news verdict (bot filter) */
router.get('/impact/:symbol', async (req: AuthRequest, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol).toUpperCase()
    const impact = await getNewsImpact(symbol)
    res.json(impact)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' })
  }
})

export default router
