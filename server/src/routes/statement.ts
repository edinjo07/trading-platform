import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { getPrice } from '../services/priceService'
import { supabase } from '../db'

/**
 * Trading statement (real account only) for a date range.
 * Reproduces a broker-style statement: account summary, open positions,
 * closed positions and a running-balance ledger movement.
 * The client renders it as a printable page → "Save as PDF".
 */
const router = Router()

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function fxRate(currency: string): number {
  if (currency === 'EUR') return getPrice('EURUSD') ?? 1
  if (currency === 'GBP') return getPrice('GBPUSD') ?? 1
  return 1
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const email  = req.user!.email || ''
    const mode   = 'real' // statements are issued for the live account only

    const qCur = String(req.query.currency || '')
    const hdrCur = req.headers['x-account-currency']
    const currency = ['USD', 'EUR', 'GBP'].includes(qCur) ? qCur
      : (typeof hdrCur === 'string' && ['USD', 'EUR', 'GBP'].includes(hdrCur) ? hdrCur : 'USD')
    const rate = fxRate(currency)

    // ── Date range (whole days, inclusive) ──────────────────────────────────
    const now = new Date()
    const to   = req.query.to   ? new Date(String(req.query.to))   : now
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(now.getTime() - 30 * 864e5)
    const fromISO = new Date(from); fromISO.setHours(0, 0, 0, 0)
    const toISO   = new Date(to);   toISO.setHours(23, 59, 59, 999)

    // ── Account ─────────────────────────────────────────────────────────────
    const { data: acctRows } = await supabase
      .from('accounts').select('*')
      .eq('user_id', userId).eq('mode', mode).eq('currency', currency).limit(1)
    const account = acctRows?.[0]
    const closingBalance  = r2(Number(account?.cash_balance ?? 0))
    const accountNumber   = account?.account_number ?? ''
    const accountType     = account?.account_type ?? 'raw_spread'

    // ── Open positions (current snapshot) ───────────────────────────────────
    const { data: posRows } = await supabase
      .from('positions').select('*')
      .eq('user_id', userId).eq('mode', mode)
      .order('opened_at', { ascending: false })

    let unrealisedTotal = 0
    const openPositions = (posRows ?? []).map(p => {
      const qty = Number(p.quantity)
      const openPrice = Number(p.avg_price)
      const current = getPrice(p.symbol) ?? openPrice
      const rawUsd = p.side === 'long' ? (current - openPrice) * qty : (openPrice - current) * qty
      const upnl = r2(rawUsd / rate)
      unrealisedTotal += upnl
      return {
        opened_at: p.opened_at, id: p.id, symbol: p.symbol, side: p.side, quantity: qty,
        open_price: openPrice, current_price: current,
        stop_loss: p.stop_loss ?? null, take_profit: p.take_profit ?? null,
        leverage: p.leverage, notional: r2(qty * current / rate), unrealised_pnl: upnl,
      }
    })
    unrealisedTotal = r2(unrealisedTotal)

    // ── Closed positions (trades closed in range) ───────────────────────────
    const { data: tradeRows } = await supabase
      .from('trades').select('*')
      .eq('user_id', userId).eq('mode', mode)
      .gte('closed_at', fromISO.toISOString()).lte('closed_at', toISO.toISOString())
      .order('closed_at', { ascending: true })

    const closedPositions = (tradeRows ?? []).map(t => {
      const qty = Number(t.quantity)
      return {
        opened_at: t.opened_at, closed_at: t.closed_at, id: t.id, symbol: t.symbol, side: t.side,
        quantity: qty, open_price: Number(t.entry_price), close_price: Number(t.exit_price),
        leverage: t.leverage, notional: r2(qty * Number(t.exit_price) / rate),
        realised_pnl: r2(Number(t.net_pnl ?? 0)), commission: r2(Number(t.commission ?? 0)),
      }
    })
    const realisedPnl = r2(closedPositions.reduce((s, t) => s + t.realised_pnl, 0))

    // ── Transactions (deposits / withdrawals) in range ──────────────────────
    let txRows: any[] = []
    try {
      const { data } = await supabase
        .from('transactions').select('*')
        .eq('user_id', userId)
        .gte('created_at', fromISO.toISOString()).lte('created_at', toISO.toISOString())
        .order('created_at', { ascending: true })
      txRows = data ?? []
    } catch { /* transactions table not migrated */ }

    const settled = (t: any) => ['completed', 'approved'].includes(t.status)
    const deposits    = r2(txRows.filter(t => t.type === 'deposit'    && settled(t)).reduce((s, t) => s + Number(t.amount), 0))
    const withdrawals = r2(txRows.filter(t => t.type === 'withdrawal' && settled(t)).reduce((s, t) => s + Number(t.amount), 0))
    const pendingWithdrawals = r2(txRows.filter(t => t.type === 'withdrawal' && t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0))

    // Opening balance derived so the ledger reconciles to the live closing balance:
    // closing = opening + deposits − withdrawals + realisedPnl
    const openingBalance = r2(closingBalance - deposits + withdrawals - realisedPnl)
    const closingEquity  = r2(closingBalance + unrealisedTotal)

    // ── Ledger movement (chronological, running balance) ────────────────────
    type Ev = { time: string; id: string; description: string; type: string; amount: number }
    const events: Ev[] = []
    for (const t of txRows) {
      if (t.type === 'deposit' && settled(t))
        events.push({ time: t.created_at, id: t.id, description: '-', type: 'DEPOSIT', amount: Number(t.amount) })
      if (t.type === 'withdrawal' && settled(t))
        events.push({ time: t.created_at, id: t.id, description: '-', type: 'WITHDRAWAL', amount: -Number(t.amount) })
    }
    for (const t of tradeRows ?? [])
      events.push({ time: t.closed_at, id: t.id, description: t.symbol, type: 'REALISED PROFIT & LOSS', amount: r2(Number(t.net_pnl ?? 0)) })

    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    let running = openingBalance
    const ledger = events.map(e => { running = r2(running + e.amount); return { ...e, balance: running } })

    const displayName = email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Trader'

    res.json({
      client: { name: displayName, email, accountNumber: String(accountNumber || ''), accountType, currency },
      period: { from: fromISO.toISOString(), to: toISO.toISOString(), generated: new Date().toISOString() },
      openSummary: {
        longCount:  openPositions.filter(p => p.side === 'long').length,
        shortCount: openPositions.filter(p => p.side === 'short').length,
        longNotional:  r2(openPositions.filter(p => p.side === 'long').reduce((s, p) => s + p.notional, 0)),
        shortNotional: r2(openPositions.filter(p => p.side === 'short').reduce((s, p) => s + p.notional, 0)),
      },
      summary: {
        openingBalance, openingUnrealised: 0, openingEquity: openingBalance,
        deposits, realisedPnl, withdrawals, pendingWithdrawals,
        closingBalance, closingUnrealised: unrealisedTotal, closingEquity,
      },
      openPositions, closedPositions, ledger,
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to build statement' })
  }
})

export default router
