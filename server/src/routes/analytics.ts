import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { getAssetClass } from '../services/priceService'
import { AccountMode, TradeRow } from '../types'

const router = Router()

const DEMO_START_BALANCE = 100_000
const REAL_START_BALANCE = 0

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

// ── DB row → camelCase TradeRecord (what the analytics UI consumes) ───────────
function toTradeRecord(row: TradeRow) {
  const openedAt = row.opened_at
  const closedAt = row.closed_at
  const holdingPeriodMs = openedAt && closedAt
    ? Math.max(0, new Date(closedAt).getTime() - new Date(openedAt).getTime())
    : undefined
  const cost = (row.entry_price ?? 0) * (row.quantity ?? 0)
  return {
    ...row,
    // camelCase aliases + derived fields the client pages read
    entryPrice:      row.entry_price,
    exitPrice:       row.exit_price,
    netPnl:          row.net_pnl,
    openedAt,
    closedAt,
    assetClass:      getAssetClass(row.symbol),
    holdingPeriodMs,
    pnlPercent:      cost > 0 ? parseFloat(((row.net_pnl / cost) * 100).toFixed(2)) : 0,
  }
}

// GET /api/analytics/trades — closed trade history (camelCase, enriched)
router.get('/trades', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  const limit  = Math.min(parseInt(String(req.query.limit ?? '100'), 10), 500)

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  return res.json((data ?? []).map(r => toTradeRecord(r as TradeRow)))
})

// GET /api/analytics/stats — full aggregated performance stats + equity curve
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  const startBalance = mode === 'demo' ? DEMO_START_BALANCE : REAL_START_BALANCE

  const { data, error } = await supabase
    .from('trades')
    .select('net_pnl, pnl, commission, symbol, quantity, entry_price, opened_at, closed_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('closed_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const trades = (data ?? []) as Pick<TradeRow,
    'net_pnl' | 'pnl' | 'commission' | 'symbol' | 'quantity' | 'entry_price' | 'opened_at' | 'closed_at'>[]

  const empty = {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    totalNetPnl: 0, netProfit: 0, totalCommission: 0,
    grossProfit: 0, grossLoss: 0, avgWin: 0, avgLoss: 0,
    bestTrade: 0, worstTrade: 0, profitFactor: 0, expectancy: 0,
    sharpeRatio: 0, maxDrawdown: 0, maxDrawdownPercent: 0,
    avgHoldingPeriodMs: 0, totalVolume: 0,
    startingBalance: startBalance, currentEquity: startBalance,
    equityCurve: [] as { time: number; equity: number }[],
  }
  if (trades.length === 0) return res.json(empty)

  const winners = trades.filter(t => t.net_pnl > 0)
  const losers  = trades.filter(t => t.net_pnl <= 0)

  const totalNetPnl     = trades.reduce((s, t) => s + t.net_pnl, 0)
  const totalCommission = trades.reduce((s, t) => s + (t.commission ?? 0), 0)
  const grossProfit     = winners.reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss       = losers.reduce( (s, t) => s + t.net_pnl, 0)   // ≤ 0
  const totalVolume     = trades.reduce((s, t) => s + (t.entry_price ?? 0) * (t.quantity ?? 0), 0)

  // ── Equity curve (starting balance + cumulative net P&L per closed trade) ──
  const equityCurve: { time: number; equity: number }[] = []
  const firstT = trades[0].opened_at ?? trades[0].closed_at
  if (firstT) equityCurve.push({ time: new Date(firstT).getTime(), equity: startBalance })
  let running = startBalance
  let peak = startBalance
  let maxDrawdown = 0
  for (const t of trades) {
    running += t.net_pnl
    if (t.closed_at) equityCurve.push({ time: new Date(t.closed_at).getTime(), equity: parseFloat(running.toFixed(2)) })
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDrawdown) maxDrawdown = dd
  }
  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0

  // ── Sharpe (per-trade returns normalised by starting balance, √252 annualised) ──
  let sharpeRatio = 0
  if (trades.length > 1 && startBalance > 0) {
    const rets = trades.map(t => t.net_pnl / startBalance)
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length
    const std = Math.sqrt(variance)
    if (std > 0) sharpeRatio = (mean / std) * Math.sqrt(252)
  }

  // ── Avg holding period over closed trades ──
  const holds = trades
    .filter(t => t.opened_at && t.closed_at)
    .map(t => new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime())
  const avgHoldingPeriodMs = holds.length ? holds.reduce((s, h) => s + h, 0) / holds.length : 0

  return res.json({
    totalTrades:       trades.length,
    winningTrades:     winners.length,
    losingTrades:      losers.length,
    winRate:           parseFloat((winners.length / trades.length).toFixed(4)),
    totalNetPnl:       parseFloat(totalNetPnl.toFixed(2)),
    netProfit:         parseFloat(totalNetPnl.toFixed(2)),
    totalCommission:   parseFloat(totalCommission.toFixed(2)),
    grossProfit:       parseFloat(grossProfit.toFixed(2)),
    grossLoss:         parseFloat(grossLoss.toFixed(2)),
    avgWin:            winners.length ? parseFloat((grossProfit / winners.length).toFixed(2)) : 0,
    avgLoss:           losers.length  ? parseFloat((grossLoss  / losers.length).toFixed(2))  : 0,
    bestTrade:         parseFloat(Math.max(...trades.map(t => t.net_pnl)).toFixed(2)),
    worstTrade:        parseFloat(Math.min(...trades.map(t => t.net_pnl)).toFixed(2)),
    profitFactor:      grossLoss !== 0 ? parseFloat((grossProfit / Math.abs(grossLoss)).toFixed(2)) : 0,
    expectancy:        parseFloat((totalNetPnl / trades.length).toFixed(2)),
    sharpeRatio:       parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown:       parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
    avgHoldingPeriodMs: Math.round(avgHoldingPeriodMs),
    totalVolume:       parseFloat(totalVolume.toFixed(2)),
    startingBalance:   startBalance,
    currentEquity:     parseFloat(running.toFixed(2)),
    equityCurve,
  })
})

export default router
