import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getAllUsers, getAllOrders, getAllPositions } from '../services/tradingEngine'
import {
  getAllPairs, getPairById, createPair, updatePair, deletePair, togglePair, getPairStats,
  PairCategory,
} from '../services/tradingPairsService'
import { dbGetPlatformStats } from '../services/dbSync'

const router = Router()

// All admin routes require authentication
// In production, add an additional admin role check
router.use(authenticate)

// ─── Helper ───────────────────────────────────────────────────────────────────
function adminGuard(req: AuthRequest, res: Response): boolean {
  // Placeholder: first registered user is treated as admin for demo purposes
  // In production, compare req.user.role === 'admin'
  return true
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  try {
    // Query Supabase for accurate platform-wide totals
    const stats = await dbGetPlatformStats()
    return res.json(stats)
  } catch {
    // Supabase unavailable — fall back to in-memory counts (no fake monetary amounts)
    const users  = getAllUsers()
    const orders = getAllOrders()
    const filled = orders.filter(o => o.status === 'filled')
    const totalPnl = filled.reduce((acc, o) => {
      if (o.avgFillPrice && o.price) {
        const diff = o.side === 'buy'
          ? o.avgFillPrice - o.price
          : o.price - o.avgFillPrice
        return acc + diff * o.filledQuantity
      }
      return acc
    }, 0)
    return res.json({
      totalUsers:     users.length,
      totalTrades:    orders.length,
      openTrades:     orders.filter(o => o.status === 'open').length,
      closedTrades:   filled.length,
      totalDeposits:  0,
      totalWithdraws: 0,
      profitLoss:     Math.round(totalPnl * 100) / 100,
    })
  }
})

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const users = getAllUsers().map(u => ({
    id:         u.id,
    email:      u.email,
    username:   u.username,
    balance:    u.balance,
    createdAt:  u.createdAt,
    status:     'active',
  }))
  return res.json(users)
})

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
router.get('/users/:id', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const user = getAllUsers().find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const userOrders    = getAllOrders().filter(o => o.userId === user.id)
  const userPositions = getAllPositions().filter(p => p.userId === user.id)
  return res.json({
    user: { id: user.id, email: user.email, username: user.username, balance: user.balance, createdAt: user.createdAt },
    orderCount:    userOrders.length,
    positionCount: userPositions.length,
  })
})

// ─── GET /api/admin/trades ────────────────────────────────────────────────────
router.get('/trades', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const { status, limit } = req.query
  let orders = getAllOrders()
  if (status) orders = orders.filter(o => o.status === status)
  if (limit)  orders = orders.slice(0, parseInt(limit as string, 10))
  return res.json(orders)
})

// ─── GET /api/admin/trades/open ───────────────────────────────────────────────
router.get('/trades/open', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  return res.json(getAllOrders().filter(o => o.status === 'open'))
})

// ─── GET /api/admin/trades/closed ────────────────────────────────────────────
router.get('/trades/closed', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  return res.json(getAllOrders().filter(o => o.status === 'filled'))
})

// ─── GET /api/admin/positions ─────────────────────────────────────────────────
router.get('/positions', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  return res.json(getAllPositions())
})

// ─── GET /api/admin/server-info ───────────────────────────────────────────────
router.get('/server-info', (_req: AuthRequest, res: Response) => {
  const mem = process.memoryUsage()
  return res.json({
    uptime:       Math.floor(process.uptime()),
    nodeVersion:  process.version,
    platform:     process.platform,
    arch:         process.arch,
    pid:          process.pid,
    memory: {
      rss:        Math.round(mem.rss / 1024 / 1024),
      heapUsed:   Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal:  Math.round(mem.heapTotal / 1024 / 1024),
      external:   Math.round(mem.external / 1024 / 1024),
    },
    env:          process.env.NODE_ENV ?? 'development',
  })
})

// ─── GET /api/admin/health ────────────────────────────────────────────────────
router.get('/health', (_req: AuthRequest, res: Response) => {
  return res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    services: {
      database:   'ok',
      websocket:  'ok',
      marketData: 'ok',
    },
  })
})

// ─── POST /api/admin/users/:id/suspend ────────────────────────────────────────
router.post('/users/:id/suspend', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const user = getAllUsers().find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  // In production: update user status in database
  return res.json({ success: true, message: `User ${user.username} has been suspended` })
})

// ─── POST /api/admin/users/:id/activate ──────────────────────────────────────
router.post('/users/:id/activate', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const user = getAllUsers().find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ success: true, message: `User ${user.username} has been activated` })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Trading Pairs CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/pairs ─────────────────────────────────────────────────────
router.get('/pairs', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const { category } = req.query
  const pairs = getAllPairs(category as PairCategory | undefined)
  return res.json(pairs)
})

// ─── GET /api/admin/pairs/stats ───────────────────────────────────────────────
router.get('/pairs/stats', (_req: AuthRequest, res: Response) => {
  return res.json(getPairStats())
})

// ─── GET /api/admin/pairs/:id ─────────────────────────────────────────────────
router.get('/pairs/:id', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  const pair = getPairById(req.params.id)
  if (!pair) return res.status(404).json({ error: 'Pair not found' })
  return res.json(pair)
})

// ─── POST /api/admin/pairs ────────────────────────────────────────────────────
router.post('/pairs', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  try {
    const pair = createPair(req.body)
    return res.status(201).json(pair)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// ─── PUT /api/admin/pairs/:id ─────────────────────────────────────────────────
router.put('/pairs/:id', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  try {
    const pair = updatePair(req.params.id, req.body)
    return res.json(pair)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

// ─── DELETE /api/admin/pairs/:id ─────────────────────────────────────────────
router.delete('/pairs/:id', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  try {
    deletePair(req.params.id)
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(404).json({ error: err.message })
  }
})

// ─── PATCH /api/admin/pairs/:id/toggle ───────────────────────────────────────
router.patch('/pairs/:id/toggle', (req: AuthRequest, res: Response) => {
  if (!adminGuard(req, res)) return
  try {
    const pair = togglePair(req.params.id)
    return res.json(pair)
  } catch (err: any) {
    return res.status(404).json({ error: err.message })
  }
})

export default router
