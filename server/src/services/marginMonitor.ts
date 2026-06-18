/**
 * marginMonitor.ts
 *
 * Capital.com-style margin engine. Every 10s it computes each account's margin
 * level (equity / used margin) and:
 *   • below the warning level → "margin requires attention" notification (throttled)
 *   • at/below the closeout level → "margin closeout" notification, then closes
 *     the worst-losing position (one per tick) → "position closed" notification
 *
 * Reuses orderEngine.closePosition so closeouts settle like any other close.
 */

import { supabase } from '../db'
import { getPrice } from './priceService'
import { getSymbolInfo } from './mockDataService'
import { closePosition } from './orderEngine'
import { createNotification, createThrottledNotification } from './notificationService'
import { PositionRow, AccountMode } from '../types'

const TICK_MS        = 10_000
const WARNING_LEVEL  = 100          // margin level % — below this needs attention
const CLOSEOUT_LEVEL = 50           // at/below this, positions begin to close
const WARN_THROTTLE  = 20 * 60_000  // 20 min between warning notifications

function getFxRate(currency: string): number {
  if (currency === 'EUR') return getPrice('EURUSD') ?? 1
  if (currency === 'GBP') return getPrice('GBPUSD') ?? 1
  return 1
}

let timer: ReturnType<typeof setInterval> | null = null

export function startMarginMonitor(): void {
  if (timer) return
  timer = setInterval(() => { runCheck().catch(err => console.error('[Margin] error', err)) }, TICK_MS)
  console.log('[Margin Monitor] Started — checking margin levels every 10 s')
}

export function stopMarginMonitor(): void {
  if (timer) { clearInterval(timer); timer = null }
}

async function runCheck(): Promise<void> {
  const { data: posData, error } = await supabase
    .from('positions')
    .select('id, user_id, mode, symbol, side, quantity, avg_price, leverage, margin')
  if (error || !posData || posData.length === 0) return
  const positions = posData as PositionRow[]

  // Group by user_id + mode (one margin pool per account mode)
  const groups = new Map<string, PositionRow[]>()
  for (const p of positions) {
    const key = `${p.user_id}:${p.mode}`
    const arr = groups.get(key)
    if (arr) arr.push(p); else groups.set(key, [p])
  }

  for (const [key, posList] of groups) {
    const [userId, mode] = key.split(':') as [string, AccountMode]
    try { await checkAccount(userId, mode, posList) } catch (e) { console.error('[Margin] account check', e) }
  }
}

async function checkAccount(userId: string, mode: AccountMode, posList: PositionRow[]): Promise<void> {
  const { data: accts } = await supabase
    .from('accounts').select('cash_balance, currency').eq('user_id', userId).eq('mode', mode)
  if (!accts || accts.length === 0) return
  // Positions aren't currency-scoped; use the account with the most cash for this mode.
  const acct = [...accts].sort((a, b) => (Number(b.cash_balance) || 0) - (Number(a.cash_balance) || 0))[0]
  const currency = (acct.currency as string) ?? 'USD'
  const cash = Number(acct.cash_balance) || 0
  const fx = getFxRate(currency)

  let usedMargin = 0, unrealized = 0
  for (const p of posList) {
    usedMargin += Number(p.margin) || 0
    const price = getPrice(p.symbol)
    if (!price) continue
    const rawUsd = p.side === 'long' ? (price - p.avg_price) * p.quantity : (p.avg_price - price) * p.quantity
    unrealized += rawUsd / fx
  }
  if (usedMargin <= 0) return

  const equity      = cash + usedMargin + unrealized
  const marginLevel = (equity / usedMargin) * 100

  if (marginLevel > WARNING_LEVEL) return  // healthy

  if (marginLevel > CLOSEOUT_LEVEL) {
    await createThrottledNotification(userId, `margin_warn:${mode}`, WARN_THROTTLE, {
      type: 'margin_warning', severity: 'warning',
      title: 'Margin level requires attention',
      message: 'Your margin level requires attention. Add funds, reduce your orders, or close positions to maintain your account.',
      metadata: { mode, marginLevel: Math.round(marginLevel) },
    })
    return
  }

  // Closeout band — header notification (throttled), then close the worst position
  await createThrottledNotification(userId, `margin_closeout:${mode}`, 60_000, {
    type: 'margin_closeout', severity: 'critical',
    title: 'Margin closeout',
    message: 'Your margin has reached closeout level. Pending orders will be cancelled and open positions will begin to close.',
    metadata: { mode, marginLevel: Math.round(marginLevel) },
  })

  let worst: { p: PositionRow; pnl: number } | null = null
  for (const p of posList) {
    const price = getPrice(p.symbol); if (!price) continue
    const rawUsd = p.side === 'long' ? (price - p.avg_price) * p.quantity : (p.avg_price - price) * p.quantity
    const pnl = rawUsd / fx
    if (!worst || pnl < worst.pnl) worst = { p, pnl }
  }
  if (!worst) return

  try {
    await closePosition(worst.p.id, userId, mode, currency)
    const name = getSymbolInfo(worst.p.symbol)?.name ?? worst.p.symbol
    await createNotification(userId, {
      type: 'position_closed', severity: 'critical',
      title: 'Position closed',
      message: `Your ${name} position has been closed. Margin level was insufficient to keep it open.`,
      metadata: { symbol: worst.p.symbol, mode },
    })
  } catch (e) {
    console.error('[Margin] closeout close failed', e)
  }
}
