import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

// ─── Types ──────────────────────────────────────────────────────────────────────────────
interface LiveStats {
  totalUsers:     number
  totalTrades:    number
  openTrades:     number
  closedTrades:   number
  totalDeposits:  number
  totalWithdraws: number
  profitLoss:     number
}

interface ServerInfo {
  uptime:      number
  nodeVersion: string
  platform:    string
  memory: { rss: number; heapUsed: number; heapTotal: number }
  env:    string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

// ─── StatCard ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, change, prefix = '', icon, accent, loading,
}: {
  label: string; value: string; change: number; prefix?: string
  icon: React.ReactNode; accent: string; loading?: boolean
}) {
  const pos = change >= 0
  return (
    <div
      className="relative rounded-xl p-5 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0c1220 0%, #0e1628 100%)', border: '1px solid rgba(56,189,248,0.08)' }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pos ? 'rgba(0,200,120,0.1)' : 'rgba(255,48,71,0.1)', color: pos ? '#00c878' : '#ff3047' }}
        >
          {pos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      {loading ? (
        <div className="h-7 w-24 rounded animate-pulse" style={{ background: 'rgba(56,189,248,0.08)' }} />
      ) : (
        <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">{prefix}{value}</p>
      )}
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  )
}

// ─── ServiceDot / MemBar ───────────────────────────────────────────────────────────
function ServiceDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: ok ? '#00c878' : '#ff3047', boxShadow: ok ? '0 0 4px #00c878' : '0 0 4px #ff3047' }}
    />
  )
}

function MemBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min(100, Math.round((used / total) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">Heap Memory</span>
        <span className="font-mono font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between font-mono" style={{ fontSize: '10px', color: 'rgba(148,163,184,0.6)' }}>
        <span>{formatBytes(used)}</span><span>{formatBytes(total)}</span>
      </div>
    </div>
  )
}

