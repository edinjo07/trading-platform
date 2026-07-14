import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requireAdmin } from '../middleware/requireAdmin'
import { supabase } from '../db'
import { getOverview, getUsersWithAccounts, listAuthUsers } from '../services/adminService'

const router = Router()
router.use(authenticate, requireAdmin)

/** Lightweight gate check the frontend uses to reveal admin + guard routes. */
router.get('/check', (_req: AuthRequest, res: Response) => res.json({ ok: true }))

/** Platform overview. */
router.get('/overview', async (_req, res) => {
  try { res.json(await getOverview()) }
  catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** All users + balances. */
router.get('/users', async (_req, res) => {
  try { res.json(await getUsersWithAccounts()) }
  catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** One user's detail: accounts, open positions, kyc status. */
router.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id
    const users = await listAuthUsers()
    const user = users.find(u => u.id === id)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    const [{ data: accounts }, { data: positions }] = await Promise.all([
      supabase.from('accounts').select('mode, cash_balance, updated_at').eq('user_id', id),
      supabase.from('positions').select('symbol, side, quantity, avg_price, margin, mode').eq('user_id', id),
    ])
    let kyc: string = 'unverified'
    try {
      const { data } = await supabase.from('kyc_submissions').select('status').eq('user_id', id).maybeSingle()
      if (data?.status) kyc = data.status
    } catch { /* table missing */ }
    res.json({ user, accounts: accounts ?? [], positions: positions ?? [], kyc })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** Adjust a user's balance. body: { mode: 'demo'|'real', op: 'set'|'add', amount } */
router.post('/users/:id/balance', async (req, res) => {
  try {
    const id = req.params.id
    const { mode, op, amount } = req.body as { mode: 'demo' | 'real'; op: 'set' | 'add'; amount: number }
    if (!['demo', 'real'].includes(mode) || !['set', 'add'].includes(op) || typeof amount !== 'number') {
      res.status(400).json({ error: 'Invalid payload' }); return
    }
    const { data: rows } = await supabase.from('accounts').select('id, cash_balance').eq('user_id', id).eq('mode', mode).limit(1)
    const existing = rows?.[0]
    const current = Number(existing?.cash_balance ?? 0)
    const next = Math.max(0, op === 'set' ? amount : current + amount)
    if (existing) {
      await supabase.from('accounts').update({ cash_balance: next, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('accounts').insert({ user_id: id, mode, cash_balance: next })
    }
    res.json({ ok: true, mode, balance: next })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** Deposits & withdrawals. Graceful if the transactions table isn't migrated. */
router.get('/transactions', async (req, res) => {
  try {
    let q = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(300)
    const status = String(req.query.status || '')
    const type   = String(req.query.type || '')
    if (status) q = q.eq('status', status)
    if (type)   q = q.eq('type', type)
    const { data, error } = await q
    if (error) { res.json({ rows: [], migrated: false }); return }
    // decorate with user email
    const users = await listAuthUsers()
    const emailById = new Map(users.map(u => [u.id, u.email]))
    res.json({ rows: (data ?? []).map(t => ({ ...t, email: emailById.get(t.user_id) ?? '' })), migrated: true })
  } catch { res.json({ rows: [], migrated: false }) }
})

/** Approve / reject a withdrawal. Reject refunds the held amount. */
router.post('/transactions/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params as { id: string; action: 'approve' | 'reject' }
    if (!['approve', 'reject'].includes(action)) { res.status(400).json({ error: 'Bad action' }); return }
    const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle()
    if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return }
    if (action === 'reject' && tx.type === 'withdrawal' && tx.status === 'pending') {
      // refund the held amount back to the account
      const mode = (tx.details?.mode as string) || 'real'
      const { data: accts } = await supabase.from('accounts').select('id, cash_balance').eq('user_id', tx.user_id).eq('mode', mode).limit(1)
      const acct = accts?.[0]
      if (acct) await supabase.from('accounts').update({ cash_balance: Number(acct.cash_balance) + Number(tx.amount) }).eq('id', acct.id)
    }
    await supabase.from('transactions').update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** KYC queue (one submission row per user). */
router.get('/kyc', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('kyc_submissions').select('*').order('submitted_at', { ascending: false }).limit(300)
    if (error) { res.json({ rows: [], migrated: false }); return }
    const users = await listAuthUsers()
    const uById = new Map(users.map(u => [u.id, u]))
    res.json({ rows: (data ?? []).map(k => ({ ...k, email: uById.get(k.user_id)?.email ?? '', username: uById.get(k.user_id)?.username ?? '' })), migrated: true })
  } catch { res.json({ rows: [], migrated: false }) }
})

/** Approve / reject a user's KYC. */
router.post('/kyc/:userId/:action', async (req, res) => {
  try {
    const { userId, action } = req.params as { userId: string; action: 'approve' | 'reject' }
    if (!['approve', 'reject'].includes(action)) { res.status(400).json({ error: 'Bad action' }); return }
    const verified = action === 'approve'
    const docStatus = verified ? 'verified' : 'rejected'
    await supabase.from('kyc_submissions').update({
      status:    verified ? 'verified' : 'rejected',
      id_status: docStatus,
      poa_status: docStatus,
      reject_reason: verified ? null : (req.body?.reason || 'Documents did not meet requirements'),
      reviewed_at: new Date().toISOString(),
    }).eq('user_id', userId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** A user's open positions + order log (or recent across all if no userId). */
router.get('/trades', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    let posQ = supabase.from('positions').select('*').order('opened_at', { ascending: false }).limit(200)
    let ordQ = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    if (userId) { posQ = posQ.eq('user_id', userId); ordQ = ordQ.eq('user_id', userId) }
    const [{ data: positions }, { data: orders }] = await Promise.all([posQ, ordQ])
    const users = await listAuthUsers()
    const em = new Map(users.map(u => [u.id, u.email]))
    res.json({
      positions: (positions ?? []).map(p => ({ ...p, email: em.get(p.user_id) ?? '' })),
      orders:    (orders ?? []).map(o => ({ ...o, email: em.get(o.user_id) ?? '' })),
    })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

function pickPatch(body: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  for (const k of allowed) if (k in body && body[k] !== undefined) p[k] = body[k]
  return p
}

/** Edit an open position — entry price, open time, size, side, SL/TP. */
router.patch('/positions/:id', async (req, res) => {
  try {
    const patch = pickPatch(req.body, ['symbol', 'side', 'quantity', 'avg_price', 'leverage', 'margin', 'take_profit', 'stop_loss', 'opened_at'])
    if (patch.side && !['long', 'short'].includes(String(patch.side))) { res.status(400).json({ error: 'side must be long|short' }); return }
    patch.updated_at = new Date().toISOString()
    const { error } = await supabase.from('positions').update(patch).eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** Edit an order log row — fill price, date, size, side, status, SL/TP. */
router.patch('/orders/:id', async (req, res) => {
  try {
    const patch = pickPatch(req.body, ['symbol', 'side', 'quantity', 'fill_price', 'leverage', 'status', 'take_profit', 'stop_loss', 'created_at'])
    if (patch.side && !['buy', 'sell'].includes(String(patch.side))) { res.status(400).json({ error: 'side must be buy|sell' }); return }
    if (patch.status && !['filled', 'rejected'].includes(String(patch.status))) { res.status(400).json({ error: 'invalid status' }); return }
    const { error } = await supabase.from('orders').update(patch).eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

export default router
