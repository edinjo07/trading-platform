const fs = require('fs');
const content = `import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import {
  Order, OrderSide, OrderType, OrderStatus, TimeInForce,
  Portfolio, Position, User, TradeRecord, PerformanceStats, EquityPoint,
} from '../types'
import { getLivePrice, getAssetClass } from './mockDataService'

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------
export const tradeEvents = new EventEmitter()
tradeEvents.setMaxListeners(100)

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
const users       = new Map<string, User>()
const orders      = new Map<string, Order>()
const portfolios  = new Map<string, Portfolio>()
const tradeJournal= new Map<string, TradeRecord[]>()   // userId -> trade records
const equityCurve = new Map<string, EquityPoint[]>()   // userId -> equity points

// ---------------------------------------------------------------------------
// Commission schedule (paper trading — mirrors real broker fee structures)
// ---------------------------------------------------------------------------
const COMMISSION = {
  crypto: 0.001,   // 0.10% taker
  stock:  0,       // Commission-free (like eToro / Trading 212)
  forex:  0.00002, // 0.002% (spread already baked in)
}

function calcCommission(symbol: string, quantity: number, price: number): number {
  const ac = getAssetClass(symbol)
  const rate = COMMISSION[ac] ?? 0
  return parseFloat((quantity * price * rate).toFixed(6))
}

// ---------------------------------------------------------------------------
// Slippage model — market impact proportional to order size
// ---------------------------------------------------------------------------
function calcSlippage(symbol: string, quantity: number, price: number, side: OrderSide): number {
  const ac = getAssetClass(symbol)
  // Base spread slippage  (forex: 0.5 pip, crypto: 0.015%, stock: negligible)
  const baseSlip = ac === 'forex' ? 0.0001 : ac === 'crypto' ? 0.00015 : 0.00005
  // Market impact grows with order notional
  const notional = quantity * price
  const impactFactor = Math.min(notional / 1_000_000, 0.001) // max 0.1% impact
  const totalSlip = baseSlip + impactFactor
  // Positive = adverse (buy pays more, sell gets less)
  return side === 'buy' ? price * totalSlip : -price * totalSlip
}

// ---------------------------------------------------------------------------
// User store helpers
// ---------------------------------------------------------------------------
export function getUserById(id: string): User | undefined { return users.get(id) }
export function getUserByEmail(email: string): User | undefined {
  return [...users.values()].find(u => u.email === email)
}
export function createUser(user: User): void {
  users.set(user.id, user)
  portfolios.set(user.id, {
    userId: user.id,
    cashBalance: user.balance,
    totalMarketValue: 0,
    totalEquity: user.balance,
    unrealizedPnl: 0,
    realizedPnl: 0,
    positions: [],
    todayPnl: 0,
    todayPnlPercent: 0,
    peakEquity: user.balance,
    drawdown: 0,
  })
  tradeJournal.set(user.id, [])
  equityCurve.set(user.id, [])
}

// ---------------------------------------------------------------------------
// Portfolio helpers
// ---------------------------------------------------------------------------
export function getPortfolio(userId: string): Portfolio {
  let p = portfolios.get(userId)
  if (!p) {
    p = {
      userId,
      cashBalance: 100_000,
      totalMarketValue: 0,
      totalEquity: 100_000,
      unrealizedPnl: 0,
      realizedPnl: 0,
      positions: [],
      todayPnl: 0,
      todayPnlPercent: 0,
      peakEquity: 100_000,
      drawdown: 0,
    }
    portfolios.set(userId, p)
    tradeJournal.set(userId, [])
    equityCurve.set(userId, [])
  }
  return refreshPortfolio(p)
}

export function refreshPortfolio(p: Portfolio): Portfolio {
  let marketValue = 0
  let unrealizedPnl = 0

  p.positions = p.positions.map(pos => {
    const currentPrice = getLivePrice(pos.symbol)
    const mv = pos.quantity * currentPrice
    const upnl = (currentPrice - pos.avgCost) * pos.quantity * (pos.side === 'short' ? -1 : 1)
    marketValue += mv
    unrealizedPnl += upnl
    return {
      ...pos,
      currentPrice,
      marketValue: parseFloat(mv.toFixed(2)),
      unrealizedPnl: parseFloat(upnl.toFixed(2)),
      unrealizedPnlPercent: parseFloat(((upnl / (pos.avgCost * pos.quantity)) * 100).toFixed(2)),
    }
  })

  const prevEquity = p.totalEquity
  p.totalMarketValue = parseFloat(marketValue.toFixed(2))
  p.unrealizedPnl = parseFloat(unrealizedPnl.toFixed(2))
  p.totalEquity = parseFloat((p.cashBalance + marketValue).toFixed(2))

  // Track peak equity and drawdown
  if (!p.peakEquity || p.totalEquity > p.peakEquity) {
    p.peakEquity = p.totalEquity
    p.drawdown = 0
  } else if (p.peakEquity > 0) {
    p.drawdown = parseFloat((((p.peakEquity - p.totalEquity) / p.peakEquity) * 100).toFixed(2))
  }

  // Today P&L - approximate using unrealized change
  if (prevEquity && prevEquity !== p.totalEquity) {
    p.todayPnl = parseFloat((p.totalEquity - (p.peakEquity ?? p.totalEquity)).toFixed(2))
  }

  return p
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export function getOrdersByUser(userId: string): Order[] {
  return [...orders.values()]
    .filter(o => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ---------------------------------------------------------------------------
// createOrder — the main order entry point
// ---------------------------------------------------------------------------
export function createOrder(
  userId: string,
  symbol: string,
  side: OrderSide,
  type: OrderType,
  quantity: number,
  price?: number,
  stopPrice?: number,
  timeInForce: TimeInForce = 'GTC',
  takeProfit?: number,
  stopLoss?: number,
  trailingOffset?: number,  // percent e.g. 0.02 = 2%
  notes?: string,
): Order {
  const portfolio = getPortfolio(userId)
  const now = new Date().toISOString()
  const currentPrice = getLivePrice(symbol)

  // --- Validation ---
  if (quantity <= 0)         throw new Error('Quantity must be positive')
  if (quantity > 1_000_000)  throw new Error('Quantity exceeds maximum allowed')

  const estimatedFillPrice = price ?? stopPrice ?? currentPrice
  const estimatedCost      = side === 'buy' ? quantity * estimatedFillPrice : 0
  const estimatedCommission = calcCommission(symbol, quantity, estimatedFillPrice)

  if (side === 'buy' && portfolio.cashBalance < estimatedCost + estimatedCommission) {
    throw new Error(\`Insufficient funds: need $\${(estimatedCost + estimatedCommission).toFixed(2)}, have $\${portfolio.cashBalance.toFixed(2)}\`)
  }

  if (side === 'sell') {
    const pos = portfolio.positions.find(p => p.symbol === symbol)
    if (!pos || pos.quantity < quantity - 1e-8) {
      const available = pos?.quantity.toFixed(6) ?? '0'
      throw new Error(\`Insufficient position: need \${quantity}, have \${available}\`)
    }
  }

  // --- Type-specific validation ---
  if (type === 'limit' && !price)                throw new Error('Limit price required for limit orders')
  if (type === 'stop' && !stopPrice)             throw new Error('Stop price required for stop orders')
  if (type === 'stop_limit' && (!price || !stopPrice)) throw new Error('Both stop price and limit price required for stop-limit orders')
  if (type === 'trailing_stop' && (!trailingOffset || trailingOffset <= 0)) throw new Error('Trailing offset (%) required for trailing stop orders')

  const order: Order = {
    id: uuidv4(),
    userId,
    symbol,
    side,
    type,
    status: 'pending',
    quantity,
    price,
    stopPrice,
    trailingOffset,
    trailingHighWater: type === 'trailing_stop'
      ? (side === 'sell' ? currentPrice : currentPrice)  // track from current
      : undefined,
    takeProfit,
    stopLoss,
    filledQuantity: 0,
    timeInForce,
    notes,
    createdAt: now,
    updatedAt: now,
  }

  orders.set(order.id, order)

  if (type === 'market') {
    // Simulate realistic fill latency (50-300ms)
    const latency = 50 + Math.random() * 250
    setTimeout(() => executeOrder(order.id), latency)
  } else {
    order.status = 'open'
    order.updatedAt = new Date().toISOString()
    // Handle IOC/FOK — immediately cancel if not fillable at current price
    if (timeInForce === 'IOC' || timeInForce === 'FOK') {
      const canFillNow =
        (type === 'limit' && side === 'buy'  && currentPrice <= price!) ||
        (type === 'limit' && side === 'sell' && currentPrice >= price!)
      if (!canFillNow) {
        setTimeout(() => {
          order.status = 'cancelled'
          order.updatedAt = new Date().toISOString()
          tradeEvents.emit('orderUpdate', { userId, orderId: order.id, status: 'cancelled', reason: timeInForce + ' not filled immediately' })
        }, 100)
      }
    }
  }

  return order
}

// ---------------------------------------------------------------------------
// executeOrder — fills an order, updates portfolio, records trade, schedules TP/SL
// ---------------------------------------------------------------------------
export function executeOrder(orderId: string, overrideFillPrice?: number): void {
  const order = orders.get(orderId)
  if (!order || order.status === 'cancelled' || order.status === 'filled') return

  const rawFillPrice = overrideFillPrice ?? getLivePrice(order.symbol)
  // Apply slippage only for market orders
  const slippage = order.type === 'market' ? calcSlippage(order.symbol, order.quantity, rawFillPrice, order.side) : 0
  const fillPrice = parseFloat((rawFillPrice + slippage).toFixed(8))
  const commission = calcCommission(order.symbol, order.quantity, fillPrice)

  const portfolio = portfolios.get(order.userId)
  if (!portfolio) return

  const totalCost = order.quantity * fillPrice

  order.filledQuantity = order.quantity
  order.avgFillPrice  = fillPrice
  order.commission    = commission
  order.slippage      = slippage
  order.status        = 'filled'
  order.updatedAt     = new Date().toISOString()
  order.filledAt      = order.updatedAt

  // ---- Update positions ----
  if (order.side === 'buy') {
    portfolio.cashBalance = parseFloat((portfolio.cashBalance - totalCost - commission).toFixed(2))

    const existingIdx = portfolio.positions.findIndex(p => p.symbol === order.symbol)
    if (existingIdx >= 0) {
      const pos = portfolio.positions[existingIdx]
      const newQty    = pos.quantity + order.quantity
      const newAvgCost = (pos.avgCost * pos.quantity + fillPrice * order.quantity) / newQty
      portfolio.positions[existingIdx] = {
        ...pos,
        quantity:            parseFloat(newQty.toFixed(8)),
        avgCost:             parseFloat(newAvgCost.toFixed(6)),
        currentPrice:        fillPrice,
        marketValue:         parseFloat((newQty * fillPrice).toFixed(2)),
        unrealizedPnl:       parseFloat(((fillPrice - newAvgCost) * newQty).toFixed(2)),
        unrealizedPnlPercent: parseFloat((((fillPrice - newAvgCost) / newAvgCost) * 100).toFixed(2)),
      }
    } else {
      portfolio.positions.push({
        symbol:              order.symbol,
        quantity:            order.quantity,
        avgCost:             fillPrice,
        currentPrice:        fillPrice,
        marketValue:         totalCost,
        unrealizedPnl:       0,
        unrealizedPnlPercent: 0,
        side:                'long',
        openedAt:            new Date().toISOString(),
      })
    }

    // Record open trade in journal
    const journal = tradeJournal.get(order.userId) ?? []
    journal.push({
      id:          uuidv4(),
      userId:      order.userId,
      orderId:     order.id,
      symbol:      order.symbol,
      side:        'buy',
      quantity:    order.quantity,
      entryPrice:  fillPrice,
      commission,
      openedAt:    new Date().toISOString(),
      assetClass:  getAssetClass(order.symbol),
    })
    tradeJournal.set(order.userId, journal)

  } else {
    // SELL — close or reduce position
    portfolio.cashBalance = parseFloat((portfolio.cashBalance + totalCost - commission).toFixed(2))

    const existingIdx = portfolio.positions.findIndex(p => p.symbol === order.symbol)
    if (existingIdx >= 0) {
      const pos = portfolio.positions[existingIdx]
      const grossPnl  = (fillPrice - pos.avgCost) * order.quantity
      const netPnl    = grossPnl - commission
      portfolio.realizedPnl = parseFloat((portfolio.realizedPnl + netPnl).toFixed(2))

      // Update journal — find the open buy trade and close it
      const journal = tradeJournal.get(order.userId) ?? []
      const openTrade = [...journal].reverse().find(t => t.symbol === order.symbol && t.side === 'buy' && !t.closedAt)
      if (openTrade) {
        openTrade.exitPrice       = fillPrice
        openTrade.pnl             = grossPnl
        openTrade.netPnl          = netPnl
        openTrade.pnlPercent      = ((fillPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100
        openTrade.closedAt        = new Date().toISOString()
        openTrade.holdingPeriodMs = new Date(openTrade.closedAt).getTime() - new Date(openTrade.openedAt).getTime()
        openTrade.commission     += commission
      }
      tradeJournal.set(order.userId, journal)

      const newQty = pos.quantity - order.quantity
      if (newQty <= 0.000001) {
        portfolio.positions.splice(existingIdx, 1)
      } else {
        portfolio.positions[existingIdx] = {
          ...pos,
          quantity: parseFloat(newQty.toFixed(8)),
        }
      }
    }
  }

  refreshPortfolio(portfolio)

  // Record equity point
  recordEquityPoint(order.userId, portfolio)

  // Emit events
  tradeEvents.emit('orderFill', {
    userId: order.userId, orderId: order.id, symbol: order.symbol,
    side: order.side, quantity: order.quantity, fillPrice,
    commission, type: order.type,
  })

  // Schedule TP/SL on buys
  if (order.side === 'buy') {
    if (order.takeProfit) scheduleWatcher(order.userId, order.symbol, 'sell', order.quantity, order.takeProfit,   undefined,         'take_profit')
    if (order.stopLoss)   scheduleWatcher(order.userId, order.symbol, 'sell', order.quantity, undefined,          order.stopLoss,    'stop_loss')
  }
}

// ---------------------------------------------------------------------------
// Equity curve recorder
// ---------------------------------------------------------------------------
function recordEquityPoint(userId: string, portfolio: Portfolio): void {
  const curve = equityCurve.get(userId) ?? []
  curve.push({
    time:         Date.now(),
    equity:       portfolio.totalEquity,
    cashBalance:  portfolio.cashBalance,
    unrealizedPnl: portfolio.unrealizedPnl,
  })
  // Keep only last 2000 points
  if (curve.length > 2000) curve.splice(0, curve.length - 2000)
  equityCurve.set(userId, curve)
}

// Record equity every 5 minutes for all users
setInterval(() => {
  for (const [userId, portfolio] of portfolios.entries()) {
    refreshPortfolio(portfolio)
    recordEquityPoint(userId, portfolio)
  }
}, 5 * 60 * 1000)

// ---------------------------------------------------------------------------
// Performance analytics
// ---------------------------------------------------------------------------
export function getPerformanceStats(userId: string): PerformanceStats {
  const journal  = tradeJournal.get(userId) ?? []
  const portfolio = getPortfolio(userId)
  const curve    = equityCurve.get(userId) ?? []

  const closed = journal.filter(t => t.closedAt && t.netPnl !== undefined)
  const wins   = closed.filter(t => (t.netPnl ?? 0) > 0)
  const losses = closed.filter(t => (t.netPnl ?? 0) <= 0)

  const totalGrossPnl   = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const totalCommissions = journal.reduce((s, t) => s + t.commission, 0)
  const totalNetPnl      = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0)

  const avgWin  = wins.length  ? wins.reduce((s, t)   => s + (t.netPnl ?? 0), 0) / wins.length  : 0
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.netPnl ?? 0), 0) / losses.length : 0

  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0

  // Max drawdown from equity curve
  let peak = 0, maxDrawdown = 0
  for (const pt of curve) {
    if (pt.equity > peak) peak = pt.equity
    const dd = peak > 0 ? (peak - pt.equity) / peak * 100 : 0
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  // Sharpe ratio (daily returns, annualized)
  let sharpeRatio = 0
  if (curve.length >= 2) {
    const returns: number[] = []
    for (let i = 1; i < curve.length; i++) {
      if (curve[i - 1].equity > 0) returns.push((curve[i].equity - curve[i - 1].equity) / curve[i - 1].equity)
    }
    if (returns.length > 1) {
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length
      const std = Math.sqrt(variance)
      // Annualize: multiply by sqrt(252) for daily, sqrt(52) for weekly
      sharpeRatio = std > 0 ? parseFloat(((mean / std) * Math.sqrt(252)).toFixed(2)) : 0
    }
  }

  const startingBalance = 100_000
  const totalReturn = ((portfolio.totalEquity - startingBalance) / startingBalance) * 100

  return {
    userId,
    totalTrades:          closed.length,
    winningTrades:        wins.length,
    losingTrades:         losses.length,
    winRate:              closed.length > 0 ? parseFloat(((wins.length / closed.length) * 100).toFixed(1)) : 0,
    totalNetPnl:          parseFloat(totalNetPnl.toFixed(2)),
    totalGrossPnl:        parseFloat(totalGrossPnl.toFixed(2)),
    totalCommissions:     parseFloat(totalCommissions.toFixed(2)),
    avgWin:               parseFloat(avgWin.toFixed(2)),
    avgLoss:              parseFloat(avgLoss.toFixed(2)),
    profitFactor:         parseFloat(profitFactor.toFixed(2)),
    maxDrawdown:          parseFloat(maxDrawdown.toFixed(2)),
    sharpeRatio,
    totalReturn:          parseFloat(totalReturn.toFixed(2)),
    equityCurve:          curve,
    bestTrade:            wins.length  ? parseFloat(Math.max(...wins.map(t => t.netPnl ?? 0)).toFixed(2))    : 0,
    worstTrade:           losses.length ? parseFloat(Math.min(...losses.map(t => t.netPnl ?? 0)).toFixed(2)) : 0,
    avgHoldingPeriodMs:   closed.length ? closed.reduce((s, t) => s + (t.holdingPeriodMs ?? 0), 0) / closed.length : 0,
    totalVolume:          journal.reduce((s, t) => s + t.quantity * t.entryPrice, 0),
    startingBalance,
    currentEquity:        portfolio.totalEquity,
  }
}

export function getTradeJournal(userId: string): TradeRecord[] {
  return [...(tradeJournal.get(userId) ?? [])].reverse()
}

// ---------------------------------------------------------------------------
// Watcher system — processes limit, stop, stop-limit, trailing-stop, TP/SL
// ---------------------------------------------------------------------------
type WatchKind = 'limit' | 'stop' | 'stop_limit' | 'trailing_stop' | 'take_profit' | 'stop_loss'

interface WatchEntry {
  userId:      string
  symbol:      string
  side:        OrderSide
  quantity:    number
  limitPrice?: number      // fill price for limit-type triggers
  stopTrigger?: number     // trigger price
  trailingPct?: number     // trailing offset as decimal
  highWater?:  number      // running high/low water mark for trailing
  kind:        WatchKind
  orderId?:    string      // if linked to an Order record
}

const watchers: WatchEntry[] = []

function scheduleWatcher(
  userId: string, symbol: string, side: OrderSide, quantity: number,
  limitPrice: number | undefined, stopTrigger: number | undefined,
  kind: WatchKind, orderId?: string,
): void {
  watchers.push({ userId, symbol, side, quantity, limitPrice, stopTrigger, kind, orderId })
}

// Link open limit/stop orders from the orders map into watchers
function syncOrderWatchers(): void {
  for (const order of orders.values()) {
    if (order.status !== 'open') continue
    const alreadyWatched = watchers.some(w => w.orderId === order.id)
    if (alreadyWatched) continue

    if (order.type === 'limit') {
      watchers.push({ userId: order.userId, symbol: order.symbol, side: order.side,
        quantity: order.quantity, limitPrice: order.price, kind: 'limit', orderId: order.id })
    } else if (order.type === 'stop') {
      watchers.push({ userId: order.userId, symbol: order.symbol, side: order.side,
        quantity: order.quantity, stopTrigger: order.stopPrice, kind: 'stop', orderId: order.id })
    } else if (order.type === 'stop_limit') {
      watchers.push({ userId: order.userId, symbol: order.symbol, side: order.side,
        quantity: order.quantity, stopTrigger: order.stopPrice, limitPrice: order.price,
        kind: 'stop_limit', orderId: order.id })
    } else if (order.type === 'trailing_stop') {
      const mp = getLivePrice(order.symbol)
      watchers.push({ userId: order.userId, symbol: order.symbol, side: order.side,
        quantity: order.quantity, trailingPct: order.trailingOffset,
        highWater: order.trailingHighWater ?? mp, kind: 'trailing_stop', orderId: order.id })
    }
  }
}

// Master poller — 500ms interval
setInterval(() => {
  syncOrderWatchers()

  for (let i = watchers.length - 1; i >= 0; i--) {
    const w = watchers[i]
    const mp = getLivePrice(w.symbol)
    let triggered = false
    let fillPrice: number | undefined

    switch (w.kind) {
      case 'limit':
        triggered = w.side === 'buy' ? mp <= w.limitPrice! : mp >= w.limitPrice!
        if (triggered) fillPrice = w.limitPrice
        break

      case 'stop':
        triggered = w.side === 'buy' ? mp >= w.stopTrigger! : mp <= w.stopTrigger!
        if (triggered) fillPrice = mp   // fill at market after trigger
        break

      case 'stop_limit':
        // 1st condition: price crossed stop trigger
        const trigCrossed = w.side === 'buy' ? mp >= w.stopTrigger! : mp <= w.stopTrigger!
        if (trigCrossed) {
          // Now check if limit is fillable
          triggered = w.side === 'buy' ? mp <= w.limitPrice! : mp >= w.limitPrice!
          fillPrice = w.limitPrice
        }
        break

      case 'trailing_stop': {
        // Update high-water mark
        if (w.side === 'sell') {
          if (mp > (w.highWater ?? mp)) w.highWater = mp
          const stopLevel = w.highWater! * (1 - w.trailingPct!)
          triggered = mp <= stopLevel
          if (triggered) fillPrice = mp
          // Keep order updated
          if (w.orderId) {
            const o = orders.get(w.orderId)
            if (o) { o.trailingHighWater = w.highWater; o.stopPrice = stopLevel }
          }
        } else {
          if (mp < (w.highWater ?? mp)) w.highWater = mp
          const stopLevel = w.highWater! * (1 + w.trailingPct!)
          triggered = mp >= stopLevel
          if (triggered) fillPrice = mp
        }
        break
      }

      case 'take_profit':
        triggered = mp >= w.limitPrice!
        if (triggered) fillPrice = w.limitPrice
        break

      case 'stop_loss':
        triggered = mp <= w.stopTrigger!
        if (triggered) fillPrice = mp
        break
    }

    if (triggered) {
      watchers.splice(i, 1)
      if (w.orderId && orders.has(w.orderId)) {
        // Fill the existing order record
        executeOrder(w.orderId, fillPrice)
      } else {
        // TP/SL — create and fill a synthetic market order
        try {
          const syntheticOrder = createOrder(w.userId, w.symbol, w.side, 'market', w.quantity)
          setTimeout(() => executeOrder(syntheticOrder.id, fillPrice ?? mp), 50)
        } catch { /* position may already be closed */ }
      }
    }
  }
}, 500)

// ---------------------------------------------------------------------------
// Cancel order
// ---------------------------------------------------------------------------
export function cancelOrder(orderId: string, userId: string): Order {
  const order = orders.get(orderId)
  if (!order)                                              throw new Error('Order not found')
  if (order.userId !== userId)                             throw new Error('Unauthorized')
  if (order.status !== 'open' && order.status !== 'pending') throw new Error('Order cannot be cancelled')

  order.status    = 'cancelled'
  order.updatedAt = new Date().toISOString()

  // Remove from watchers
  const idx = watchers.findIndex(w => w.orderId === orderId)
  if (idx !== -1) watchers.splice(idx, 1)

  return order
}

// ---------------------------------------------------------------------------
// Close position (helper for "Close All" / position management)
// ---------------------------------------------------------------------------
export function closePosition(userId: string, symbol: string): Order {
  const portfolio = getPortfolio(userId)
  const pos = portfolio.positions.find(p => p.symbol === symbol)
  if (!pos || pos.quantity <= 0) throw new Error('No open position for ' + symbol)

  // Cancel any TP/SL watchers for this symbol
  for (let i = watchers.length - 1; i >= 0; i--) {
    if (watchers[i].userId === userId && watchers[i].symbol === symbol) watchers.splice(i, 1)
  }

  // Cancel open orders for this symbol
  for (const order of orders.values()) {
    if (order.userId === userId && order.symbol === symbol && (order.status === 'open' || order.status === 'pending')) {
      order.status = 'cancelled'
      order.updatedAt = new Date().toISOString()
    }
  }

  return createOrder(userId, symbol, 'sell', 'market', pos.quantity, undefined, undefined, 'GTC', undefined, undefined, undefined, 'Close position')
}
`;
fs.writeFileSync('C:/Users/albion mulaj/trading/server/src/services/tradingEngine.ts', content, 'utf8');
console.log('Written:', fs.statSync('C:/Users/albion mulaj/trading/server/src/services/tradingEngine.ts').size, 'bytes');
