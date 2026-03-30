/**
 * dbSync.ts - Supabase persistence layer
 * Wraps all DB operations. Called fire-and-forget from tradingEngine.ts
 * so the in-memory engine never blocks on DB I/O.
 */
import { supabase } from '../db'
import { User, Order, Portfolio, Position, TradeRecord, EquityPoint, AccountMode, Currency } from '../types'

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Supabase free tier has occasional transient connection hiccups.  A single
// retry with a 500ms pause recovers from most of them without exposing the
// error to the caller.
async function dbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    await new Promise(r => setTimeout(r, 500))
    return await fn()  // throws if second attempt also fails
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Ensure a user stub exists in public.users for FK constraints.
 * Users who authenticate via Supabase Auth are NOT automatically added to this
 * table - this function inserts a minimal row on first access so that orders
 * and portfolios (which REFERENCES users(id)) can be persisted.
 * Uses ignoreDuplicates so existing rows are never overwritten.
 */
export async function dbEnsureUser(
  userId: string,
  email: string,
  username?: string,
  accountMode: AccountMode = 'demo',
  currency: Currency = 'USD',
): Promise<void> {
  const safeEmail    = email    || `${userId}@unknown.invalid`
  const safeUsername = username || email.split('@')[0] || `user_${userId.slice(0, 8)}`
  const { error } = await supabase.from('users').upsert(
    {
      id: userId,
      email: safeEmail,
      username: safeUsername,
      password_hash: '$supabase_auth$',
      balance: 100_000,
      account_mode: accountMode,
      currency,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (error) console.error('[DB] ensureUser:', error.message)
}

export async function dbSaveUser(user: User): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash,
      balance: user.balance,
      account_mode: user.accountMode ?? 'demo',
      currency: user.currency ?? 'USD',
      created_at: user.createdAt,
    },
    { onConflict: 'id' }
  )
  if (error) console.error('[DB] saveUser:', error.message)
}

export async function dbGetUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  if (error || !data) return null
  return mapUser(data)
}

export async function dbGetUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapUser(data)
}

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    balance: parseFloat(row.balance),
    accountType: row.account_type ?? 'raw_spread',
    accountMode: (row.account_mode === 'real' ? 'real' : 'demo') as AccountMode,
    currency: (['USD', 'EUR', 'GBP'].includes(row.currency) ? row.currency : 'USD') as Currency,
    createdAt: row.created_at,
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function dbSaveOrder(order: Order): Promise<void> {
  const { error } = await supabase.from('orders').upsert(
    {
      id: order.id,
      user_id: order.userId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      price: order.price ?? null,
      stop_price: order.stopPrice ?? null,
      filled_quantity: order.filledQuantity ?? 0,
      avg_fill_price: order.avgFillPrice ?? null,
      commission: order.commission ?? 0,
      slippage: order.slippage ?? 0,
      leverage: order.leverage ?? 1,
      take_profit: order.takeProfit ?? null,
      stop_loss: order.stopLoss ?? null,
      trailing_offset: order.trailingOffset ?? null,
      time_in_force: order.timeInForce,
      notes: order.notes ?? null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      filled_at: order.filledAt ?? null,
    },
    { onConflict: 'id' }
  )
  if (error) console.error('[DB] saveOrder:', error.message)
}

// ─── Portfolios ───────────────────────────────────────────────────────────────

