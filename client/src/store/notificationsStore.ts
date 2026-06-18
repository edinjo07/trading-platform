import { create } from 'zustand'
import {
  getNotifications, markNotifRead, markAllNotifRead, deleteNotif, clearAllNotifs,
  AppNotification, NotifSeverity,
} from '../api/notifications'
import { useToastStore, ToastVariant } from './toastStore'

// ── Category mapping (for mute preferences) ──────────────────────────────────────
export type NotifCategory = 'margin' | 'risk' | 'orders' | 'bots' | 'funds' | 'other'

export function categoryOf(type: string): NotifCategory {
  if (type === 'margin_warning' || type === 'margin_closeout' || type === 'position_closed') return 'margin'
  if (type === 'sl_hit' || type === 'tp_hit')        return 'risk'
  if (type === 'order_filled' || type === 'order_placed') return 'orders'
  if (type === 'bot')                                 return 'bots'
  if (type === 'deposit' || type === 'withdrawal')    return 'funds'
  return 'other'
}

export const CATEGORY_META: { key: NotifCategory; label: string; desc: string }[] = [
  { key: 'margin', label: 'Margin & closeouts',       desc: 'Margin warnings, closeout, auto-closed positions' },
  { key: 'risk',   label: 'Stop-loss / Take-profit',  desc: 'Positions closed by your SL or TP levels' },
  { key: 'orders', label: 'Order fills',              desc: 'Market and limit order fills' },
  { key: 'bots',   label: 'Bot trades',               desc: 'TradePilot opening and closing positions' },
  { key: 'funds',  label: 'Deposits & withdrawals',   desc: 'Funding activity on your account' },
]

const MUTED_KEY = 'notif-muted'
function loadMuted(): string[] {
  try { const v = JSON.parse(localStorage.getItem(MUTED_KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
function saveMuted(m: string[]) { try { localStorage.setItem(MUTED_KEY, JSON.stringify(m)) } catch { /* ignore */ } }

function visibleUnread(notifs: AppNotification[], muted: string[]): number {
  return notifs.filter(n => !n.read && !muted.includes(categoryOf(n.type))).length
}

interface NotifState {
  notifications:   AppNotification[]
  unread:          number
  loaded:          boolean
  mutedCategories: string[]
  poll:            () => Promise<void>
  markRead:        (id: string) => Promise<void>
  markAllRead:     () => Promise<void>
  remove:          (id: string) => Promise<void>
  clearAll:        () => Promise<void>
  toggleCategory:  (cat: string) => void
  start:           () => void
  stop:            () => void
}

let timer: ReturnType<typeof setInterval> | null = null
const seen = new Set<string>()
let firstPoll = true

function toastVariant(sev: NotifSeverity): ToastVariant {
  return sev === 'critical' ? 'error' : sev === 'warning' ? 'warning' : sev === 'success' ? 'success' : 'info'
}

export const useNotificationsStore = create<NotifState>((set, get) => ({
  notifications:   [],
  unread:          0,
  loaded:          false,
  mutedCategories: loadMuted(),

  poll: async () => {
    try {
      const { notifications } = await getNotifications()
      const muted = get().mutedCategories
      if (!firstPoll) {
        // Toast newly-arrived, non-silent, non-muted notifications.
        const fresh = notifications.filter(n =>
          !seen.has(n.id) && n.metadata?.silent !== true && !muted.includes(categoryOf(n.type)))
        const { addToast } = useToastStore.getState()
        for (const n of [...fresh].reverse()) {
          addToast({ variant: toastVariant(n.severity), title: n.title, message: n.message, duration: n.severity === 'critical' ? 0 : 7000 })
          try {
            if (n.severity === 'critical' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(n.title, { body: n.message })
            }
          } catch { /* ignore */ }
        }
      }
      notifications.forEach(n => seen.add(n.id))
      firstPoll = false
      set({ notifications, unread: visibleUnread(notifications, muted), loaded: true })
    } catch { /* ignore — degrade quietly */ }
  },

  markRead: async (id) => {
    set(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      return { notifications, unread: visibleUnread(notifications, s.mutedCategories) }
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
      return { notifications, unread: visibleUnread(notifications, s.mutedCategories) }
    })
    try { await deleteNotif(id) } catch { /* ignore */ }
  },

  clearAll: async () => {
    set({ notifications: [], unread: 0 })
    try { await clearAllNotifs() } catch { /* ignore */ }
  },

  toggleCategory: (cat) => {
    set(s => {
      const mutedCategories = s.mutedCategories.includes(cat)
        ? s.mutedCategories.filter(c => c !== cat)
        : [...s.mutedCategories, cat]
      saveMuted(mutedCategories)
      return { mutedCategories, unread: visibleUnread(s.notifications, mutedCategories) }
    })
  },

  start: () => {
    if (timer) return
    get().poll()
    timer = setInterval(() => get().poll(), 20_000)
  },

  stop: () => { if (timer) { clearInterval(timer); timer = null } },
}))
