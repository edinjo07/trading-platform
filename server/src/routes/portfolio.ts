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

function getCurrency(req: AuthRequest): string {
  const c = req.headers['x-account-currency']
  return typeof c === 'string' && ['USD', 'EUR', 'GBP'].includes(c) ? c : 'USD'
}

// GET /api/portfolio
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId   = req.user!.userId
  const mode     = getMode(req)
  const currency = getCurrency(req)

  // ── Load (or lazily create) the account ────────────────────────────────────
  let cashBalance  = STARTING_BALANCE
  let accountNumber = 0
  let accountType   = 'raw_spread'

  // Select * so we don't error if account_number / account_type columns haven't been migrated yet
  const { data: acct, error: acctErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .eq('currency', currency)
    .single()

  if (acctErr?.code === 'PGRST116') {
    // First visit — try to create account
    const { data: created, error: createErr } = await supabase
      .from('accounts')
      .insert({ user_id: userId, mode, currency, cash_balance: STARTING_BALANCE })
      .select('*')
      .single()
    if (createErr) {
      // Race: another request already created it — refetch the real balance
      const { data: refetched, error: refetchErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .eq('currency', currency)
        .single()
      if (refetchErr) return res.status(500).json({ error: `Account load failed: ${refetchErr.message}` })
      cashBalance   = refetched?.cash_balance   ?? STARTING_BALANCE
      accountNumber = refetched?.account_number ?? 0
      accountType   = refetched?.account_type   ?? 'raw_spread'
    } else {
      cashBalance   = created?.cash_balance   ?? STARTING_BALANCE
      accountNumber = created?.account_number ?? 0
      accountType   = created?.account_type   ?? 'raw_spread'
    }
  } else if (acctErr) {
    return res.status(500).json({ error: `Account load failed: ${acctErr.message}` })
  } else if (acct) {
    cashBalance   = acct.cash_balance
    accountNumber = acct.account_number ?? 0
    accountType   = acct.account_type   ?? 'raw_spread'
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
    accountNumber,
    accountType:   accountType as Portfolio['accountType'],
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
