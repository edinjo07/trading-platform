/**
 * alertMonitor.ts
 *
 * Background loop that checks every ACTIVE price alert against the current
 * market price. When an alert's condition is met it is flipped to 'triggered'
 * (atomically, so it fires exactly once) and a bell notification is created.
 *
 * This is what makes alerts fire even when the user's browser is closed —
 * the client no longer evaluates alerts itself.
 */

import { supabase } from '../db'
import { getPrice } from './priceService'
import { getSymbolInfo } from './mockDataService'
import { createNotification } from './notificationService'

let timer: ReturnType<typeof setInterval> | null = null

export function startAlertMonitor(): void {
  if (timer) return
  timer = setInterval(runCheck, 3_000)
  console.log('[Alert Monitor] Started — checking price alerts every 3 s')
}

export function stopAlertMonitor(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[Alert Monitor] Stopped')
  }
}

interface AlertRow {
  id: string; user_id: string; symbol: string
  condition: 'above' | 'below'; target_price: number
}

async function runCheck(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('price_alerts')
      .select('id, user_id, symbol, condition, target_price')
      .eq('status', 'active')

    if (error) return          // table not migrated yet — degrade quietly
    if (!data?.length) return

    for (const a of data as AlertRow[]) {
      const price = getPrice(a.symbol)
      if (price == null) continue

      const target = Number(a.target_price)
      const hit = (a.condition === 'above' && price >= target)
               || (a.condition === 'below' && price <= target)
      if (!hit) continue

      // Flip to 'triggered' only if still active — guarantees a single fire even
      // if two ticks race.
      const { data: updated, error: uErr } = await supabase
        .from('price_alerts')
        .update({ status: 'triggered', triggered_at: new Date().toISOString(), current_price: price })
        .eq('id', a.id)
        .eq('status', 'active')
        .select('id')

      if (uErr || !updated?.length) continue

      const name = getSymbolInfo(a.symbol)?.name ?? a.symbol
      const arrow = a.condition === 'above' ? 'risen above' : 'fallen below'
      await createNotification(a.user_id, {
        type:     'alert',
        severity: 'info',
        title:    'Price alert triggered',
        message:  `${name} has ${arrow} your target of ${target} — now trading at ${price}.`,
        metadata: { symbol: a.symbol, condition: a.condition, target, price },
      })
      console.log(`[Alert Monitor] Triggered — ${a.symbol} ${a.condition} ${target} @ ${price}`)
    }
  } catch (err) {
    console.error('[Alert Monitor] Unexpected error:', err)
  }
}
