/**
 * slMonitor.ts
 *
 * Background loop that runs every second and checks every open position
 * that has a stop-loss or take-profit set against the current market price.
 *
 * When a trigger fires, it calls closePosition() which is the same atomic
 * function used for manual closes — consistent behaviour guaranteed.
 */

import { supabase } from '../db'
import { getPrice } from './priceService'
import { getSymbolInfo } from './mockDataService'
import { closePosition } from './orderEngine'
import { createNotification } from './notificationService'
import { PositionRow, AccountMode } from '../types'

let timer: ReturnType<typeof setInterval> | null = null

export function startSLMonitor(): void {
  if (timer) return
  timer = setInterval(runCheck, 1_000)
  console.log('[SL Monitor] Started — checking SL/TP every 1 s')
}

export function stopSLMonitor(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[SL Monitor] Stopped')
  }
}

async function runCheck(): Promise<void> {
  try {
    // Only load positions that actually have SL or TP set
    const { data, error } = await supabase
      .from('positions')
      .select('id, user_id, mode, symbol, side, avg_price, leverage, take_profit, stop_loss')
      .or('take_profit.not.is.null,stop_loss.not.is.null')

    if (error) {
      console.error('[SL Monitor] DB query failed:', error.message)
      return
    }
    if (!data?.length) return

    for (const row of data as PositionRow[]) {
      const price = getPrice(row.symbol)
      if (!price) continue

      const tp = row.take_profit
      const sl = row.stop_loss

      const triggered =
        row.side === 'long'
          ? (tp !== null && price >= tp) || (sl !== null && price <= sl)
          : (tp !== null && price <= tp) || (sl !== null && price >= sl)

      if (!triggered) continue

      const reason = (() => {
        if (row.side === 'long') {
          if (tp !== null && price >= tp) return 'take-profit'
          if (sl !== null && price <= sl) return 'stop-loss'
        } else {
          if (tp !== null && price <= tp) return 'take-profit'
          if (sl !== null && price >= sl) return 'stop-loss'
        }
        return 'unknown'
      })()

      console.log(
        `[SL Monitor] ${reason.toUpperCase()} triggered — ${row.symbol} ${row.side} ` +
        `@ ${price} (trigger: ${reason === 'take-profit' ? tp : sl})`
      )

      try {
        // Resolve account currency — unambiguous when user has one account for this mode
        const { data: accts } = await supabase
          .from('accounts')
          .select('currency')
          .eq('user_id', row.user_id)
          .eq('mode', row.mode)
        const currency = accts?.length === 1 ? (accts[0].currency ?? 'USD') : 'USD'
        await closePosition(row.id, row.user_id, row.mode as AccountMode, currency)
        const name = getSymbolInfo(row.symbol)?.name ?? row.symbol
        const isTp = reason === 'take-profit'
        await createNotification(row.user_id, {
          type:     isTp ? 'tp_hit' : 'sl_hit',
          severity: isTp ? 'success' : 'warning',
          title:    isTp ? 'Take-profit reached' : 'Stop-loss reached',
          message:  `Your ${name} position has been closed — ${isTp ? 'take-profit' : 'stop-loss'} level reached.`,
          metadata: { symbol: row.symbol, mode: row.mode },
        })
      } catch (err) {
        console.error(`[SL Monitor] Auto-close failed for position ${row.id}:`, err)
      }
    }
  } catch (err) {
    console.error('[SL Monitor] Unexpected error:', err)
  }
}
