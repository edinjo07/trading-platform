import { Router, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { isKnownSymbol } from '../services/priceService'
import { startBotEngine, stopBotEngine, isRunning } from '../services/botEngine'

const router = Router()
router.use(authenticate)

// ─── DB row → camelCase API shape ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toApiBot(row: Record<string, any>) {
  return {
    id:                  row.id,
    userId:              row.user_id,
    name:                row.name,
    symbol:              row.symbol,
    strategy:            row.strategy,
    params:              row.params,
    mode:                row.mode         ?? 'demo',
    status:              row.status,
    position:            row.position,
    createdAt:           row.created_at,
    startedAt:           row.started_at  ?? null,
    stoppedAt:           row.stopped_at  ?? null,
    trades:              row.trades,
    wins:                row.wins,
    losses:              row.losses,
    pnl:                 row.pnl,
    peakPnl:             row.peak_pnl,
    maxDrawdown:         row.max_drawdown,
    equityCurve:         row.equity_curve   ?? [],
    dailyTrades:         row.daily_trades,
    dailyLoss:           row.daily_loss,
    dailyResetDate:      row.daily_reset_date,
    warmupBarsNeeded:    row.warmup_bars_needed,
    warmupBarsCurrent:   row.warmup_bars_current,
    riskAccepted:        row.risk_accepted   ?? null,
    riskAcceptedAt:      row.risk_accepted_at ?? null,
    logs:                row.logs            ?? [],
    priceBuffer:         [],   // never sent to client
  }
}

// ─── GET / — list user's bots ─────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) { res.status(500).json({ error: error.message }); return }
  res.json((data ?? []).map(toApiBot))
})

// ─── GET /:id — single bot ────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single()

  if (error || !data) { res.status(404).json({ error: 'Bot not found' }); return }
  res.json(toApiBot(data))
})

// ─── POST / — create bot ──────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { name, symbol, strategy, params, riskAccepted, mode } = req.body
  const accountMode = mode === 'real' ? 'real' : 'demo'

  if (!name || !symbol || !strategy || !params) {
    res.status(400).json({ error: 'name, symbol, strategy, and params are required' }); return
  }

  const validStrategies = ['ma_crossover', 'rsi', 'macd', 'momentum']
  if (!validStrategies.includes(strategy)) {
    res.status(400).json({ error: `strategy must be one of: ${validStrategies.join(', ')}` }); return
  }

  if (!isKnownSymbol(symbol)) {
    res.status(400).json({ error: `Unknown symbol: ${symbol}` }); return
  }

  if (!params.tradeSize || Number(params.tradeSize) <= 0) {
    res.status(400).json({ error: 'params.tradeSize must be a positive number' }); return
  }

  const id  = uuidv4()
  const now = new Date().toISOString()

  const { data, error } = await supabase.from('bots').insert({
    id,
    user_id:             userId,
    name,
    symbol,
    strategy,
    params,
    mode:                accountMode,
    status:              'idle',
    position:            'none',
    trades:              0,
    wins:                0,
    losses:              0,
    pnl:                 0,
    peak_pnl:            0,
    max_drawdown:        0,
    equity_curve:        [],
    daily_trades:        0,
    daily_loss:          0,
    daily_reset_date:    now.slice(0, 10),
    warmup_bars_needed:  0,
    warmup_bars_current: 0,
    logs:                [],
    risk_accepted:       riskAccepted ?? null,
    risk_accepted_at:    riskAccepted ? now : null,
    created_at:          now,
    updated_at:          now,
  }).select().single()

  if (error) { res.status(500).json({ error: error.message }); return }
  res.status(201).json(toApiBot(data))
})

// ─── POST /:id/start — start bot ──────────────────────────────────────────────

router.post('/:id/start', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const botId  = req.params.id

  const { data: bot, error } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .eq('user_id', userId)
    .single()

  if (error || !bot) { res.status(404).json({ error: 'Bot not found' }); return }
  if (['running', 'warming_up'].includes(bot.status as string)) {
    res.status(409).json({ error: 'Bot is already running' }); return
  }

  const currency = (req.headers['x-account-currency'] as string | undefined) ?? 'USD'

  try {
    await startBotEngine(botId, userId, currency)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start bot' }); return
  }

  const { data: updated } = await supabase.from('bots').select('*').eq('id', botId).single()
  res.json(toApiBot(updated!))
})

// ─── POST /:id/stop — stop bot ────────────────────────────────────────────────

router.post('/:id/stop', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const botId  = req.params.id

  const { data: bot, error } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .eq('user_id', userId)
    .single()

  if (error || !bot) { res.status(404).json({ error: 'Bot not found' }); return }

  await stopBotEngine(botId, userId)

  const { data: updated } = await supabase.from('bots').select('*').eq('id', botId).single()
  res.json(toApiBot(updated!))
})

// ─── DELETE /:id — delete bot ─────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const botId  = req.params.id

  const { data: bot, error } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .eq('user_id', userId)
    .single()

  if (error || !bot) { res.status(404).json({ error: 'Bot not found' }); return }

  if (isRunning(botId)) await stopBotEngine(botId, userId)

  await supabase.from('bots').delete().eq('id', botId)
  res.status(204).send()
})

export default router
