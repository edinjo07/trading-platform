import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationsStore } from '../../store/notificationsStore'
import { AppNotification, NotifSeverity } from '../../api/notifications'

// ─── Severity styling ──────────────────────────────────────────────────────────
const SEV: Record<NotifSeverity, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  success:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  info:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.12)' },
}

function sevIcon(sev: NotifSeverity) {
  const common = { width: 15, height: 15, fill: 'none', viewBox: '0 0 24 24', strokeWidth: 2, stroke: 'currentColor' } as const
  if (sev === 'success') return <svg {...common}><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (sev === 'info')    return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" /></svg>
  // warning / critical → triangle
  return <svg {...common}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" /><path d="M12 9v4M12 17h.01" strokeLinecap="round" /></svg>
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Row ────────────────────────────────────────────────────────────────────────
function Row({ n, onRead, onRemove }: { n: AppNotification; onRead: (id: string) => void; onRemove: (id: string) => void }) {
  const s = SEV[n.severity] ?? SEV.info
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !n.read && onRead(n.id)}
      style={{
        display: 'flex', gap: 11, padding: '11px 14px', cursor: n.read ? 'default' : 'pointer',
        background: n.read ? 'transparent' : 'rgba(14,165,233,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative',
      }}
    >
      {!n.read && <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', width: 5, height: 5, borderRadius: '50%', background: '#38bdf8' }} />}
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color }}>
        {sevIcon(n.severity)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#e2e8f0', flex: 1, minWidth: 0 }}>{n.title}</span>
          <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
        </div>
        <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '3px 0 0', lineHeight: 1.45 }}>{n.message}</p>
      </div>
      {hover && (
        <button onClick={e => { e.stopPropagation(); onRemove(n.id) }} title="Dismiss"
          style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1 }}>
          ✕
        </button>
      )}
    </div>
  )
}

// ─── Bell + panel ────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const { notifications, unread, start, poll, markRead, markAllRead, remove, clearAll } = useNotificationsStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  useEffect(() => { start() }, [start])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const toggle = () => { setOpen(o => { if (!o) poll(); return !o }) }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
        style={{ color: open ? '#38bdf8' : 'rgba(255,255,255,0.55)', border: `1px solid ${open ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.09)'}`, background: open ? 'rgba(14,165,233,0.1)' : 'transparent' }}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a0a',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 60,
          width: 'min(380px, calc(100vw - 24px))', maxHeight: '72vh',
          background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>
              Notifications{unread > 0 ? ` · ${unread}` : ''}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {unread > 0 && (
                <button onClick={() => markAllRead()} style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={() => clearAll()} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 20px', color: '#475569' }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <p style={{ fontSize: 12.5, margin: 0, color: '#64748b' }}>No notifications yet</p>
                <p style={{ fontSize: 10.5, margin: 0, textAlign: 'center' }}>Margin alerts, closed positions and account events appear here.</p>
              </div>
            ) : (
              notifications.map(n => <Row key={n.id} n={n} onRead={markRead} onRemove={remove} />)
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => { setOpen(false); nav('/dashboard/notifications') }}
              style={{ width: '100%', padding: '11px', background: 'none', border: 'none', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              See all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
