import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPrice } from '../services/priceService'
import { supabase } from '../db'
import { AccountMode, PositionRow, PositionLive, Portfolio } from '../types'

const DEMO_START_BALANCE = 100_000
const REAL_START_BALANCE = 0

function getFxRate(currency: string): number {
  if (currency === 'EUR') return getPrice('EURUSD') ?? 1
  if (currency === 'GBP') return getPrice('GBPUSD') ?? 1
  return 1
}

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
  const startBalance = mode === 'demo' ? DEMO_START_BALANCE : REAL_START_BALANCE
  let cashBalance  = startBalance
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
      .insert({ user_id: userId, mode, currency, cash_balance: startBalance })
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
      cashBalance   = refetched?.cash_balance   ?? startBalance
      accountNumber = refetched?.account_number ?? 0
      accountType   = refetched?.account_type   ?? 'raw_spread'
    } else {
      cashBalance   = created?.cash_balance   ?? startBalance
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

  // FX rate: how many USD equals 1 unit of account currency (e.g. EURUSD ≈ 1.16)
  const fxRate = getFxRate(currency)

  let unrealizedPnlLocal = 0
  let totalMarginLocal   = 0

  const positions: PositionLive[] = (rawPositions ?? []).map((row) => {
    const pos = row as PositionRow
    const currentPrice = getPrice(pos.symbol) ?? pos.avg_price
    // Raw P&L in USD
    const rawPnlUsd = pos.side === 'long'
      ? (currentPrice - pos.avg_price) * pos.quantity
      : (pos.avg_price - currentPrice) * pos.quantity
    // Convert P&L to account currency
    const posPnl = parseFloat((rawPnlUsd / fxRate).toFixed(2))

    unrealizedPnlLocal += posPnl
    totalMarginLocal   += pos.margin  // already stored in local currency

    return {
      ...pos,
      currentPrice,
      unrealizedPnl:    posPnl,
      unrealizedPnlPct: pos.margin > 0 ? parseFloat(((posPnl / pos.margin) * 100).toFixed(2)) : 0,
      notionalValue:    parseFloat((pos.quantity * currentPrice / fxRate).toFixed(2)),
      liquidationPrice: pos.side === 'long'
        ? parseFloat((pos.avg_price * (1 - 0.9 / pos.leverage)).toFixed(8))
        : parseFloat((pos.avg_price * (1 + 0.9 / pos.leverage)).toFixed(8)),
    }
  })

  // Total equity = cash + margin locked + unrealised P&L — all in account currency
  const totalEquity = parseFloat((cashBalance + totalMarginLocal + unrealizedPnlLocal).toFixed(2))

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
    totalMargin:   parseFloat(totalMarginLocal.toFixed(2)),
    unrealizedPnl: parseFloat(unrealizedPnlLocal.toFixed(2)),
    totalEquity,
    realizedPnl,
    positions,
    updatedAt: new Date().toISOString(),
  }

  return res.json(portfolio)
})

export default router
