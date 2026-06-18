import { create } from 'zustand'
import {
  getNotifications, markNotifRead, markAllNotifRead, deleteNotif, clearAllNotifs,
  AppNotification, NotifSeverity,
} from '../api/notifications'
import { useToastStore, ToastVariant } from './toastStore'

interface NotifState {
  notifications: AppNotification[]
  unread:        number
  loaded:        boolean
  poll:          () => Promise<void>
  markRead:      (id: string) => Promise<void>
  markAllRead:   () => Promise<void>
  remove:        (id: string) => Promise<void>
  clearAll:      () => Promise<void>
  start:         () => void
  stop:          () => void
}

let timer: ReturnType<typeof setInterval> | null = null
const seen = new Set<string>()
let firstPoll = true

function toastVariant(sev: NotifSeverity): ToastVariant {
  return sev === 'critical' ? 'error' : sev === 'warning' ? 'warning' : sev === 'success' ? 'success' : 'info'
}

export const useNotificationsStore = create<NotifState>((set, get) => ({
  notifications: [],
  unread:        0,
  loaded:        false,

  poll: async () => {
    try {
      const { notifications, unread } = await getNotifications()
      // Toast newly-arrived notifications. Skip the very first poll so we don't
      // flood the screen with the existing backlog on page load.
      if (!firstPoll) {
        // High-volume / low-priority events (bot trades, limit placed) carry
        // metadata.silent — they populate the inbox but don't pop a toast.
        const fresh = notifications.filter(n => !seen.has(n.id) && n.metadata?.silent !== true)
        const { addToast } = useToastStore.getState()
        for (const n of [...fresh].reverse()) {
          addToast({
            variant:  toastVariant(n.severity),
            title:    n.title,
            message:  n.message,
            duration: n.severity === 'critical' ? 0 : 7000,
          })
          // Best-effort native notification for critical events
          try {
            if (n.severity === 'critical' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(n.title, { body: n.message })
            }
          } catch { /* ignore */ }
        }
      }
      notifications.forEach(n => seen.add(n.id))
      firstPoll = false
      set({ notifications, unread, loaded: true })
    } catch { /* ignore — degrade quietly */ }
  },

  markRead: async (id) => {
    set(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      return { notifications, unread: notifications.filter(n => !n.read).length }
    })
    try { await markNotifRead(id) } catch { /* ignore */ }
  },

  markAllRead: async () => {
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })), unread: 0 }))
    try { await markAllNotifRead() } catch { /* ignore */ }
  },

  remove: async (id) => {
    set(s => {
      const notifications = s.notifications.filter(n => n.id !== id)
      return { notifications, unread: notifications.filter(n => !n.read).length }
    })
    try { await deleteNotif(id) } catch { /* ignore */ }
  },

  clearAll: async () => {
    set({ notifications: [], unread: 0 })
    try { await clearAllNotifs() } catch { /* ignore */ }
  },

  start: () => {
    if (timer) return
    get().poll()
    timer = setInterval(() => get().poll(), 20_000)
  },

  stop: () => { if (timer) { clearInterval(timer); timer = null } },
}))