export async function dbSavePortfolio(userId: string, portfolio: Portfolio): Promise<void> {
  const { error } = await supabase.from('portfolios').upsert(
    {
      user_id: userId,
      cash_balance: portfolio.cashBalance,
      total_market_value: portfolio.totalMarketValue,
      total_equity: portfolio.totalEquity,
      unrealized_pnl: portfolio.unrealizedPnl,
      realized_pnl: portfolio.realizedPnl,
      today_pnl: portfolio.todayPnl,
      peak_equity: portfolio.peakEquity ?? portfolio.totalEquity,
      drawdown: portfolio.drawdown,
      positions: portfolio.positions as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) console.error('[DB] savePortfolio:', error.message)
}

// ─── Trade Journal ────────────────────────────────────────────────────────────

export async function dbSaveTradeRecord(record: TradeRecord): Promise<void> {
  const { error } = await supabase.from('trade_journal').upsert(
    {
      id: record.id,
      user_id: record.userId,
      order_id: record.orderId ?? null,
      symbol: record.symbol,
      side: record.side,
      quantity: record.quantity,
      entry_price: record.entryPrice,
      exit_price: record.exitPrice ?? null,
      pnl: record.pnl ?? null,
      net_pnl: record.netPnl ?? null,
      pnl_percent: record.pnlPercent ?? null,
      commission: record.commission,
      opened_at: record.openedAt,
      closed_at: record.closedAt ?? null,
      holding_period_ms: record.holdingPeriodMs ?? null,
      asset_class: record.assetClass ?? null,
    },
    { onConflict: 'id' }
  )
  if (error) console.error('[DB] saveTradeRecord:', error.message)
}

// ─── Load a single user's portfolio from DB (on-demand fallback) ─────────────
//
// IMPORTANT: use .maybeSingle() NOT .single().
// .single() converts a 0-row result into a PostgREST error (PGRST116), which
// is indistinguishable from a real DB failure.  With .maybeSingle(), a missing
// row returns { data: null, error: null } - we can treat that as "new user".
// Any remaining error is a genuine DB problem and must be thrown so the caller
// can return 503 instead of silently falling back to the $100k default.

export async function dbLoadPortfolio(userId: string): Promise<Portfolio | null> {
  return dbRetry(async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()  // null data + no error = row not found (new user)
    if (error) {
      throw new Error(`[DB] loadPortfolio: ${error.message}`)
    }
    if (!data) return null   // genuine new user - no portfolio row yet
    return {
      userId: data.user_id,
      cashBalance: parseFloat(data.cash_balance),
      totalMarketValue: parseFloat(data.total_market_value ?? 0),
      totalEquity: parseFloat(data.total_equity ?? data.cash_balance),
      unrealizedPnl: parseFloat(data.unrealized_pnl ?? 0),
      realizedPnl: parseFloat(data.realized_pnl ?? 0),
      todayPnl: parseFloat(data.today_pnl ?? 0),
      todayPnlPercent: 0,
      peakEquity: parseFloat(data.peak_equity ?? data.cash_balance),
      drawdown: parseFloat(data.drawdown ?? 0),
      positions: data.positions ?? [],
      updatedAt: data.updated_at ?? undefined,
    }
  })
}

// ─── Rebuild positions from order history ────────────────────────────────────
//
// Called when the portfolios.positions JSONB blob is empty but the portfolio's
// totalMarketValue > cashBalance, indicating positions exist but weren't saved.
// Processes filled orders chronologically to compute net open positions and
// their average cost, ready for refreshPortfolio() to add live prices.

