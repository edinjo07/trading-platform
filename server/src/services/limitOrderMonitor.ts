/**
 * limitOrderMonitor.ts
 *
 * In-memory limit order queue. Orders are stored here and executed as market
 * orders the moment the current price crosses the user's target price.
 *
 * Trigger rules (set at placement time relative to current price):
 *   BUY  with limitPrice < currentPrice → trigger when price drops to   limitPrice (price <= limit)
 *   BUY  with limitPrice > currentPrice → trigger when price rises to   limitPrice (price >= limit)
 *   SELL with limitPrice > currentPrice → trigger when price rises to   limitPrice (price >= limit)
 *   SELL with limitPrice < currentPrice → trigger when price drops to   limitPrice (price <= limit)
 */

import { v4 as uuidv4 } from 'uuid'
import { getPrice } from './priceService'
import { placeMarketOrder } from './orderEngine'
import { AccountMode, OrderSide } from '../types'

export interface PendingLimitOrder {
  id:          string
  userId:      string
  mode:        AccountMode
  currency:    string
  symbol:      string
  side:        OrderSide
  quantity:    number
  limitPrice:  number
  condition:   'lte' | 'gte'   // price <= limit  OR  price >= limit
  leverage:    number
  takeProfit?: number
  stopLoss?:   number
  createdAt:   string
}

const pending = new Map<string, PendingLimitOrder>()
let timer: ReturnType<typeof setInterval> | null = null

export function addLimitOrder(
  params: Omit<PendingLimitOrder, 'id' | 'createdAt'>
): string {
  const id = uuidv4()
  pending.set(id, { ...params, id, createdAt: new Date().toISOString() })
  console.log(
    `[Limit] Queued ${params.side.toUpperCase()} ${params.quantity} ${params.symbol}` +
    ` @ ${params.limitPrice} (trigger: price ${params.condition} ${params.limitPrice})`
  )
  return id
}

export function cancelLimitOrder(id: string, userId: string): boolean {
  const order = pending.get(id)
  if (!order || order.userId !== userId) return false
  pending.delete(id)
  return true
}

export function getPendingLimitOrders(userId: string, mode: AccountMode): PendingLimitOrder[] {
  return Array.from(pending.values()).filter(o => o.userId === userId && o.mode === mode)
}

export function startLimitMonitor(): void {
  if (timer) return
  timer = setInterval(runCheck, 1_000)
  console.log('[Limit Monitor] Started — polling every 1 s')
}

export function stopLimitMonitor(): void {
  if (timer) { clearInterval(timer); timer = null }
}

async function runCheck(): Promise<void> {
  if (pending.size === 0) return

  for (const [id, order] of pending) {
    const price = getPrice(order.symbol)
    if (!price) continue

    const triggered = order.condition === 'lte'
      ? price <= order.limitPrice
      : price >= order.limitPrice
    if (!triggered) continue

    pending.delete(id)
    console.log(
      `[Limit] TRIGGERED ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}` +
      ` @ market ${price} (limit was ${order.limitPrice})`
    )

    try {
      await placeMarketOrder(order.userId, order.mode, {
        symbol:     order.symbol,
        side:       order.side,
        quantity:   order.quantity,
        leverage:   order.leverage,
        takeProfit: order.takeProfit,
        stopLoss:   order.stopLoss,
        currency:   order.currency,
      })
    } catch (err) {
      console.error(`[Limit] Execution failed for ${id}:`, err)
    }
  }
}
