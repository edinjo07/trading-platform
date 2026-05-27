/**
 * TradingView Trading Platform - Broker API
 *
 * Implements IBrokerTerminal to enable chart-native trading: order lines,
 * position lines, execution marks, and the Account Manager panel.
 *
 * Docs: https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/
 */

import { getOrders, placeOrder, type PlaceOrderParams, type PlaceOrderResult } from './orders'
import { closePositionApi } from './positions'
import { getPortfolio } from './portfolio'
import { useAuthStore } from '../store/authStore'
import type { Order, Position } from '../types'

// ---------------------------------------------------------------------------
// Mapping helpers - our domain types ↔ TV numeric codes
// TV const enum values (inlined by TypeScript): OrderStatus.Working=8, Filled=6,
// Cancelled=4, Rejected=5; OrderType.Market=1,Limit=2,Stop=3,StopLimit=4,TrailingStop=5
// Side.Buy=1, Side.Sell=2
// ---------------------------------------------------------------------------

function toTvOrderStatus(status: string): Charting_Library.OrderStatus {
  switch (status) {
    case 'pending':   return 8 as Charting_Library.OrderStatus
    case 'open':      return 8 as Charting_Library.OrderStatus
    case 'filled':    return 6 as Charting_Library.OrderStatus
    case 'cancelled': return 4 as Charting_Library.OrderStatus
    case 'rejected':  return 5 as Charting_Library.OrderStatus
    default:          return 8 as Charting_Library.OrderStatus
  }
}

function toTvOrderType(_type: string): Charting_Library.OrderType {
  return 1 as Charting_Library.OrderType  // all orders are market
}

function fromTvOrderType(_type: Charting_Library.OrderType): 'market' {
  return 'market'
}

function toTvSide(side: Order['side']): Charting_Library.Side {
  return (side === 'buy' ? 1 : 2) as Charting_Library.Side
}

function fromTvSide(side: Charting_Library.Side): Order['side'] {
  return (side as number) === 1 ? 'buy' : 'sell'
}

function orderToTvOrder(o: Order): Charting_Library.BrokerOrder {
  return {
    id:        o.id,
    symbol:    o.symbol,
    type:      toTvOrderType(o.type),
    side:      toTvSide(o.side),
    qty:       o.quantity,
    status:    toTvOrderStatus(o.status),
    avgPrice:  o.fill_price,
    filledQty: o.quantity,
  }
}

function resultToTvOrder(r: PlaceOrderResult): Charting_Library.BrokerOrder {
  return {
    id:        r.id,
    symbol:    r.symbol,
    type:      1 as Charting_Library.OrderType,
    side:      toTvSide(r.side),
    qty:       r.quantity,
    status:    6 as Charting_Library.OrderStatus,  // Filled
    avgPrice:  r.fillPrice,
    filledQty: r.quantity,
  }
}

function positionToTvPosition(p: Position): Charting_Library.BrokerPosition {
  return {
    id:           p.id,
    symbol:       p.symbol,
    qty:          p.quantity,
    side:         (p.side === 'long' ? 1 : 2) as Charting_Library.Side,
    avgPrice:     p.avg_price,
    unrealizedPL: p.unrealizedPnl,
  }
}

// ---------------------------------------------------------------------------
// Noop delegate - required by AccountManagerTable but we push updates via fullUpdate()
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

  // Real-time symbol feed is handled by TVDatafeed's WebSocket - nothing extra here.
  subscribeRealtime(_symbol: string): void {}
  unsubscribeRealtime(_symbol: string): void {}

  // ─── Data fetchers ─────────────────────────────────────────────────────
  async orders(): Promise<Charting_Library.BrokerOrder[]> {
    // New system: all orders are immediately filled, none stay open
    return []
  }

  async positions(): Promise<Charting_Library.BrokerPosition[]> {
    const portfolio = await getPortfolio()
    return (portfolio?.positions ?? []).map(positionToTvPosition)
  }

  async executions(symbol: string): Promise<Charting_Library.Execution[]> {
    const orders = await getOrders()
    return orders
      .filter(o => o.symbol === symbol && o.status === 'filled')
      .map(o => ({
        id:         o.id,
        symbol:     o.symbol,
        brokerTime: o.created_at,
        side:       toTvSide(o.side),
        qty:        o.quantity,
        price:      o.fill_price,
        time:       new Date(o.created_at).getTime(),
        commission: o.commission,
      } satisfies Charting_Library.Execution))
  }

  async accountInfo(): Promise<Charting_Library.AccountInfo> {
    const portfolio = await getPortfolio()
    const currency = useAuthStore.getState().user?.currency ?? 'USD'
    const currencySignMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
    return {
      id:           'account',
      name:         'Trading Account',
      currency,
      currencySign: currencySignMap[currency] ?? '$',
      balance:      portfolio?.cashBalance ?? 0,
      equity:       portfolio?.totalEquity ?? 0,
      unrealizedPL: portfolio?.unrealizedPnl ?? 0,
    }
  }

  // ─── Order lifecycle ───────────────────────────────────────────────────
  async placeOrder(
    preOrder: Charting_Library.PreOrder,
    confirmCallback: (order: Charting_Library.BrokerOrder) => void,
  ): Promise<void> {
    const params: PlaceOrderParams = {
      symbol:   preOrder.symbol,
      side:     fromTvSide(preOrder.side),
      quantity: preOrder.qty,
    }
    const placed = await placeOrder(params)
    confirmCallback(resultToTvOrder(placed))
    this.host?.fullUpdate()
  }

  async cancelOrder(_orderId: string, confirmCallback: () => void): Promise<void> {
    // Market orders cannot be cancelled; acknowledge to keep TV happy
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
