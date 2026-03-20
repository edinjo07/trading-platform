/**
 * TradingView Trading Platform — Broker API
 *
 * Implements IBrokerTerminal to enable chart-native trading: order lines,
 * position lines, execution marks, and the Account Manager panel.
 *
 * Docs: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/
 */

import { getOrders, placeOrder, cancelOrder as cancelOrderApi, type PlaceOrderParams } from './orders'
import { getPositions, closePositionApi } from './positions'
import { getPortfolio } from './portfolio'
import type { Order, Position } from '../types'

// ---------------------------------------------------------------------------
// Mapping helpers — our domain types ↔ TV numeric codes
// TV const enum values (inlined by TypeScript): OrderStatus.Working=8, Filled=6,
// Cancelled=4, Rejected=5; OrderType.Market=1,Limit=2,Stop=3,StopLimit=4,TrailingStop=5
// Side.Buy=1, Side.Sell=2
// ---------------------------------------------------------------------------

function toTvOrderStatus(status: Order['status']): Charting_Library.OrderStatus {
  switch (status) {
    case 'pending':   return 8 as Charting_Library.OrderStatus  // Working
    case 'open':      return 8 as Charting_Library.OrderStatus  // Working
    case 'filled':    return 6 as Charting_Library.OrderStatus  // Filled
    case 'cancelled': return 4 as Charting_Library.OrderStatus  // Cancelled
    case 'rejected':  return 5 as Charting_Library.OrderStatus  // Rejected
    default:          return 8 as Charting_Library.OrderStatus
  }
}

function toTvOrderType(type: Order['type']): Charting_Library.OrderType {
  switch (type) {
    case 'market':        return 1 as Charting_Library.OrderType  // Market
    case 'limit':         return 2 as Charting_Library.OrderType  // Limit
    case 'stop':          return 3 as Charting_Library.OrderType  // Stop
    case 'stop_limit':    return 4 as Charting_Library.OrderType  // StopLimit
    case 'trailing_stop': return 5 as Charting_Library.OrderType  // TrailingStop
    default:              return 1 as Charting_Library.OrderType
  }
}

function fromTvOrderType(type: Charting_Library.OrderType): Order['type'] {
  switch (type as number) {
    case 2: return 'limit'
    case 3: return 'stop'
    case 4: return 'stop_limit'
    case 5: return 'trailing_stop'
    default: return 'market'
  }
}

function toTvSide(side: Order['side']): Charting_Library.Side {
  return (side === 'buy' ? 1 : 2) as Charting_Library.Side
}

function fromTvSide(side: Charting_Library.Side): Order['side'] {
  return (side as number) === 1 ? 'buy' : 'sell'
}

function orderToTvOrder(o: Order): Charting_Library.BrokerOrder {
  return {
    id:         o.id,
    symbol:     o.symbol,
    type:       toTvOrderType(o.type),
    side:       toTvSide(o.side),
    qty:        o.quantity,
    status:     toTvOrderStatus(o.status),
    limitPrice: o.price,
    stopPrice:  o.stopPrice,
    avgPrice:   o.avgFillPrice,
    filledQty:  o.filledQuantity,
  }
}

function positionToTvPosition(p: Position): Charting_Library.BrokerPosition {
  return {
    id:           p.symbol,
    symbol:       p.symbol,
    qty:          p.quantity,
    side:         (p.side === 'long' ? 1 : 2) as Charting_Library.Side,
    avgPrice:     p.avgCost,
    unrealizedPL: p.unrealizedPnl,
  }
}

// ---------------------------------------------------------------------------
// Noop delegate — required by AccountManagerTable but we push updates via fullUpdate()
// ---------------------------------------------------------------------------
const noopDelegate: Charting_Library.SimpleDelegate = {
  subscribe: () => {},
  unsubscribe: () => {},
}

// ---------------------------------------------------------------------------
// Broker implementation
// ---------------------------------------------------------------------------
export class TVBrokerApi implements Charting_Library.IBrokerTerminal {
  private host: Charting_Library.IBrokerConnectionAdapterHost | null = null

  constructor(host?: Charting_Library.IBrokerConnectionAdapterHost) {
    if (host) this.host = host
  }

  onReady(host: Charting_Library.IBrokerConnectionAdapterHost): void {
    this.host = host
  }

  // Real-time symbol feed is handled by TVDatafeed's WebSocket — nothing extra here.
  subscribeRealtime(_symbol: string): void {}
  unsubscribeRealtime(_symbol: string): void {}

  // ─── Data fetchers ─────────────────────────────────────────────────────
  async orders(): Promise<Charting_Library.BrokerOrder[]> {
    const orders = await getOrders()
    return orders
      .filter(o => o.status === 'pending' || o.status === 'open')
      .map(orderToTvOrder)
  }

