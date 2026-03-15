import React, { useState, useEffect } from 'react'

interface ApiEndpoint { method: string; path: string; status: 'ok' | 'degraded' | 'down'; latency: number; uptime: number; lastChecked: string }

const ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET',    path: '/api/health',           status: 'ok',       latency: 4,   uptime: 99.99, lastChecked: '2026-03-10 14:33' },
  { method: 'POST',   path: '/api/auth/login',        status: 'ok',       latency: 21,  uptime: 99.97, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/markets/symbols',   status: 'ok',       latency: 8,   uptime: 99.95, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/markets/ticker/:s', status: 'ok',       latency: 5,   uptime: 100,   lastChecked: '2026-03-10 14:33' },
  { method: 'POST',   path: '/api/orders',            status: 'ok',       latency: 18,  uptime: 99.98, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/portfolio',         status: 'ok',       latency: 11,  uptime: 99.99, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/analytics',         status: 'degraded', latency: 320, uptime: 98.20, lastChecked: '2026-03-10 14:32' },
  { method: 'WS',     path: '/ws',                    status: 'ok',       latency: 3,   uptime: 99.99, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/positions',         status: 'ok',       latency: 9,   uptime: 99.96, lastChecked: '2026-03-10 14:33' },
  { method: 'GET',    path: '/api/admin',             status: 'ok',       latency: 14,  uptime: 99.94, lastChecked: '2026-03-10 14:33' },
]

function statusColor(s: string) {
  return s === 'ok' ? '#00c878' : s === 'degraded' ? '#f59e0b' : '#ff3047'
}
function methodColor(m: string) {
  const map: Record<string, string> = { GET: '#38bdf8', POST: '#00c878', PUT: '#f59e0b', DELETE: '#ff3047', WS: '#a78bfa' }
  return map[m] ?? '#6b8099'
}

export default function APIStatusPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString())
  useEffect(() => {
    const t = setInterval(() => setLastRefresh(new Date().toLocaleTimeString()), 30000)
    return () => clearInterval(t)
  }, [])

  const ok    = ENDPOINTS.filter(e => e.status === 'ok').length
  const deg   = ENDPOINTS.filter(e => e.status === 'degraded').length
  const down  = ENDPOINTS.filter(e => e.status === 'down').length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">API Status</h1>
          <p className="text-xs text-text-secondary mt-0.5">Real-time monitoring of all API endpoints</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">Last refresh: {lastRefresh}</span>
          <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" onClick={() => setLastRefresh(new Date().toLocaleTimeString())}
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary banner */}
      <div className="rounded-xl p-4 flex items-center gap-4"
        style={{ background: ok === ENDPOINTS.length ? 'rgba(0,200,120,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${ok === ENDPOINTS.length ? 'rgba(0,200,120,0.15)' : 'rgba(245,158,11,0.15)'}` }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: ok === ENDPOINTS.length ? 'rgba(0,200,120,0.15)' : 'rgba(245,158,11,0.15)' }}>
          {ok === ENDPOINTS.length
            ? <svg className="w-5 h-5 text-bull" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
            : <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          }
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: ok === ENDPOINTS.length ? '#00c878' : '#f59e0b' }}>
            {ok === ENDPOINTS.length ? 'All Systems Operational' : 'Partial Degradation Detected'}
          </p>
          <p className="text-xs text-text-secondary">{ok} OK · {deg} degraded · {down} down</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Operational',  value: ok,   color: '#00c878' },
          { label: 'Degraded',     value: deg,  color: '#f59e0b' },
          { label: 'Down',         value: down, color: '#ff3047' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Endpoints table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                {['Method', 'Endpoint', 'Latency', 'Uptime', 'Status', 'Last Checked'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map(ep => (
                <tr key={ep.path}
                  style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td className="px-5 py-3">
                    <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded" style={{ background: methodColor(ep.method) + '15', color: methodColor(ep.method) }}>{ep.method}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-text-primary">{ep.path}</td>
                  <td className="px-5 py-3 font-mono" style={{ color: ep.latency < 50 ? '#00c878' : ep.latency < 200 ? '#f59e0b' : '#ff3047' }}>
                    {ep.latency}ms
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${ep.uptime}%`, background: ep.uptime > 99 ? '#00c878' : '#f59e0b' }} />
                      </div>
                      <span className="font-mono text-text-muted">{ep.uptime}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor(ep.status) }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(ep.status) }} />
                      {ep.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-text-muted">{ep.lastChecked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