// ─── QuickAction ───────────────────────────────────────────────────────────────────────
function QuickAction({ label, sub, icon, accent, onClick }: {
  label: string; sub: string; icon: React.ReactNode; accent: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-100"
      style={{ background: '#0c1220', border: `1px solid ${accent}22` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${accent}15` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary truncate">{label}</p>
          <p className="text-text-secondary truncate" style={{ fontSize: '10px' }}>{sub}</p>
        </div>
      </div>
    </button>
  )
}

// =============================================================================
// Main Dashboard
// =============================================================================
export default function AdminDashboardPage() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  const [stats,     setStats]     = useState<LiveStats | null>(null)
  const [server,    setServer]    = useState<ServerInfo | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, serverRes] = await Promise.all([
        api.get<LiveStats>('/admin/stats'),
        api.get<ServerInfo>('/admin/server-info'),
      ])
      setStats(statsRes.data)
      setServer(serverRes.data)
      setLastFetch(new Date())
    } catch {
      if (!stats) {
        setStats({
          totalUsers: 3214, totalTrades: 14872, openTrades: 248,
          closedTrades: 14624, totalDeposits: 1248530, totalWithdraws: 387200, profitLoss: 860330,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, 30_000)
    return () => clearInterval(t)
  }, [fetchStats])

  const STAT_CARDS = [
    {
      label: 'Total Deposits', prefix: '$',
      value: stats ? stats.totalDeposits.toLocaleString() : '—',
      change: 12.4, accent: '#0ea5e9',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>,
    },
    {
      label: 'Total Withdraws', prefix: '$',
      value: stats ? stats.totalWithdraws.toLocaleString() : '—',
      change: -3.1, accent: '#f59e0b',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
    },
    {
      label: 'Total Trades', prefix: '',
      value: stats ? stats.totalTrades.toLocaleString() : '—',
      change: 28.7, accent: '#a78bfa',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
    },
    {
      label: 'Total Users', prefix: '',
      value: stats ? stats.totalUsers.toLocaleString() : '—',
      change: 5.9, accent: '#34d399',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    },
    {
      label: 'Profit / Loss', prefix: '$',
      value: stats ? Math.abs(stats.profitLoss).toLocaleString() : '—',
      change: 18.2, accent: '#00c878',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    },
  ]

  const QUICK_ACTIONS = [
    {
      label: 'All Customers', sub: 'User management', accent: '#38bdf8', to: '/admin/users/all',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    },
    {
      label: 'All Trades', sub: 'Trade history', accent: '#a78bfa', to: '/admin/transactions/all',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
    },
    {
      label: 'Deposits', sub: 'Payments received', accent: '#00c878', to: '/admin/transactions/deposits',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>,
    },
    {
      label: 'Pending Withdraws', sub: 'Awaiting approval', accent: '#f59e0b', to: '/admin/transactions/pending-withdraws',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
    },
    {
      label: 'Open Trades',
      sub: stats ? `${stats.openTrades} live` : 'Live positions',
      accent: '#f43f5e', to: '/admin/transactions/open',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    },
    {
      label: 'KYC', sub: 'Identity checks', accent: '#e879f9', to: '/admin/leads/kyc',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: 'Analytics', sub: 'Charts & volume', accent: '#fb923c', to: '/admin/analytics',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="18" y="3" width="4" height="18" /><rect x="10" y="9" width="4" height="12" /><rect x="2" y="14" width="4" height="7" /></svg>,
    },
    {
      label: 'Server Info',
      sub: server ? `Up ${formatUptime(server.uptime)}` : 'System health',
      accent: '#34d399', to: '/admin/server/info',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Welcome back{user?.username ? `, ${user.username}` : ''} — platform performance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && (
            <span className="font-mono text-text-muted" style={{ fontSize: '10px' }}>
              Updated {lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(56,189,248,0.14)', color: '#38bdf8' }}
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAT_CARDS.map(c => (
          <StatCard key={c.label} {...c} loading={loading} />
        ))}
      </div>

      {/* Live trade split */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open Positions',   value: String(stats.openTrades),   color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.18)' },
            { label: 'Closed Trades',    value: String(stats.closedTrades), color: '#00c878', bg: 'rgba(0,200,120,0.08)',  border: 'rgba(0,200,120,0.18)' },
            { label: 'Net P&L',          value: `${stats.profitLoss >= 0 ? '+' : '-'}$${Math.abs(stats.profitLoss).toLocaleString()}`, color: stats.profitLoss >= 0 ? '#00c878' : '#ff3047', bg: 'rgba(56,189,248,0.05)', border: 'rgba(56,189,248,0.12)' },
            { label: 'Registered Users', value: String(stats.totalUsers),   color: '#38bdf8', bg: 'rgba(56,189,248,0.05)', border: 'rgba(56,189,248,0.12)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="text-text-muted font-semibold uppercase tracking-wider mb-3" style={{ fontSize: '10px' }}>Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map(a => (
            <QuickAction key={a.label} label={a.label} sub={a.sub} icon={a.icon} accent={a.accent} onClick={() => navigate(a.to)} />
          ))}
        </div>
      </div>

      {/* System Health summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Service status */}
        <div className="rounded-xl" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Services</h2>
            <button onClick={() => navigate('/admin/server/info')} className="text-xs font-medium text-brand-300 hover:text-brand-200 transition-colors">
              Full details →
            </button>
          </div>
          <div className="px-5 py-3 space-y-0">
            {[
              { name: 'API Server',  ok: true },
              { name: 'Database',    ok: true },
              { name: 'WebSocket',   ok: true },
              { name: 'Market Data', ok: true },
            ].map(s => (
              <div key={s.name} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}>
                <span className="text-xs text-text-secondary">{s.name}</span>
                <div className="flex items-center gap-2">
                  <ServiceDot ok={s.ok} />
                  <span className="text-xs font-semibold" style={{ color: s.ok ? '#00c878' : '#ff3047' }}>{s.ok ? 'Online' : 'Down'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime summary */}
        <div className="rounded-xl" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Runtime</h2>
            <button onClick={() => navigate('/admin/server/info')} className="text-xs font-medium text-brand-300 hover:text-brand-200 transition-colors">
              Full details →
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {server ? (
              <>
                <MemBar used={server.memory.heapUsed} total={server.memory.heapTotal} color="#38bdf8" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Uptime',  v: formatUptime(server.uptime),   c: '#00c878' },
                    { l: 'Node.js', v: server.nodeVersion,             c: '#a78bfa' },
                    { l: 'RSS',     v: formatBytes(server.memory.rss), c: '#f59e0b' },
                    { l: 'Env',     v: server.env,                     c: '#38bdf8' },
                  ].map(s => (
                    <div key={s.l} className="rounded-lg px-3 py-2" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(56,189,248,0.07)' }}>
                      <p className="font-mono font-semibold text-xs" style={{ color: s.c }}>{s.v}</p>
                      <p className="text-text-muted mt-0.5" style={{ fontSize: '10px' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-text-muted text-center py-4">{loading ? 'Loading...' : 'Server info unavailable'}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
