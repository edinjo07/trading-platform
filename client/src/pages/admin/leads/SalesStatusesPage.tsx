import React, { useState } from 'react'

interface StatusItem { id: string; name: string; color: string; description: string; order: number; active: boolean }

const defaultStatuses: StatusItem[] = [
  { id: '1', name: 'New',        color: '#38bdf8', description: 'Freshly created lead',           order: 1, active: true },
  { id: '2', name: 'Contacted',  color: '#a78bfa', description: 'First contact made',             order: 2, active: true },
  { id: '3', name: 'Interested', color: '#f59e0b', description: 'Expressed interest in opening',  order: 3, active: true },
  { id: '4', name: 'Pending',    color: '#f97316', description: 'Awaiting document submission',   order: 4, active: true },
  { id: '5', name: 'Converted',  color: '#00c878', description: 'Successfully converted to client',order: 5, active: true },
  { id: '6', name: 'Lost',       color: '#ff3047', description: 'Lead lost or unresponsive',      order: 6, active: true },
]

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ background: color }} />
}

export default function SalesStatusesPage() {
  const [statuses, setStatuses] = useState(defaultStatuses)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Sales Statuses</h1>
          <p className="text-xs text-text-secondary mt-0.5">Configure lead pipeline stages and sales statuses</p>
        </div>
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Add Status
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pipeline Stages</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(56,189,248,0.05)' }}>
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-text-muted font-mono text-xs w-5">{s.order}</span>
              <ColorDot color={s.color} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                <p className="text-xs text-text-secondary">{s.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-text-muted">{s.color}</span>
                <button
                  onClick={() => setStatuses(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}
                  className="relative w-9 h-4.5 rounded-full transition-colors"
                  style={{ background: s.active ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(107,128,153,0.3)', padding: '0', minHeight: '18px', minWidth: '36px' }}
                >
                  <span
                    className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: s.active ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </button>
                <button className="p-1.5 rounded text-text-muted hover:text-warning transition-colors" style={{ background: 'rgba(245,158,11,0.05)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
