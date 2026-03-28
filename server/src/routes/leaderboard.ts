import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

// Seeded mock leaderboard - deterministic per run
const BASE_USERS = [
  { username: 'AlphaTrader',   avatar: 'A', country: 'US' },
  { username: 'CryptoKing',    avatar: 'C', country: 'UK' },
  { username: 'FXMaster',      avatar: 'F', country: 'DE' },
  { username: 'QuickScalper',  avatar: 'Q', country: 'AU' },
  { username: 'TrendRider',    avatar: 'T', country: 'CA' },
  { username: 'Voltr0n',       avatar: 'V', country: 'SG' },
  { username: 'IronHands',     avatar: 'I', country: 'JP' },
  { username: 'PipHunter',     avatar: 'P', country: 'FR' },
  { username: 'NightTrader',   avatar: 'N', country: 'BR' },
  { username: 'MomentumBot',   avatar: 'M', country: 'NZ' },
]

const SEED_STATS = [
  { returnPct: 42.8, netPnl: 42800, trades: 187, winRate: 0.71, sharpe: 2.31 },
  { returnPct: 38.1, netPnl: 38100, trades: 214, winRate: 0.68, sharpe: 2.04 },
  { returnPct: 31.4, netPnl: 31400, trades: 156, winRate: 0.65, sharpe: 1.89 },
  { returnPct: 27.9, netPnl: 27900, trades:  98, winRate: 0.72, sharpe: 2.10 },
  { returnPct: 22.6, netPnl: 22600, trades: 301, winRate: 0.59, sharpe: 1.62 },
  { returnPct: 18.3, netPnl: 18300, trades: 134, winRate: 0.61, sharpe: 1.44 },
  { returnPct: 15.7, netPnl: 15700, trades:  72, winRate: 0.67, sharpe: 1.33 },
  { returnPct: 11.2, netPnl: 11200, trades: 243, winRate: 0.55, sharpe: 1.12 },
  { returnPct:  6.8, netPnl:  6800, trades:  45, winRate: 0.58, sharpe: 0.99 },
  { returnPct:  3.1, netPnl:  3100, trades:  29, winRate: 0.52, sharpe: 0.74 },
]

// GET /api/leaderboard
router.get('/', (_req: Request, res: Response) => {
  const leaderboard = BASE_USERS.map((u, i) => ({
    rank:      i + 1,
    userId:    `mock-${i}`,
    username:  u.username,
    avatar:    u.avatar,
    country:   u.country,
    ...SEED_STATS[i],
    equity:    100000 + SEED_STATS[i].netPnl,
    streak:    Math.max(0, Math.floor(SEED_STATS[i].winRate * 7) - 1),
  }))

  return res.json({ success: true, data: leaderboard, updatedAt: new Date().toISOString() })
})

export default router