export function rebuildPositionsFromOrders(orders: Order[]): Position[] {
  interface PosEntry {
    symbol:    string
    side:      'long' | 'short'
    quantity:  number
    totalCost: number  // qty * avgFillPrice (running sum for avg-cost calc)
    openedAt:  string
    leverage:  number
    margin:    number  // cash locked up (totalCost / leverage)
  }

  const posMap = new Map<string, PosEntry>()

  // Process oldest fills first so average-cost arithmetic is correct
  const filled = orders
    .filter(o => o.status === 'filled' && (o.filledQuantity ?? 0) > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const ord of filled) {
    const qty      = ord.filledQuantity!
    const price    = ord.avgFillPrice ?? 0
    const notional = qty * price
    const lev      = ord.leverage ?? 1
    const margin   = notional / lev
    const key      = ord.symbol
    const pos      = posMap.get(key)

    if (ord.side === 'buy') {
      if (pos?.side === 'short') {
        // Closing (or reducing) a short
        const rem = parseFloat((pos.quantity - qty).toFixed(8))
        if (rem <= 1e-8) {
          posMap.delete(key)
        } else {
          const frac      = rem / pos.quantity
          pos.quantity    = rem
          pos.totalCost   = parseFloat((pos.totalCost * frac).toFixed(8))
          pos.margin      = parseFloat((pos.margin    * frac).toFixed(8))
        }
      } else {
        // Opening / adding to long
        if (pos) {
          pos.quantity  = parseFloat((pos.quantity  + qty     ).toFixed(8))
          pos.totalCost = parseFloat((pos.totalCost + notional).toFixed(8))
          pos.margin    = parseFloat((pos.margin    + margin  ).toFixed(8))
        } else {
          posMap.set(key, {
            symbol: ord.symbol, side: 'long', quantity: qty, totalCost: notional,
            openedAt: ord.filledAt ?? ord.createdAt, leverage: lev, margin,
          })
        }
      }
    } else if (ord.side === 'sell') {
      if (pos?.side === 'long') {
        // Closing (or reducing) a long
        const rem = parseFloat((pos.quantity - qty).toFixed(8))
        if (rem <= 1e-8) {
          posMap.delete(key)
        } else {
          const frac      = rem / pos.quantity
          pos.quantity    = rem
          pos.totalCost   = parseFloat((pos.totalCost * frac).toFixed(8))
          pos.margin      = parseFloat((pos.margin    * frac).toFixed(8))
        }
      } else {
        // Opening / adding to short
        if (pos) {
          pos.quantity  = parseFloat((pos.quantity  + qty     ).toFixed(8))
          pos.totalCost = parseFloat((pos.totalCost + notional).toFixed(8))
          pos.margin    = parseFloat((pos.margin    + margin  ).toFixed(8))
        } else {
          posMap.set(key, {
            symbol: ord.symbol, side: 'short', quantity: qty, totalCost: notional,
            openedAt: ord.filledAt ?? ord.createdAt, leverage: lev, margin,
          })
        }
      }
    }
  }

  return [...posMap.values()].map(p => ({
    symbol:               p.symbol,
    quantity:             parseFloat(p.quantity.toFixed(8)),
    avgCost:              parseFloat((p.totalCost / p.quantity).toFixed(6)),
    currentPrice:         0,  // refreshPortfolio() will fill this in
    marketValue:          0,
    unrealizedPnl:        0,
    unrealizedPnlPercent: 0,
    side:                 p.side,
    openedAt:             p.openedAt,
    leverage:             p.leverage,
    margin:               parseFloat(p.margin.toFixed(2)),
    notionalValue:        parseFloat(p.totalCost.toFixed(2)),
  }))
}

export async function dbLoadOrders(userId: string): Promise<Order[]> {
  return dbRetry(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      throw new Error(`[DB] loadOrders: ${error.message}`)
    }
    if (!data) return []
    return data.map(o => ({
      id: o.id,
      userId: o.user_id,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      status: o.status,
      quantity: parseFloat(o.quantity),
      price: o.price != null ? parseFloat(o.price) : undefined,
      stopPrice: o.stop_price != null ? parseFloat(o.stop_price) : undefined,
      filledQuantity: parseFloat(o.filled_quantity ?? 0),
      avgFillPrice: o.avg_fill_price != null ? parseFloat(o.avg_fill_price) : undefined,
      commission: parseFloat(o.commission ?? 0),
      slippage: parseFloat(o.slippage ?? 0),
      leverage: parseFloat(o.leverage ?? 1),
      takeProfit: o.take_profit != null ? parseFloat(o.take_profit) : undefined,
      stopLoss: o.stop_loss != null ? parseFloat(o.stop_loss) : undefined,
      trailingOffset: o.trailing_offset != null ? parseFloat(o.trailing_offset) : undefined,
      timeInForce: o.time_in_force ?? 'GTC',
      notes: o.notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      filledAt: o.filled_at,
    } as Order))
  })
}

// ─── Load a single user's trade journal from DB ─────────────────────────────

export async function dbLoadTradeJournal(userId: string): Promise<TradeRecord[]> {
  return dbRetry(async () => {
    const { data, error } = await supabase
      .from('trade_journal')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
    if (error) throw new Error(`[DB] loadTradeJournal: ${error.message}`)
    if (!data) return []
    return data.map(t => ({
      id: t.id,
      userId: t.user_id,
      orderId: t.order_id ?? '',
      symbol: t.symbol,
      side: t.side as 'buy' | 'sell',
      quantity: parseFloat(t.quantity),
      entryPrice: parseFloat(t.entry_price),
      exitPrice: t.exit_price != null ? parseFloat(t.exit_price) : undefined,
      pnl: t.pnl != null ? parseFloat(t.pnl) : undefined,
      netPnl: t.net_pnl != null ? parseFloat(t.net_pnl) : undefined,
      pnlPercent: t.pnl_percent != null ? parseFloat(t.pnl_percent) : undefined,
      commission: parseFloat(t.commission ?? 0),
      openedAt: t.opened_at,
      closedAt: t.closed_at ?? undefined,
      holdingPeriodMs: t.holding_period_ms != null ? parseInt(t.holding_period_ms) : undefined,
      assetClass: t.asset_class ?? 'stock',
    } as TradeRecord))
  })
}

