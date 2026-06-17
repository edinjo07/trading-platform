import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { getAssetClass, getPrice } from '../services/priceService'
import { AccountMode, TradeRow } from '../types'

const router = Router()

const DEMO_START_BALANCE = 100_000
const REAL_START_BALANCE = 0

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

function getCurrency(req: AuthRequest): string {
  const c = req.headers['x-account-currency']
  return typeof c === 'string' && ['USD', 'EUR', 'GBP'].includes(c) ? c : 'USD'
}

/** USD value of 1 unit of the account currency (P&L is stored in account currency). */
function getFxRate(currency: string): number {
  if (currency === 'EUR') return getPrice('EURUSD') ?? 1
  if (currency === 'GBP') return getPrice('GBPUSD') ?? 1
  return 1
}

function rangeCutoff(range: string): number {
  const now = Date.now()
  if (range === '7d')  return now - 7  * 86_400_000
  if (range === '30d') return now - 30 * 86_400_000
  return 0 // 'all'
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

// GET /api/analytics/stats?range=7d|30d|all — full performance stats + live equity curve
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const userId   = req.user!.userId
  const mode     = getMode(req)
  const currency = getCurrency(req)
  const range    = String(req.query.range ?? 'all')
  const cutoff   = rangeCutoff(range)
  const startBalance = mode === 'demo' ? DEMO_START_BALANCE : REAL_START_BALANCE

  // ── All closed trades (needed to compute the pre-window baseline) ──────────
  const { data, error } = await supabase
    .from('trades')
    .select('net_pnl, pnl, commission, symbol, quantity, entry_price, opened_at, closed_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('closed_at', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const all = (data ?? []) as Pick<TradeRow,
    'net_pnl' | 'pnl' | 'commission' | 'symbol' | 'quantity' | 'entry_price' | 'opened_at' | 'closed_at'>[]

  // Trades closed before the window form the baseline; the rest are "in window".
  const tMs = (t: { closed_at: string }) => (t.closed_at ? new Date(t.closed_at).getTime() : 0)
  const preWindowPnl = cutoff > 0 ? all.filter(t => tMs(t) < cutoff).reduce((s, t) => s + t.net_pnl, 0) : 0
  const trades       = cutoff > 0 ? all.filter(t => tMs(t) >= cutoff) : all
  const baseline     = parseFloat((startBalance + preWindowPnl).toFixed(2))

  // ── Live mark-to-market: unrealised P&L from currently open positions ──────
  const { data: posRows } = await supabase
    .from('positions')
    .select('symbol, side, avg_price, quantity')
    .eq('user_id', userId)
    .eq('mode', mode)
  const fx = getFxRate(currency)
  let unrealizedPnl = 0
  for (const p of (posRows ?? []) as { symbol: string; side: string; avg_price: number; quantity: number }[]) {
    const price = getPrice(p.symbol)
    if (!price || price <= 0) continue
    const rawUsd = p.side === 'long'
      ? (price - p.avg_price) * p.quantity
      : (p.avg_price - price) * p.quantity
    unrealizedPnl += rawUsd / fx
  }
  unrealizedPnl = parseFloat(unrealizedPnl.toFixed(2))
  const openPositions = (posRows ?? []).length

  const winners = trades.filter(t => t.net_pnl > 0)
  const losers  = trades.filter(t => t.net_pnl <= 0)

  const totalNetPnl     = trades.reduce((s, t) => s + t.net_pnl, 0)
  const totalCommission = trades.reduce((s, t) => s + (t.commission ?? 0), 0)
  const grossProfit     = winners.reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss       = losers.reduce( (s, t) => s + t.net_pnl, 0)   // ≤ 0
  const totalVolume     = trades.reduce((s, t) => s + (t.entry_price ?? 0) * (t.quantity ?? 0), 0)

  // ── Equity curve: baseline → each in-window close → live mark-to-market ────
  const equityCurve: { time: number; equity: number }[] = []
  let running = baseline
  let peak = baseline
  let maxDrawdown = 0
  const baseTime = cutoff > 0 ? cutoff : (trades[0]?.opened_at ? new Date(trades[0].opened_at).getTime() : Date.now())
  equityCurve.push({ time: baseTime, equity: baseline })
  for (const t of trades) {
    running += t.net_pnl
    if (t.closed_at) equityCurve.push({ time: tMs(t), equity: parseFloat(running.toFixed(2)) })
    if (running > peak) peak = running
    if (peak - running > maxDrawdown) maxDrawdown = peak - running
  }
  // Live point — current equity including open positions' unrealised P&L
  const currentEquity = parseFloat((running + unrealizedPnl).toFixed(2))
  equityCurve.push({ time: Date.now(), equity: currentEquity, ...(openPositions > 0 ? { live: true } : {}) } as { time: number; equity: number })
  if (currentEquity > peak) peak = currentEquity
  if (peak - currentEquity > maxDrawdown) maxDrawdown = peak - currentEquity
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

  const holds = trades
    .filter(t => t.opened_at && t.closed_at)
    .map(t => new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime())
  const avgHoldingPeriodMs = holds.length ? holds.reduce((s, h) => s + h, 0) / holds.length : 0

  return res.json({
    range,
    totalTrades:       trades.length,
    winningTrades:     winners.length,
    losingTrades:      losers.length,
    winRate:           trades.length ? parseFloat((winners.length / trades.length).toFixed(4)) : 0,
    totalNetPnl:       parseFloat(totalNetPnl.toFixed(2)),
    netProfit:         parseFloat(totalNetPnl.toFixed(2)),
    totalCommission:   parseFloat(totalCommission.toFixed(2)),
    grossProfit:       parseFloat(grossProfit.toFixed(2)),
    grossLoss:         parseFloat(grossLoss.toFixed(2)),
    avgWin:            winners.length ? parseFloat((grossProfit / winners.length).toFixed(2)) : 0,
    avgLoss:           losers.length  ? parseFloat((grossLoss  / losers.length).toFixed(2))  : 0,
    bestTrade:         trades.length ? parseFloat(Math.max(...trades.map(t => t.net_pnl)).toFixed(2)) : 0,
    worstTrade:        trades.length ? parseFloat(Math.min(...trades.map(t => t.net_pnl)).toFixed(2)) : 0,
    profitFactor:      grossLoss !== 0 ? parseFloat((grossProfit / Math.abs(grossLoss)).toFixed(2)) : 0,
    expectancy:        trades.length ? parseFloat((totalNetPnl / trades.length).toFixed(2)) : 0,
    sharpeRatio:       parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown:       parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
    avgHoldingPeriodMs: Math.round(avgHoldingPeriodMs),
    totalVolume:       parseFloat(totalVolume.toFixed(2)),
    startingBalance:   startBalance,
    currentEquity,
    unrealizedPnl,
    openPositions,
    equityCurve,
  })
})

export default router
