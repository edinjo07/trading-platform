import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import {
  Order, OrderSide, OrderType, OrderStatus, TimeInForce,
  Portfolio, Position, User, TradeRecord, PerformanceStats, EquityPoint,
  AccountType,
} from '../types'
import { getLivePrice, getAssetClass } from './mockDataService'
import { dbSaveUser, dbSaveOrder } from './dbSync'

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------
export const tradeEvents = new EventEmitter()
tradeEvents.setMaxListeners(100)

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
export const users       = new Map<string, User>()
export const orders      = new Map<string, Order>()
export const portfolios  = new Map<string, Portfolio>()
export const tradeJournal= new Map<string, TradeRecord[]>()   // userId -> trade records
export const equityCurve = new Map<string, EquityPoint[]>()   // userId -> equity points

// ---------------------------------------------------------------------------
// IC Markets account types - commission & spread model
// https://www.icmarkets.com/global/en/trading-accounts/overview
//
//  Account        | Platform          | Commission/lot/side | Spreads from | Min Dep | Stop-out
//  Raw Spread     | MetaTrader        | $3.50               | 0.0 pips     | $0      | 50%
//  cTrader Raw    | cTrader/TV        | $3.00 per USD 100k  | 0.0 pips     | $0      | 50%
//  Standard       | MetaTrader        | $0                  | 0.8 pips     | $0      | 50%
// ---------------------------------------------------------------------------
export const ACCOUNT_TYPES: Record<AccountType, {
  label: string; platform: string; commissionPerLot: number; commissionPer100k: number;
  spreadsFrom: number; minDeposit: number; stopOutPct: number; maxPositions: number;
  tradableInstruments: number;
}> = {
  raw_spread: {
    label: 'Raw Spread', platform: 'MetaTrader', commissionPerLot: 3.50,
    commissionPer100k: 0, spreadsFrom: 0.0, minDeposit: 0, stopOutPct: 50,
    maxPositions: 200, tradableInstruments: 2250,
  },
  ctrader: {
    label: 'cTrader Raw Spread', platform: 'cTrader / TradingView', commissionPerLot: 0,
    commissionPer100k: 3.00, spreadsFrom: 0.0, minDeposit: 0, stopOutPct: 50,
    maxPositions: 2000, tradableInstruments: 121,
  },
  standard: {
    label: 'Standard', platform: 'MetaTrader', commissionPerLot: 0,
    commissionPer100k: 0, spreadsFrom: 0.8, minDeposit: 0, stopOutPct: 50,
    maxPositions: 200, tradableInstruments: 2250,
  },
}

const LOT_SIZE: Record<string, number> = {
  forex: 100_000, commodity: 100_000, bond: 100_000,
  crypto: 1, stock: 1, index: 1,
}

const COMMISSION_PCT: Partial<Record<string, number>> = {
  crypto: 0.001,   // 0.10 % taker (all account types)
}

function calcCommission(symbol: string, quantity: number, price: number, accountType: AccountType = 'raw_spread'): number {
  const ac = getAssetClass(symbol)
  const acctDef = ACCOUNT_TYPES[accountType]
  const pct    = COMMISSION_PCT[ac] ?? 0
  let flatUsd = 0

  if (acctDef.commissionPerLot > 0) {
    // Raw Spread (MetaTrader) - per-lot commission for forex/metals/bonds
    const lotClasses = ['forex', 'commodity', 'bond']
    if (lotClasses.includes(ac)) {
      const lots = quantity / (LOT_SIZE[ac] ?? 100_000)
      flatUsd = lots * acctDef.commissionPerLot
    }
  } else if (acctDef.commissionPer100k > 0) {
    // cTrader - commission per USD 100k notional for forex/metals/bonds
    const lotClasses = ['forex', 'commodity', 'bond']
    if (lotClasses.includes(ac)) {
      const notional = quantity * price
      flatUsd = (notional / 100_000) * acctDef.commissionPer100k
    }
  }
  // Standard account: $0 commission (spread-only)

  const pctUsd = quantity * price * pct
  return parseFloat((flatUsd + pctUsd).toFixed(6))
}

