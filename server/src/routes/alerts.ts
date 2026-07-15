import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { getPrice } from '../services/priceService'

/** Price alerts — server-monitored (see services/alertMonitor.ts). */
const router = Router()
router.use(authenticate)

function mapRow(r: any) {
  return {
    id: r.id, symbol: r.symbol, condition: r.condition,
    targetPrice: Number(r.target_price),
    currentPrice: r.current_price != null ? Number(r.current_price) : undefined,
    status: r.status, note: r.note ?? '',
    createdAt: r.created_at, triggeredAt: r.triggered_at ?? undefined,
  }
}

/** List the caller's alerts (newest first). Degrades to [] if not migrated. */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('price_alerts').select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false }).limit(200)
    if (error) { res.json({ alerts: [] }); return }
    res.json({ alerts: (data ?? []).map(mapRow) })
  } catch { res.json({ alerts: [] }) }
})

/** Create an alert. body: { symbol, condition: 'above'|'below', targetPrice, note? } */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, condition, targetPrice, note } = req.body as
      { symbol?: string; condition?: string; targetPrice?: number; note?: string }
    if (!symbol || !['above', 'below'].includes(String(condition)) ||
        typeof targetPrice !== 'number' || !(targetPrice > 0)) {
      res.status(400).json({ error: 'Invalid alert' }); return
    }
    const sym = String(symbol).toUpperCase()
    const current = getPrice(sym) ?? null
    const { data, error } = await supabase.from('price_alerts').insert({
      user_id: req.user!.userId, symbol: sym, condition,
      target_price: targetPrice, note: (note || '').slice(0, 120), current_price: current,
    }).select('*').single()
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ alert: mapRow(data) })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** Dismiss a triggered/active alert. */
router.patch('/:id/dismiss', async (req: AuthRequest, res: Response) => {
  try {
    await supabase.from('price_alerts').update({ status: 'dismissed' })
      .eq('id', req.params.id).eq('user_id', req.user!.userId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

/** Delete an alert. */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await supabase.from('price_alerts').delete()
      .eq('id', req.params.id).eq('user_id', req.user!.userId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e instanceof Error ? e.message : 'Failed' }) }
})

export default router
