import React, { useState } from 'react'

interface ApiEntry { id: string; name: string; provider: string; type: string; endpoint: string; status: string; latency: number; lastCheck: string }

const apis: ApiEntry[] = [
  { id: 'API-001', name: 'Market Data Feed',    provider: 'Bloomberg',   type: 'Market Data', endpoint: 'wss://data.bloomberg.com/ws',       status: 'active',   latency: 12,  lastCheck: '2026-03-10 14:32' },
  { id: 'API-002', name: 'Payment Gateway',      provider: 'Stripe',      type: 'Payments',    endpoint: 'https://api.stripe.com/v1',          status: 'active',   latency: 23,  lastCheck: '2026-03-10 14:30' },
  { id: 'API-003', name: 'KYC Verification',     provider: 'Onfido',      type: 'Compliance',  endpoint: 'https://api.onfido.com/v3',           status: 'active',   latency: 54,  lastCheck: '2026-03-10 14:28' },
  { id: 'API-004', name: 'Crypto Price Feed',    provider: 'CoinGecko',   type: 'Price Feed',  endpoint: 'https://api.coingecko.com/api/v3',   status: 'active',   latency: 89,  lastCheck: '2026-03-10 14:25' },
  { id: 'API-005', name: 'Forex Price Feed',     provider: 'TwelveData',  type: 'Price Feed',  endpoint: 'https://api.twelvedata.com',          status: 'active',   latency: 31,  lastCheck: '2026-03-10 14:20' },
  { id: 'API-006', name: 'Email Notifications',  provider: 'SendGrid',    type: 'Messaging',   endpoint: 'https://api.sendgrid.com/v3',        status: 'active',   latency: 44,  lastCheck: '2026-03-10 14:18' },
  { id: 'API-007', name: 'SMS Service',          provider: 'Twilio',      type: 'Messaging',   endpoint: 'https://api.twilio.com/2010-04-01',  status: 'inactive', latency: 0,   lastCheck: '2026-03-09 10:00' },
  { id: 'API-008', name: 'News Feed',            provider: 'NewsAPI',     type: 'Content',     endpoint: 'https://newsapi.org/v2',              status: 'active',   latency: 112, lastCheck: '2026-03-10 14:15' },
]

function latencyColor(ms: number) {
  if (ms === 0) return '#ff5a72'
  if (ms < 30) return '#18c98a'
  if (ms < 80) return '#f6b24a'
  return '#ff5a72'
}

export default function APIsPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">APIs</h1>
          <p className="text-xs text-text-secondary mt-0.5">Monitor and manage external API integrations</p>
        </div>
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#4f8cff,#3b78f0)' }}>
          + Add Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total APIs',  value: '8',      color: '#7aa7ff' },
          { label: 'Active',       value: '7',      color: '#18c98a' },
          { label: 'Inactive',     value: '1',      color: '#ff5a72' },
          { label: 'Avg Latency',  value: '52ms',   color: '#f6b24a' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
            <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* API Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                {['ID', 'Name', 'Provider', 'Type', 'Endpoint', 'Latency', 'Status', 'Last Check', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apis.map(api => (
                <tr key={api.id} style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td className="px-5 py-3 font-mono text-brand-300">{api.id}</td>
                  <td className="px-5 py-3 font-semibold text-text-primary">{api.name}</td>
                  <td className="px-5 py-3 text-text-secondary">{api.provider}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{api.type}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-text-muted text-xs max-w-[200px] truncate">{api.endpoint}</td>
                  <td className="px-5 py-3 font-mono font-semibold" style={{ color: latencyColor(api.latency) }}>
                    {api.latency === 0 ? '-' : `${api.latency}ms`}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: api.status === 'active' ? '#18c98a' : '#ff5a72' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: api.status === 'active' ? '#18c98a' : '#ff5a72', ...(api.status === 'active' ? {} : {}) }} />
                      {api.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-text-muted">{api.lastCheck}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 rounded text-xs text-brand-300 hover:bg-brand-400/10 transition-colors">Test</button>
                      <button className="px-2 py-1 rounded text-xs text-warning hover:bg-warning/10 transition-colors">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
