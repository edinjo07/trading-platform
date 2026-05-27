import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPrice } from '../services/priceService'
import { supabase } from '../db'
import { AccountMode, PositionRow, PositionLive, Portfolio } from '../types'

const STARTING_BALANCE = 100_000

const router = Router()

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

// GET /api/portfolio
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)

  // ── Load (or lazily create) the account ────────────────────────────────────
  let cashBalance = STARTING_BALANCE

  const { data: acct, error: acctErr } = await supabase
    .from('accounts')
    .select('cash_balance')
    .eq('user_id', userId)
    .eq('mode', mode)
    .single()

  if (acctErr?.code === 'PGRST116') {
    // First visit — try to create account
    const { data: created, error: createErr } = await supabase
      .from('accounts')
      .insert({ user_id: userId, mode, cash_balance: STARTING_BALANCE })
      .select('cash_balance')
      .single()
    if (createErr) {
      // Race: another request already created it — refetch the real balance
      const { data: refetched } = await supabase
        .from('accounts')
        .select('cash_balance')
        .eq('user_id', userId)
        .eq('mode', mode)
        .single()
      cashBalance = refetched?.cash_balance ?? STARTING_BALANCE
    } else {
      cashBalance = created?.cash_balance ?? STARTING_BALANCE
    }
  } else if (!acctErr && acct) {
    cashBalance = acct.cash_balance
  }

  // ── Load open positions ────────────────────────────────────────────────────
  const { data: rawPositions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)

  let unrealizedPnl = 0
  let totalMargin   = 0

  const positions: PositionLive[] = (rawPositions ?? []).map((row) => {
    const pos = row as PositionRow
    const currentPrice = getPrice(pos.symbol) ?? pos.avg_price
    const rawPnl = pos.side === 'long'
      ? (currentPrice - pos.avg_price) * pos.quantity
      : (pos.avg_price - currentPrice) * pos.quantity
    const posPnl = parseFloat(rawPnl.toFixed(2))

    unrealizedPnl += posPnl
    totalMargin   += pos.margin

    return {
      ...pos,
      currentPrice,
      unrealizedPnl:    posPnl,
      unrealizedPnlPct: pos.margin > 0 ? parseFloat(((posPnl / pos.margin) * 100).toFixed(2)) : 0,
      notionalValue:    parseFloat((pos.quantity * currentPrice).toFixed(2)),
      liquidationPrice: pos.side === 'long'
        ? parseFloat((pos.avg_price * (1 - 0.9 / pos.leverage)).toFixed(8))
        : parseFloat((pos.avg_price * (1 + 0.9 / pos.leverage)).toFixed(8)),
    }
  })

  // Total equity = cash in hand + margin locked in positions + unrealized P&L
  // (margin was already deducted from cashBalance when positions were opened)
  const totalEquity = parseFloat((cashBalance + totalMargin + unrealizedPnl).toFixed(2))

  // ── Sum realized P&L from closed trades ───────────────────────────────────
  const { data: tradeRows } = await supabase
    .from('trades')
    .select('net_pnl')
    .eq('user_id', userId)
    .eq('mode', mode)

  const realizedPnl = parseFloat(
    ((tradeRows ?? []).reduce((s: number, t: { net_pnl: number }) => s + (t.net_pnl ?? 0), 0)).toFixed(2)
  )

  const portfolio: Portfolio = {
    cashBalance:   parseFloat(cashBalance.toFixed(2)),
    totalMargin:   parseFloat(totalMargin.toFixed(2)),
    unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
    totalEquity,
    realizedPnl,
    positions,
    updatedAt: new Date().toISOString(),
  }

  return res.json(portfolio)
})

export default router