  async positions(): Promise<Charting_Library.BrokerPosition[]> {
    const positions = await getPositions()
    return positions.map(positionToTvPosition)
  }

  async executions(symbol: string): Promise<Charting_Library.Execution[]> {
    // Map filled orders for this symbol to TV Execution objects.
    // TV uses these to draw execution marks on the chart.
    const orders = await getOrders()
    return orders
      .filter(o => o.symbol === symbol && o.status === 'filled' && o.avgFillPrice != null)
      .map(o => ({
        id:          o.id,
        symbol:      o.symbol,
        brokerTime:  o.filledAt ?? o.updatedAt,
        side:        toTvSide(o.side),
        qty:         o.filledQuantity,
        price:       o.avgFillPrice!,
        time:        new Date(o.filledAt ?? o.updatedAt).getTime(),
        commission:  o.commission,
      } satisfies Charting_Library.Execution));
  }

  async accountInfo(): Promise<Charting_Library.AccountInfo> {
    const portfolio = await getPortfolio()
    return {
      id:           portfolio.userId,
      name:         'Trading Account',
      currency:     'USD',
      currencySign: '$',
      balance:      portfolio.cashBalance,
      equity:       portfolio.totalEquity,
      unrealizedPL: portfolio.unrealizedPnl,
    }
  }

  // ─── Order lifecycle ───────────────────────────────────────────────────
  async placeOrder(
    preOrder: Charting_Library.PreOrder,
    confirmCallback: (order: Charting_Library.BrokerOrder) => void,
  ): Promise<void> {
    const params: PlaceOrderParams = {
      symbol:    preOrder.symbol,
      side:      fromTvSide(preOrder.side),
      type:      fromTvOrderType(preOrder.type),
      quantity:  preOrder.qty,
      price:     preOrder.limitPrice,
      stopPrice: preOrder.stopPrice,
    }
    const placed = await placeOrder(params)
    confirmCallback(orderToTvOrder(placed))
    this.host?.fullUpdate()
  }

  async cancelOrder(orderId: string, confirmCallback: () => void): Promise<void> {
    await cancelOrderApi(orderId)
    confirmCallback()
    this.host?.fullUpdate()
  }

  async modifyOrder(
    order: Charting_Library.BrokerOrder,
    confirmCallback: (order: Charting_Library.BrokerOrder) => void,
  ): Promise<void> {
    // Our backend has no PATCH /orders endpoint; acknowledge the call so TV
    // doesn't hang, then request a full refresh so state stays consistent.
    confirmCallback(order)
    this.host?.fullUpdate()
  }

  // ─── Optional helpers ─────────────────────────────────────────────────
  async isTradable(_symbol: string): Promise<boolean> {
    return true
  }

  // ─── Account Manager panel ────────────────────────────────────────────
  accountManagerInfo(): Charting_Library.AccountManagerInfo {
    // Keep a stable reference to `this` for the getData closures.
    const self = this
    return {
      accountTitle: 'Account Overview',
      pages: [
        {
          id:    'orders',
          title: 'Orders',
          tables: [
            {
              id:    'orders',
              title: 'Open Orders',
              columns: [
                { id: 'symbol',     title: 'Symbol',     alignment: 'left'   },
                { id: 'side',       title: 'Side',       alignment: 'center' },
                { id: 'type',       title: 'Type',       alignment: 'center' },
                { id: 'qty',        title: 'Qty',        alignment: 'right'  },
                { id: 'limitPrice', title: 'Limit Price', alignment: 'right', formatter: 'formatPrice' },
                { id: 'status',     title: 'Status',     alignment: 'center' },
              ],
              getData: () => self.orders() as Promise<unknown[]>,
              changeDelegate: noopDelegate,
              errorDelegate:  noopDelegate,
            },
          ],
        },
        {
          id:    'positions',
          title: 'Positions',
          tables: [
            {
              id:    'positions',
              title: 'Open Positions',
              columns: [
                { id: 'symbol',       title: 'Symbol',    alignment: 'left'   },
                { id: 'qty',          title: 'Qty',       alignment: 'right'  },
                { id: 'side',         title: 'Side',      alignment: 'center' },
                { id: 'avgPrice',     title: 'Avg Price', alignment: 'right', formatter: 'formatPrice' },
                { id: 'unrealizedPL', title: 'P&L',       alignment: 'right', formatter: 'formatPrice' },
              ],
              getData: () => self.positions() as Promise<unknown[]>,
              changeDelegate: noopDelegate,
              errorDelegate:  noopDelegate,
            },
          ],
        },
      ],
    }
  }
}

/** Singleton reused by all chart widget instances. */
export const tvBrokerApi = new TVBrokerApi()