// ---------------------------------------------------------------------------
// Slippage model - market impact proportional to order size
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
export function getAllUsers(): User[] { return [...users.values()] }
export function getAllOrders(): Order[] { return [...orders.values()] }
export function getAllPositions(): Portfolio['positions'][number][] {
  const allPositions: Portfolio['positions'][number][] = []
  for (const portfolio of portfolios.values()) {
    allPositions.push(...portfolio.positions)
  }
  return allPositions
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
  // Persist new user to DB.  Portfolio row is created on first order placement.
  dbSaveUser(user).catch(e => console.error('[DB] dbSaveUser:', e))
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
  let marketValue      = 0   // full notional (display only)
  let unrealizedPnl    = 0
  let equityFromPos    = 0   // margin locked in positions + unrealised P&L

  p.positions = p.positions.map(pos => {
    const currentPrice = getLivePrice(pos.symbol)
    const lev          = pos.leverage ?? 1
    const posMargin    = pos.margin ?? (pos.avgCost * pos.quantity / lev)
    const upnl         = (currentPrice - pos.avgCost) * pos.quantity * (pos.side === 'short' ? -1 : 1)
    const upnlPct      = posMargin > 0 ? (upnl / posMargin) * 100 : 0
    const mv           = pos.quantity * currentPrice
    marketValue   += mv
    unrealizedPnl += upnl
    // Equity contribution = margin posted + unrealised P&L on that position.
    // For L=1 this equals marketValue (same as before).
    // For L>1 this prevents phantom equity inflation from unlocked notional.
    equityFromPos += posMargin + upnl
    return {
      ...pos,
      currentPrice,
      marketValue:          parseFloat(mv.toFixed(2)),
      unrealizedPnl:        parseFloat(upnl.toFixed(2)),
      unrealizedPnlPercent: parseFloat(upnlPct.toFixed(2)),
      notionalValue:        parseFloat(mv.toFixed(2)),
    }
  })

  const prevEquity = p.totalEquity
  p.totalMarketValue = parseFloat(marketValue.toFixed(2))
  p.unrealizedPnl    = parseFloat(unrealizedPnl.toFixed(2))
  // Correct equity: cash on hand + margin in positions + unrealised P&L
  p.totalEquity = parseFloat((p.cashBalance + equityFromPos).toFixed(2))

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
// Leverage limits - IC Markets Global (FSA Seychelles)
//   Forex majors/minors/exotics : 1:1000
//   Precious metals (spot)      : 1:500
//   Energies & soft commodities : 1:200 / 1:100
//   Indices                     : 1:200
//   Crypto CFDs                 : 1:10
//   Stocks CFDs                 : 1:20
//   Bond futures                : 1:100
// ---------------------------------------------------------------------------
const MAX_LEVERAGE: Record<string, number> = {
  forex:     1000,
  commodity:  500,  // spot metals; energies/softs checked per-symbol if needed
  index:      200,
  crypto:      10,
  stock:       20,
  bond:       100,
}

function calcLiquidationPrice(entryPrice: number, leverage: number, side: 'long' | 'short'): number {
  // Liquidation when 90 % of margin is lost
  const movePct = 0.9 / leverage
  return side === 'long'
    ? parseFloat((entryPrice * (1 - movePct)).toFixed(8))
    : parseFloat((entryPrice * (1 + movePct)).toFixed(8))
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
// createOrder - the main order entry point
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
  leverage: number = 1,     // 1 = cash / no leverage; >1 = margin / leveraged
): Order {
  const portfolio = getPortfolio(userId)
  const now = new Date().toISOString()
  const currentPrice = getLivePrice(symbol)

  // --- Leverage validation ---
  const ac = getAssetClass(symbol)
  const maxLev = MAX_LEVERAGE[ac] ?? 10
  if (leverage < 1)           throw new Error('Leverage must be ≥ 1')
  if (leverage > maxLev)      throw new Error(`Max leverage for ${ac} is ${maxLev}x`)

  // --- Basic validation ---
  if (quantity <= 0)         throw new Error('Quantity must be positive')
  if (quantity > 1_000_000)  throw new Error('Quantity exceeds maximum allowed')

  const estimatedFillPrice  = price ?? stopPrice ?? currentPrice
  const estimatedNotional   = quantity * estimatedFillPrice
  const estimatedMargin     = estimatedNotional / leverage
  const user = users.get(userId)
  const estimatedCommission = calcCommission(symbol, quantity, estimatedFillPrice, user?.accountType)

  if (side === 'buy') {
    // Check if closing a short - no cash needed
    const existingShort = portfolio.positions.find(p => p.symbol === symbol && p.side === 'short')
    if (!existingShort) {
      if (portfolio.cashBalance < estimatedMargin + estimatedCommission) {
        throw new Error(
          leverage > 1
            ? `Insufficient margin: need $${(estimatedMargin + estimatedCommission).toFixed(2)} (${leverage}x leverage on $${estimatedNotional.toFixed(2)} notional), have $${portfolio.cashBalance.toFixed(2)}`
            : `Insufficient funds: need $${(estimatedMargin + estimatedCommission).toFixed(2)}, have $${portfolio.cashBalance.toFixed(2)}`
        )
      }
    }
  }

  if (side === 'sell') {
    const pos = portfolio.positions.find(p => p.symbol === symbol && p.side === 'long')
    if (leverage <= 1) {
      // Non-leveraged sell: must own the asset
      if (!pos || pos.quantity < quantity - 1e-8) {
        const available = pos?.quantity.toFixed(6) ?? '0'
        throw new Error(`Insufficient position: need ${quantity}, have ${available}`)
      }
    } else {
      // Leveraged sell: can open short if no long position, OR close existing long
      if (!pos) {
        // Opening a leveraged short - check margin
        if (portfolio.cashBalance < estimatedMargin + estimatedCommission) {
          throw new Error(`Insufficient margin for short: need $${(estimatedMargin + estimatedCommission).toFixed(2)} (${leverage}x), have $${portfolio.cashBalance.toFixed(2)}`)
        }
      } else if (pos.quantity < quantity - 1e-8) {
        const available = pos.quantity.toFixed(6)
        throw new Error(`Insufficient position: need ${quantity}, have ${available}`)
      }
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
      ? (side === 'sell' ? currentPrice : currentPrice)
      : undefined,
    takeProfit,
    stopLoss,
    leverage,
    filledQuantity: 0,
    timeInForce,
    notes,
    createdAt: now,
    updatedAt: now,
  }

  orders.set(order.id, order)
  // NOTE: We do NOT fire-and-forget dbSaveOrder here with status='pending'.
  // The route handler (orders.ts) awaits dbSaveOrder AFTER executeOrder sets
  // the status to 'filled'.  A premature 'pending' save arriving at Supabase
  // AFTER the 'filled' save would revert the order - causing it to "disappear"
  // from the client's perspective.  The route handler is the single owner of
  // DB persistence for every order lifecycle event.

  if (type === 'market') {
    if (!process.env.VERCEL) {
      // Local dev only: simulate fill latency with setTimeout.
      // On Vercel serverless the container may be frozen before the callback
      // fires - the route handler calls executeOrder() synchronously instead.
      const latency = 50 + Math.random() * 250
      setTimeout(() => executeOrder(order.id), latency)
    }
    // On Vercel: route handler will call executeOrder(order.id) directly.
  } else {
    order.status = 'open'
    order.updatedAt = new Date().toISOString()
    // Handle IOC/FOK - immediately cancel if not fillable at current price
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
// executeOrder - fills an order, updates portfolio, records trade, schedules TP/SL
// ---------------------------------------------------------------------------
export function executeOrder(orderId: string, overrideFillPrice?: number): void {
  const order = orders.get(orderId)
  if (!order || order.status === 'cancelled' || order.status === 'filled') return

  const rawFillPrice = overrideFillPrice ?? getLivePrice(order.symbol)
  // Apply slippage only for market orders
  const slippage = order.type === 'market' ? calcSlippage(order.symbol, order.quantity, rawFillPrice, order.side) : 0
  const fillPrice = parseFloat((rawFillPrice + slippage).toFixed(8))
  const orderUser = users.get(order.userId)
  const commission = calcCommission(order.symbol, order.quantity, fillPrice, orderUser?.accountType)

  const portfolio = portfolios.get(order.userId)
  if (!portfolio) return

  const lev         = order.leverage ?? 1
  const totalCost   = order.quantity * fillPrice          // full notional
  const margin      = totalCost / lev                     // cash actually required

  order.filledQuantity = order.quantity
  order.avgFillPrice  = fillPrice
  order.commission    = commission
  order.slippage      = slippage
  order.status        = 'filled'
  order.updatedAt     = new Date().toISOString()
  order.filledAt      = order.updatedAt

  // ---- Update positions ----
  const existingShortIdx = portfolio.positions.findIndex(p => p.symbol === order.symbol && p.side === 'short')
  const existingLongIdx  = portfolio.positions.findIndex(p => p.symbol === order.symbol && p.side === 'long')

  if (order.side === 'buy') {
    if (existingShortIdx >= 0) {
      // ─── Close / reduce short position ───────────────────────────────────
      const pos        = portfolio.positions[existingShortIdx]
      const closedQty  = order.quantity
      const posLev     = pos.leverage ?? 1
      const grossPnl   = (pos.avgCost - fillPrice) * closedQty  // short profits when price falls
      const retMargin  = pos.avgCost * closedQty / posLev
      portfolio.cashBalance = parseFloat((portfolio.cashBalance + retMargin + grossPnl - commission).toFixed(2))

      portfolio.realizedPnl = parseFloat((portfolio.realizedPnl + grossPnl - commission).toFixed(2))

      const journal = tradeJournal.get(order.userId) ?? []
      const openTrade = [...journal].reverse().find(t => t.symbol === order.symbol && t.side === 'sell' && !t.closedAt)
      if (openTrade) {
        openTrade.exitPrice       = fillPrice
        openTrade.pnl             = grossPnl
        openTrade.netPnl          = grossPnl - commission
        openTrade.pnlPercent      = ((pos.avgCost - fillPrice) / pos.avgCost) * 100
        openTrade.closedAt        = new Date().toISOString()
        openTrade.holdingPeriodMs = new Date(openTrade.closedAt).getTime() - new Date(openTrade.openedAt).getTime()
        openTrade.commission     += commission
      }
      tradeJournal.set(order.userId, journal)

      const newQty = pos.quantity - closedQty
      if (newQty <= 0.000001) {
        portfolio.positions.splice(existingShortIdx, 1)
      } else {
        const newMargin = pos.margin ? pos.margin * (newQty / pos.quantity) : undefined
        portfolio.positions[existingShortIdx] = {
          ...pos,
          quantity:       parseFloat(newQty.toFixed(8)),
          margin:         newMargin ? parseFloat(newMargin.toFixed(2)) : undefined,
          notionalValue:  parseFloat((newQty * pos.avgCost).toFixed(2)),
        }
      }

    } else {
      // ─── Open / add to long position ─────────────────────────────────────
      portfolio.cashBalance = parseFloat((portfolio.cashBalance - margin - commission).toFixed(2))

      if (existingLongIdx >= 0) {
        const pos        = portfolio.positions[existingLongIdx]
        const newQty     = pos.quantity + order.quantity
        const newAvgCost = (pos.avgCost * pos.quantity + fillPrice * order.quantity) / newQty
        const oldMargin  = pos.margin ?? (pos.avgCost * pos.quantity / (pos.leverage ?? 1))
        const newMargin  = oldMargin + margin
        const newLev     = parseFloat(((newQty * newAvgCost) / newMargin).toFixed(2))
        const liqPrice   = calcLiquidationPrice(newAvgCost, newLev, 'long')
        portfolio.positions[existingLongIdx] = {
          ...pos,
          quantity:             parseFloat(newQty.toFixed(8)),
          avgCost:              parseFloat(newAvgCost.toFixed(6)),
          currentPrice:         fillPrice,
          marketValue:          parseFloat((newQty * fillPrice).toFixed(2)),
          unrealizedPnl:        parseFloat(((fillPrice - newAvgCost) * newQty).toFixed(2)),
          unrealizedPnlPercent: parseFloat(((fillPrice - newAvgCost) * newQty / newMargin * 100).toFixed(2)),
          leverage:             newLev,
          margin:               parseFloat(newMargin.toFixed(2)),
          notionalValue:        parseFloat((newQty * newAvgCost).toFixed(2)),
          liquidationPrice:     liqPrice,
        }
      } else {
        const liqPrice = calcLiquidationPrice(fillPrice, lev, 'long')
        portfolio.positions.push({
          symbol:               order.symbol,
          quantity:             order.quantity,
          avgCost:              fillPrice,
          currentPrice:         fillPrice,
          marketValue:          totalCost,
          unrealizedPnl:        0,
          unrealizedPnlPercent: 0,
          side:                 'long',
          openedAt:             new Date().toISOString(),
          leverage:             lev,
          margin:               parseFloat(margin.toFixed(2)),
          notionalValue:        parseFloat(totalCost.toFixed(2)),
          liquidationPrice:     lev > 1 ? liqPrice : undefined,
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
    }

  } else {
    // order.side === 'sell'
    if (existingLongIdx >= 0) {
      // ─── Close / reduce long position ────────────────────────────────────
      const pos       = portfolio.positions[existingLongIdx]
      const posLev    = pos.leverage ?? 1
      const grossPnl  = (fillPrice - pos.avgCost) * order.quantity
      const retMargin = pos.avgCost * order.quantity / posLev
      portfolio.cashBalance = parseFloat((portfolio.cashBalance + retMargin + grossPnl - commission).toFixed(2))

      portfolio.realizedPnl = parseFloat((portfolio.realizedPnl + grossPnl - commission).toFixed(2))

      // Update journal
      const journal = tradeJournal.get(order.userId) ?? []
      const openTrade = [...journal].reverse().find(t => t.symbol === order.symbol && t.side === 'buy' && !t.closedAt)
      if (openTrade) {
        openTrade.exitPrice       = fillPrice
        openTrade.pnl             = grossPnl
        openTrade.netPnl          = grossPnl - commission
        openTrade.pnlPercent      = ((fillPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100
        openTrade.closedAt        = new Date().toISOString()
        openTrade.holdingPeriodMs = new Date(openTrade.closedAt).getTime() - new Date(openTrade.openedAt).getTime()
        openTrade.commission     += commission
      }
      tradeJournal.set(order.userId, journal)

      const newQty = pos.quantity - order.quantity
      if (newQty <= 0.000001) {
        portfolio.positions.splice(existingLongIdx, 1)
      } else {
        const newMargin = pos.margin ? pos.margin * (newQty / pos.quantity) : undefined
        portfolio.positions[existingLongIdx] = {
          ...pos,
          quantity:       parseFloat(newQty.toFixed(8)),
          margin:         newMargin ? parseFloat(newMargin.toFixed(2)) : undefined,
          notionalValue:  parseFloat((newQty * pos.avgCost).toFixed(2)),
        }
      }

    } else if (lev > 1) {
      // ─── Open leveraged short position ───────────────────────────────────
      portfolio.cashBalance = parseFloat((portfolio.cashBalance - margin - commission).toFixed(2))

      const liqPrice = calcLiquidationPrice(fillPrice, lev, 'short')
      portfolio.positions.push({
        symbol:               order.symbol,
        quantity:             order.quantity,
        avgCost:              fillPrice,
        currentPrice:         fillPrice,
        marketValue:          totalCost,
        unrealizedPnl:        0,
        unrealizedPnlPercent: 0,
        side:                 'short',
        openedAt:             new Date().toISOString(),
        leverage:             lev,
        margin:               parseFloat(margin.toFixed(2)),
        notionalValue:        parseFloat(totalCost.toFixed(2)),
        liquidationPrice:     liqPrice,
      })

      // Record short open in journal
      const journal = tradeJournal.get(order.userId) ?? []
      journal.push({
        id:          uuidv4(),
        userId:      order.userId,
        orderId:     order.id,
        symbol:      order.symbol,
        side:        'sell',
        quantity:    order.quantity,
        entryPrice:  fillPrice,
        commission,
        openedAt:    new Date().toISOString(),
        assetClass:  getAssetClass(order.symbol),
      })
      tradeJournal.set(order.userId, journal)
    }
  }

  refreshPortfolio(portfolio)

  // Record equity point
  recordEquityPoint(order.userId, portfolio)

  // DB persistence is handled exclusively by the route handler (orders.ts).
  // No fire-and-forget saves here - concurrent writes race against the route
  // handler's awaited saves and can cause non-deterministic results in Supabase.

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
// Overnight swap engine - IC Markets rules
//   Triple swap on Wednesday night  : Forex, Metals, Bonds, Soft Commodities
//   Triple swap on Friday   night   : Energies, Indices, Crypto
//   Applied once per day when the server clock passes midnight (GMT+2)
// ---------------------------------------------------------------------------
import { getSwapRate } from './mockDataService'

function getTripleSwapMultiplier(symbol: string, serverDayOfWeek: number): number {
  // serverDayOfWeek: 0=Sun, 1=Mon, …, 3=Wed, 5=Fri
  const ac = getAssetClass(symbol)
  const isWedTripleAsset  = ac === 'forex' || ac === 'bond' ||
    ['XAUUSD','XAGUSD','XPTUSD','XPDUSD','GC25'].includes(symbol) ||
    ['COCOA','COFFEE','CORN','COTTON','OJ','SOYBEAN','SUGAR','WHEAT'].includes(symbol)
  const isFriTripleAsset  = ac === 'crypto' || ac === 'index' ||
    ['WTI','BRENT','NGAS','XBRUSD','HO','LUMBER','COPPER'].includes(symbol)
  if (serverDayOfWeek === 3 && isWedTripleAsset)  return 3
  if (serverDayOfWeek === 5 && isFriTripleAsset)  return 3
  return 1
}

function isDSTActive(date: Date): boolean {
  // EET DST: last Sunday in March → last Sunday in October
  const y = date.getUTCFullYear()
  const marchLastSun  = new Date(Date.UTC(y, 2, 31 - ((new Date(Date.UTC(y, 2, 31)).getUTCDay() + 7) % 7)))
  const octLastSun    = new Date(Date.UTC(y, 9, 31 - ((new Date(Date.UTC(y, 9, 31)).getUTCDay() + 7) % 7)))
  return date >= marchLastSun && date < octLastSun
}

function applyOvernightSwaps(): void {
  const now = new Date()
  const offsetH = isDSTActive(now) ? 3 : 2   // IC Markets server: UTC+2 / UTC+3 DST
  const serverNow = new Date(now.getTime() + offsetH * 3600 * 1000)
  const dow = serverNow.getUTCDay()  // 0=Sun … 6=Sat

  for (const [userId, portfolio] of portfolios.entries()) {
    if (portfolio.positions.length === 0) continue
    let totalSwap = 0
    portfolio.positions = portfolio.positions.map(pos => {
      const { long: swapLong, short: swapShort } = getSwapRate(pos.symbol)
      const dailyRateUSD = pos.side === 'long' ? swapLong : swapShort
      const multiplier   = getTripleSwapMultiplier(pos.symbol, dow)
      const swapUSD      = parseFloat((dailyRateUSD * pos.quantity * multiplier).toFixed(2))
      totalSwap += swapUSD
      return pos  // positions are updated below via cashBalance
    })
    if (totalSwap !== 0) {
      portfolio.cashBalance  = parseFloat((portfolio.cashBalance  + totalSwap).toFixed(2))
      portfolio.realizedPnl  = parseFloat((portfolio.realizedPnl + totalSwap).toFixed(2))
      refreshPortfolio(portfolio)
      tradeEvents.emit('swapApplied', { userId, swapUSD: totalSwap, timestamp: Date.now() })
    }
  }
}

// Schedule swap application at midnight server time (check every minute)
let _lastSwapDate = ''
setInterval(() => {
  const now = new Date()
  const offsetH = isDSTActive(now) ? 3 : 2
  const server = new Date(now.getTime() + offsetH * 3600 * 1000)
  const dateStr = server.toISOString().slice(0, 10)          // 'YYYY-MM-DD'
  const timeStr = server.toISOString().slice(11, 16)         // 'HH:MM'
  // Apply swap once per day between 00:00 and 00:01 server time
  if (timeStr >= '00:00' && timeStr <= '00:01' && dateStr !== _lastSwapDate) {
    _lastSwapDate = dateStr
    applyOvernightSwaps()
  }
}, 60_000)

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
  let peak = 0, maxDrawdownAbs = 0, maxDrawdownPct = 0
  for (const pt of curve) {
    if (pt.equity > peak) peak = pt.equity
    const ddAbs = peak > 0 ? peak - pt.equity : 0
    const ddPct = peak > 0 ? (ddAbs / peak) * 100 : 0
    if (ddPct > maxDrawdownPct) { maxDrawdownPct = ddPct; maxDrawdownAbs = ddAbs }
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

  const winRateDecimal = closed.length > 0 ? wins.length / closed.length : 0
  const expectancy     = winRateDecimal * avgWin + (1 - winRateDecimal) * avgLoss

  return {
    userId,
    totalTrades:          closed.length,
    winningTrades:        wins.length,
    losingTrades:         losses.length,
    winRate:              parseFloat(winRateDecimal.toFixed(4)),
    netProfit:            parseFloat(totalNetPnl.toFixed(2)),
    totalNetPnl:          parseFloat(totalNetPnl.toFixed(2)),
    totalGrossPnl:        parseFloat(totalGrossPnl.toFixed(2)),
    grossProfit:          parseFloat(grossProfit.toFixed(2)),
    grossLoss:            parseFloat(grossLoss.toFixed(2)),
    totalCommissions:     parseFloat(totalCommissions.toFixed(2)),
    avgWin:               parseFloat(avgWin.toFixed(2)),
    avgLoss:              parseFloat(avgLoss.toFixed(2)),
    expectancy:           parseFloat(expectancy.toFixed(2)),
    profitFactor:         parseFloat(profitFactor.toFixed(2)),
    maxDrawdown:          parseFloat(maxDrawdownAbs.toFixed(2)),
    maxDrawdownPercent:   parseFloat(maxDrawdownPct.toFixed(2)),
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
// Watcher system - processes limit, stop, stop-limit, trailing-stop, TP/SL
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

// Master poller - 500ms interval
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
        // TP/SL - create and fill a synthetic market order
        try {
          const syntheticOrder = createOrder(w.userId, w.symbol, w.side, 'market', w.quantity)
          setTimeout(() => executeOrder(syntheticOrder.id, fillPrice ?? mp), 50)
        } catch { /* position may already be closed */ }
      }
    }
  }

  // ── Liquidation checker - force-close leveraged positions at 90% margin loss ──
  for (const [userId, portfolio] of portfolios.entries()) {
    for (const pos of [...portfolio.positions]) {
      const lev = pos.leverage ?? 1
      if (lev <= 1) continue
      const mp       = getLivePrice(pos.symbol)
      const upnl     = (mp - pos.avgCost) * pos.quantity * (pos.side === 'short' ? -1 : 1)
      const posMargin = pos.margin ?? (pos.avgCost * pos.quantity / lev)
      if (upnl <= -(posMargin * 0.9)) {
        // Mark liquidation price on position so UI can show it
        const closeSide: OrderSide = pos.side === 'long' ? 'sell' : 'buy'
        try {
          const liqOrder = createOrder(userId, pos.symbol, closeSide, 'market', pos.quantity, undefined, undefined, 'GTC', undefined, undefined, undefined, `LIQUIDATION ${lev}x`)
          setTimeout(() => executeOrder(liqOrder.id, mp), 30)
          tradeEvents.emit('liquidation', { userId, symbol: pos.symbol, side: pos.side, leverage: lev, price: mp })
        } catch { /* best-effort */ }
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
  dbSaveOrder(order).catch((e: unknown) => console.error('[DB]', e))

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

  // To close a short → buy back; to close a long → sell
  const closeSide: OrderSide = pos.side === 'short' ? 'buy' : 'sell'
  const leverage = pos.leverage ?? 1

  return createOrder(userId, symbol, closeSide, 'market', pos.quantity, undefined, undefined, 'GTC', undefined, undefined, undefined, 'Close position', leverage)
}
