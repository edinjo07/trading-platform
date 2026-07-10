import React, { useEffect, useState } from 'react'
import { useNotificationsStore, categoryOf, CATEGORY_META } from '../store/notificationsStore'
import { AppNotification, NotifSeverity } from '../api/notifications'

// Theme tokens — page flips with light/dark
const C = {
  surface:  'var(--t-surface)',
  surface2: 'var(--t-surface-2)',
  border:   'var(--t-border)',
  text1:    'var(--t-text-1)',
  text2:    'var(--t-text-2)',
  text3:    'var(--t-text-3)',
  blue:     'var(--t-accent)',
  green:    'var(--t-bull)',
}
const SEV: Record<NotifSeverity, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  success:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  info:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.12)' },
}

function sevIcon(sev: NotifSeverity) {
  const p = { width: 17, height: 17, fill: 'none', viewBox: '0 0 24 24', strokeWidth: 2, stroke: 'currentColor' } as const
  if (sev === 'success') return <svg {...p}><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (sev === 'info')    return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" /></svg>
  return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" /><path d="M12 9v4M12 17h.01" strokeLinecap="round" /></svg>
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Row({ n, onRead, onRemove }: { n: AppNotification; onRead: (id: string) => void; onRemove: (id: string) => void }) {
  const s = SEV[n.severity] ?? SEV.info
  return (
    <div
      onClick={() => !n.read && onRead(n.id)}
      style={{
        display: 'flex', gap: 13, padding: '14px 16px', borderRadius: 12, cursor: n.read ? 'default' : 'pointer',
        background: n.read ? C.surface : 'var(--t-accent-s)',
        border: `1px solid ${n.read ? C.border : 'rgba(79,140,255,0.28)'}`, position: 'relative',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color }}>
        {sevIcon(n.severity)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />}
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text1, flex: 1, minWidth: 0 }}>{n.title}</span>
          <span style={{ fontSize: 10.5, color: C.text3, flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.text2, margin: '4px 0 0', lineHeight: 1.5 }}>{n.message}</p>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove(n.id) }} title="Dismiss"
        style={{ alignSelf: 'flex-start', width: 24, height: 24, borderRadius: 7, background: 'rgba(var(--ink),0.05)', border: 'none', color: C.text3, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}

export default function NotificationsPage() {
  const { notifications, unread, mutedCategories, toggleCategory, start, poll, markRead, markAllRead, remove, clearAll } = useNotificationsStore()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [showPrefs, setShowPrefs] = useState(false)

  useEffect(() => { start(); poll() }, [start, poll])

  const visible = notifications.filter(n => !mutedCategories.includes(categoryOf(n.type)))
  const list = filter === 'unread' ? visible.filter(n => !n.read) : visible

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text1, margin: 0 }}>Notifications</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.green }}>
              <span className="animate-pulse2" style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} /> Live
            </span>
            <span style={{ fontSize: 12, color: C.text3 }}>· {unread} unread · {notifications.length} total</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowPrefs(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: showPrefs ? C.blue : C.text2, background: showPrefs ? 'var(--t-accent-s)' : C.surface2, border: `1px solid ${showPrefs ? 'rgba(79,140,255,0.3)' : C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9z" /></svg>
            Preferences
          </button>
          {unread > 0 && (
            <button onClick={() => markAllRead()} style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: 'var(--t-accent-s)', border: '1px solid rgba(79,140,255,0.3)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => clearAll()} style={{ fontSize: 12, fontWeight: 700, color: C.text2, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Preferences */}
      {showPrefs && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
          {CATEGORY_META.map(cat => {
            const muted = mutedCategories.includes(cat.key)
            return (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: 0 }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: C.text3, margin: '2px 0 0' }}>{cat.desc}</p>
                </div>
                <button onClick={() => toggleCategory(cat.key)} role="switch" aria-checked={!muted} title={muted ? 'Muted' : 'On'}
                  style={{ width: 42, height: 23, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.15s', background: muted ? 'rgba(var(--ink),0.15)' : C.green }}>
                  <span style={{ position: 'absolute', top: 2.5, left: muted ? 3 : 22, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                </button>
              </div>
            )
          })}
          <p style={{ fontSize: 10.5, color: C.text3, padding: '10px 14px', margin: 0 }}>
            Muted categories are hidden from the bell and this list and won't pop toasts. (Margin closeouts are still executed regardless.)
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? 'rgba(14,165,233,0.15)' : C.surface2,
              color:      filter === f ? C.blue : C.text3,
              border:     `1px solid ${filter === f ? 'rgba(14,165,233,0.35)' : C.border}`,
            }}>
            {f}{f === 'unread' && unread > 0 ? ` (${unread})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 24px', background: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)', color: C.blue }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          <p style={{ fontSize: 12.5, color: C.text3, margin: 0 }}>Margin alerts, closed positions, fills and account events appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(n => <Row key={n.id} n={n} onRead={markRead} onRemove={remove} />)}
        </div>
      )}
    </div>
  )
}
