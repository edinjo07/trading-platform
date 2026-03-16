/**
 * dbSync.ts — Supabase persistence layer
 * Wraps all DB operations. Called fire-and-forget from tradingEngine.ts
 * so the in-memory engine never blocks on DB I/O.
 */
import { supabase } from '../db'
import { User, Order, Portfolio, TradeRecord, EquityPoint } from '../types'

// ─── Users ────────────────────────────────────────────────────────────────────

export async function dbSaveUser(user: User): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash,
      balance: user.balance,
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

export async function dbLoadPortfolio(userId: string): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
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
  }
}

export async function dbLoadOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
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
}

// ─── Bootstrap — load all data from DB into in-memory maps ───────────────────

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
