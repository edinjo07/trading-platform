/**
 * leaderboard.ts
 *
 * Real leaderboard computed from users' realized demo-trading performance.
 * Aggregates the `trades` table per user (demo mode) and ranks by return %.
 *
 * GET /api/leaderboard?period=monthly|all-time
 */

import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'

const router = Router()
const DEMO_START_BALANCE = 100_000

interface Agg {
  netPnl: number
  trades: number
  wins:   number
  rets:   number[]
  recent: { ts: number; win: boolean }[]
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const period = String(req.query.period ?? 'all-time')
  let cutoff = 0
  if (period === 'monthly') {
    const now = new Date()
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  }

  const { data: trades, error } = await supabase
    .from('trades')
    .select('user_id, net_pnl, closed_at')
    .eq('mode', 'demo')
    .order('closed_at', { ascending: true })
  if (error) return res.status(500).json({ success: false, error: error.message })

  const byUser = new Map<string, Agg>()
  for (const t of (trades ?? []) as { user_id: string; net_pnl: number; closed_at: string }[]) {
    const ts = t.closed_at ? new Date(t.closed_at).getTime() : 0
    if (cutoff > 0 && ts < cutoff) continue
    let a = byUser.get(t.user_id)
    if (!a) { a = { netPnl: 0, trades: 0, wins: 0, rets: [], recent: [] }; byUser.set(t.user_id, a) }
    a.netPnl += t.net_pnl
    a.trades += 1
    if (t.net_pnl > 0) a.wins += 1
    a.rets.push(t.net_pnl / DEMO_START_BALANCE)
    a.recent.push({ ts, win: t.net_pnl > 0 })
  }

  const userIds = [...byUser.keys()]
  if (userIds.length === 0) return res.json({ success: true, data: [] })

  const { data: users } = await supabase.from('users').select('id, username').in('id', userIds)
  const nameMap = new Map<string, string>()
  for (const u of (users ?? []) as { id: string; username: string }[]) nameMap.set(u.id, u.username)

  const entries = userIds.map(uid => {
    const a = byUser.get(uid)!
    const winRate   = a.trades ? a.wins / a.trades : 0
    const returnPct = (a.netPnl / DEMO_START_BALANCE) * 100

    let sharpe = 0
    if (a.rets.length > 1) {
      const mean = a.rets.reduce((s, r) => s + r, 0) / a.rets.length
      const variance = a.rets.reduce((s, r) => s + (r - mean) ** 2, 0) / a.rets.length
      const std = Math.sqrt(variance)
      if (std > 0) sharpe = (mean / std) * Math.sqrt(252)
    }

    // Current win streak — trailing consecutive winning trades (most recent first)
    const recent = [...a.recent].sort((x, y) => y.ts - x.ts)
    let streak = 0
    for (const r of recent) { if (r.win) streak++; else break }

    const username = nameMap.get(uid) ?? 'Trader'
    return {
      rank:      0,
      userId:    uid,
      username,
      avatar:    (username.trim()[0] ?? 'T').toUpperCase(),
      country:   '',
      returnPct: parseFloat(returnPct.toFixed(2)),
      netPnl:    parseFloat(a.netPnl.toFixed(2)),
      trades:    a.trades,
      winRate:   parseFloat(winRate.toFixed(4)),
      sharpe:    parseFloat(sharpe.toFixed(2)),
      equity:    parseFloat((DEMO_START_BALANCE + a.netPnl).toFixed(2)),
      streak,
    }
  })

  entries.sort((x, y) => y.returnPct - x.returnPct)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return res.json({ success: true, data: entries.slice(0, 100) })
})

export default router