// ─── Bootstrap - load all data from DB into in-memory maps ───────────────────

export async function loadFromDB(params: {
  users: Map<string, User>
  orders: Map<string, Order>
  portfolios: Map<string, Portfolio>
  tradeJournal: Map<string, TradeRecord[]>
  equityCurve: Map<string, EquityPoint[]>
}): Promise<void> {
  const { users, orders, portfolios, tradeJournal, equityCurve } = params
  console.log('[DB] Loading data from Supabase...')

  // ── Users ──
  const { data: usersData, error: usersErr } = await supabase.from('users').select('*')
  if (usersErr) {
    console.error('[DB] loadUsers error:', usersErr.message)
  } else {
    for (const u of usersData ?? []) {
      users.set(u.id, mapUser(u))
    }
    console.log(`[DB] ✓ ${usersData?.length ?? 0} users loaded`)
  }

  // ── Orders ──
  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true })
  if (ordersErr) {
    console.error('[DB] loadOrders error:', ordersErr.message)
  } else {
    for (const o of ordersData ?? []) {
      orders.set(o.id, {
        id: o.id,
        userId: o.user_id,
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        status: o.status,
        quantity: parseFloat(o.quantity),
        price: o.price != null ? parseFloat(o.price) : undefined,
        stopPrice: o.stop_price != null ? parseFloat(o.stop_price) : undefined,
        filledQuantity: parseFloat(o.filled_quantity ?? 0),
        avgFillPrice: o.avg_fill_price != null ? parseFloat(o.avg_fill_price) : undefined,
        commission: parseFloat(o.commission ?? 0),
        slippage: parseFloat(o.slippage ?? 0),
        leverage: parseFloat(o.leverage ?? 1),
        takeProfit: o.take_profit != null ? parseFloat(o.take_profit) : undefined,
        stopLoss: o.stop_loss != null ? parseFloat(o.stop_loss) : undefined,
        trailingOffset: o.trailing_offset != null ? parseFloat(o.trailing_offset) : undefined,
        timeInForce: o.time_in_force ?? 'GTC',
        notes: o.notes,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        filledAt: o.filled_at,
      })
    }
    console.log(`[DB] ✓ ${ordersData?.length ?? 0} orders loaded`)
  }

  // ── Portfolios ──
  const { data: portData, error: portErr } = await supabase.from('portfolios').select('*')
  if (portErr) {
    console.error('[DB] loadPortfolios error:', portErr.message)
  } else {
    for (const p of portData ?? []) {
      portfolios.set(p.user_id, {
        userId: p.user_id,
        cashBalance: parseFloat(p.cash_balance),
        totalMarketValue: parseFloat(p.total_market_value),
        totalEquity: parseFloat(p.total_equity),
        unrealizedPnl: parseFloat(p.unrealized_pnl),
        realizedPnl: parseFloat(p.realized_pnl),
        todayPnl: parseFloat(p.today_pnl),
        todayPnlPercent: 0,
        peakEquity: parseFloat(p.peak_equity),
        drawdown: parseFloat(p.drawdown),
        positions: p.positions ?? [],
        updatedAt: p.updated_at ?? undefined,
      })
      if (!tradeJournal.has(p.user_id)) tradeJournal.set(p.user_id, [])
      if (!equityCurve.has(p.user_id)) equityCurve.set(p.user_id, [])
    }
    console.log(`[DB] ✓ ${portData?.length ?? 0} portfolios loaded`)
  }

  // ── Trade Journal ──
  const { data: journalData, error: journalErr } = await supabase
    .from('trade_journal')
    .select('*')
    .order('opened_at', { ascending: true })
  if (journalErr) {
    console.error('[DB] loadJournal error:', journalErr.message)
  } else {
    for (const t of journalData ?? []) {
      const record: TradeRecord = {
        id: t.id,
        userId: t.user_id,
        orderId: t.order_id,
        symbol: t.symbol,
        side: t.side,
        quantity: parseFloat(t.quantity),
        entryPrice: parseFloat(t.entry_price),
        exitPrice: t.exit_price != null ? parseFloat(t.exit_price) : undefined,
        pnl: t.pnl != null ? parseFloat(t.pnl) : undefined,
        netPnl: t.net_pnl != null ? parseFloat(t.net_pnl) : undefined,
        pnlPercent: t.pnl_percent != null ? parseFloat(t.pnl_percent) : undefined,
        commission: parseFloat(t.commission ?? 0),
        openedAt: t.opened_at,
        closedAt: t.closed_at,
        holdingPeriodMs: t.holding_period_ms != null ? parseInt(t.holding_period_ms) : undefined,
        assetClass: t.asset_class,
      }
      const existing = tradeJournal.get(t.user_id) ?? []
      existing.push(record)
      tradeJournal.set(t.user_id, existing)
    }
    console.log(`[DB] ✓ ${journalData?.length ?? 0} trade records loaded`)
  }
}

