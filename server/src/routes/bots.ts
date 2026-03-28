import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { botEngine, BotStrategy, BotParams } from '../services/botEngine'

const router = Router()
router.use(authenticate)

// GET /api/bots - list all bots for current user
router.get('/', (req: AuthRequest, res) => {
  try {
    const bots = botEngine.getBotsForUser(req.user!.userId)
    res.json(bots)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bots/:id - get single bot (with logs)
router.get('/:id', (req: AuthRequest, res) => {
  try {
    const bot = botEngine.getBotById(req.params.id)
    if (!bot || bot.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Bot not found' })
      return
    }
    res.json(bot)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/bots - create a new bot
router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, symbol, strategy, params } = req.body as {
      name:     string
      symbol:   string
      strategy: BotStrategy
      params:   BotParams
    }

    if (typeof name !== 'string' || !name.trim())     throw new Error('name is required')
    if (typeof symbol !== 'string' || !symbol.trim()) throw new Error('symbol is required')
    if (typeof strategy !== 'string' || !strategy)    throw new Error('strategy is required')
    if (typeof params !== 'object' || params === null || typeof params.tradeSize !== 'number' || params.tradeSize <= 0) throw new Error('tradeSize must be > 0')

    const allowed: BotStrategy[] = ['ma_crossover', 'rsi', 'macd', 'momentum']
    if (!allowed.includes(strategy)) throw new Error(`strategy must be one of ${allowed.join(', ')}`)

    const bot = botEngine.createBot(req.user!.userId, name.trim(), symbol.trim(), strategy, params)
    res.status(201).json(bot)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/bots/:id/start - start bot
router.post('/:id/start', (req: AuthRequest, res) => {
  try {
    const bot = botEngine.startBot(req.params.id, req.user!.userId)
    res.json(bot)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/bots/:id/stop - stop bot
router.post('/:id/stop', (req: AuthRequest, res) => {
  try {
    const bot = botEngine.stopBot(req.params.id, req.user!.userId)
    res.json(bot)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/bots/:id - delete bot
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    botEngine.deleteBot(req.params.id, req.user!.userId)
    res.json({ success: true })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
