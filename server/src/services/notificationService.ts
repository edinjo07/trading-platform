/**
 * notificationService.ts
 *
 * Creates and reads account/trading event notifications (the bell inbox).
 * Inserts are fire-and-forget and resilient: if the `notifications` table
 * hasn't been migrated yet, errors are swallowed so nothing else breaks.
 */

import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../db'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical'

export interface NotificationInput {
  type:      string
  severity?: NotificationSeverity
  title:     string
  message:   string
  metadata?: Record<string, unknown>
}

// ── Throttle: avoid spamming the same recurring notification type per user ─────
const lastSent = new Map<string, number>()

/** Returns true (and records) only if the key hasn't fired within `windowMs`. */
function throttle(key: string, windowMs: number): boolean {
  const now = Date.now()
  const prev = lastSent.get(key) ?? 0
  if (now - prev < windowMs) return false
  lastSent.set(key, now)
  return true
}

/** Insert a notification (fire-and-forget). */
export async function createNotification(userId: string, n: NotificationInput): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      id:         uuidv4(),
      user_id:    userId,
      type:       n.type,
      severity:   n.severity ?? 'info',
      title:      n.title,
      message:    n.message,
      metadata:   n.metadata ?? {},
      read:       false,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[Notify] insert failed (run add_notifications.sql?):', err instanceof Error ? err.message : err)
  }
}

/** Throttled variant — only creates if `key` hasn't fired within `windowMs`. */
export async function createThrottledNotification(
  userId: string, key: string, windowMs: number, n: NotificationInput
): Promise<boolean> {
  if (!throttle(`${userId}:${key}`, windowMs)) return false
  await createNotification(userId, n)
  return true
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export interface NotificationRow {
  id: string; type: string; severity: NotificationSeverity
  title: string; message: string; metadata: Record<string, unknown>
  read: boolean; created_at: string
}

export async function listNotifications(userId: string, limit = 50): Promise<{ notifications: NotificationRow[]; unread: number }> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, severity, title, message, metadata, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    // Table missing or other error — return empty so the UI degrades gracefully
    return { notifications: [], unread: 0 }
  }
  const notifications = (data ?? []) as NotificationRow[]
  const unread = notifications.filter(n => !n.read).length
  return { notifications, unread }
}

export async function markRead(userId: string, id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId)
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId)
}

export async function clearAll(userId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('user_id', userId)
}