// ─── Bots ─────────────────────────────────────────────────────────────────────

// Minimal shape needed for DB persistence - avoids importing Bot from botEngine
export interface BotRow {
  id: string; userId: string; name: string; symbol: string
  strategy: string; params: object; status: string; position: string
  trades: number; wins: number; losses: number; pnl: number
  peakPnl: number; maxDrawdown: number
  equityCurve: { ts: number; pnl: number }[]
  dailyTrades: number; dailyLoss: number; dailyResetDate: string
  warmupBarsNeeded: number; warmupBarsCurrent: number
  logs: { ts: string; level: string; message: string }[]
  riskAccepted?: boolean; riskAcceptedAt?: string
  createdAt: string; startedAt?: string; stoppedAt?: string
}

export async function dbSaveBot(bot: BotRow): Promise<void> {
  return dbRetry(async () => {
    const { error } = await supabase.from('bots').upsert(
      {
        id:                   bot.id,
        user_id:              bot.userId,
        name:                 bot.name,
        symbol:               bot.symbol,
        strategy:             bot.strategy,
        params:               bot.params,
        status:               bot.status,
        position:             bot.position,
        trades:               bot.trades,
        wins:                 bot.wins,
        losses:               bot.losses,
        pnl:                  bot.pnl,
        peak_pnl:             bot.peakPnl,
        max_drawdown:         bot.maxDrawdown,
        equity_curve:         bot.equityCurve,
        daily_trades:         bot.dailyTrades,
        daily_loss:           bot.dailyLoss,
        daily_reset_date:     bot.dailyResetDate,
        warmup_bars_needed:   bot.warmupBarsNeeded,
        warmup_bars_current:  bot.warmupBarsCurrent,
        logs:                 bot.logs.slice(-200),  // cap at 200 entries
        risk_accepted:        bot.riskAccepted ?? null,
        risk_accepted_at:     bot.riskAcceptedAt ?? null,
        created_at:           bot.createdAt,
        started_at:           bot.startedAt ?? null,
        stopped_at:           bot.stoppedAt ?? null,
        updated_at:           new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) throw new Error(`[DB] saveBot: ${error.message}`)
  })
}

export async function dbDeleteBot(botId: string): Promise<void> {
  const { error } = await supabase.from('bots').delete().eq('id', botId)
  if (error) console.error('[DB] deleteBot:', error.message)
}

export async function dbLoadAllBots(): Promise<BotRow[]> {
  return dbRetry(async () => {
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw new Error(`[DB] loadBots: ${error.message}`)
    return (data ?? []).map(b => ({
      id:                  b.id,
      userId:              b.user_id,
      name:                b.name,
      symbol:              b.symbol,
      strategy:            b.strategy,
      params:              b.params ?? {},
      status:              b.status,
      position:            b.position,
      trades:              b.trades ?? 0,
      wins:                b.wins ?? 0,
      losses:              b.losses ?? 0,
      pnl:                 parseFloat(b.pnl ?? 0),
      peakPnl:             parseFloat(b.peak_pnl ?? 0),
      maxDrawdown:         parseFloat(b.max_drawdown ?? 0),
      equityCurve:         b.equity_curve ?? [],
      dailyTrades:         b.daily_trades ?? 0,
      dailyLoss:           parseFloat(b.daily_loss ?? 0),
      dailyResetDate:      b.daily_reset_date ?? '',
      warmupBarsNeeded:    b.warmup_bars_needed ?? 0,
      warmupBarsCurrent:   b.warmup_bars_current ?? 0,
      logs:                b.logs ?? [],
      riskAccepted:        b.risk_accepted ?? undefined,
      riskAcceptedAt:      b.risk_accepted_at ?? undefined,
      createdAt:           b.created_at,
      startedAt:           b.started_at ?? undefined,
      stoppedAt:           b.stopped_at ?? undefined,
    } as BotRow))
  })
}

// ─── Admin Platform Stats (queried directly from Supabase) ────────────────────
export interface PlatformStats {
  totalUsers:     number
  totalTrades:    number
  openTrades:     number
  closedTrades:   number
  totalDeposits:  number
  totalWithdraws: number
  profitLoss:     number
}

export async function dbGetPlatformStats(): Promise<PlatformStats> {
  const [usersRes, ordersRes, openRes, closedRes, depositsRes, withdrawsRes, pnlRes] =
    await Promise.allSettled([
      // Total registered users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      // Total orders ever placed
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      // Currently open orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      // Filled (closed) orders
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'filled'),
      // Sum of completed deposits
      supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'completed'),
      // Sum of completed withdrawals
      supabase.from('transactions').select('amount').eq('type', 'withdraw').eq('status', 'completed'),
      // Sum of net_pnl from closed trades
      supabase.from('trade_journal').select('net_pnl').not('net_pnl', 'is', null),
    ])

  function countOf(res: PromiseSettledResult<any>): number {
    if (res.status === 'fulfilled') return res.value.count ?? 0
    return 0
  }
  function sumOf(res: PromiseSettledResult<any>, field: string): number {
    if (res.status !== 'fulfilled') return 0
    const rows: any[] = res.value.data ?? []
    return rows.reduce((acc: number, row: any) => acc + parseFloat(row[field] ?? 0), 0)
  }

  return {
    totalUsers:     countOf(usersRes),
    totalTrades:    countOf(ordersRes),
    openTrades:     countOf(openRes),
    closedTrades:   countOf(closedRes),
    totalDeposits:  Math.round(sumOf(depositsRes,  'amount')  * 100) / 100,
    totalWithdraws: Math.round(sumOf(withdrawsRes, 'amount')  * 100) / 100,
    profitLoss:     Math.round(sumOf(pnlRes,       'net_pnl') * 100) / 100,
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export interface TransactionRow {
  id: string; userId: string; type: 'deposit' | 'withdraw'
  amount: number; currency: string; method?: string; gateway?: string
  status: string; txRef?: string; notes?: string; createdAt: string
}

export async function dbSaveTransaction(tx: TransactionRow): Promise<void> {
  const { error } = await supabase.from('transactions').upsert(
    {
      id:         tx.id,
      user_id:    tx.userId,
      type:       tx.type,
      amount:     tx.amount,
      currency:   tx.currency,
      method:     tx.method ?? null,
      gateway:    tx.gateway ?? null,
      status:     tx.status,
      tx_ref:     tx.txRef ?? null,
      notes:      tx.notes ?? null,
      created_at: tx.createdAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) console.error('[DB] saveTransaction:', error.message)
}

export async function dbGetTransactions(params?: {
  userId?: string; type?: 'deposit' | 'withdraw'; status?: string; limit?: number
}): Promise<TransactionRow[]> {
  return dbRetry(async () => {
    let q = supabase.from('transactions').select('*').order('created_at', { ascending: false })
    if (params?.userId) q = q.eq('user_id', params.userId)
    if (params?.type)   q = q.eq('type', params.type)
    if (params?.status) q = q.eq('status', params.status)
    if (params?.limit)  q = q.limit(params.limit)
    const { data, error } = await q
    if (error) throw new Error(`[DB] getTransactions: ${error.message}`)
    return (data ?? []).map(r => ({
      id:        r.id,
      userId:    r.user_id,
      type:      r.type,
      amount:    parseFloat(r.amount),
      currency:  r.currency,
      method:    r.method ?? undefined,
      gateway:   r.gateway ?? undefined,
      status:    r.status,
      txRef:     r.tx_ref ?? undefined,
      notes:     r.notes ?? undefined,
      createdAt: r.created_at,
    }))
  })
}
