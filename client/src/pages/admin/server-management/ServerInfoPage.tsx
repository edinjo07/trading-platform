import React, { useState, useEffect } from 'react'

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(56,189,248,0.05)' }}>
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`text-xs font-medium text-text-primary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function GaugeBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-2xs text-text-muted font-mono" style={{ fontSize: '10px' }}>
        <span>{value} {label === 'CPU' ? 'cores used' : 'GB used'}</span>
        <span>{max} {label === 'CPU' ? 'cores total' : 'GB total'}</span>
      </div>
    </div>
  )
}

export default function ServerInfoPage() {
  const [uptime, setUptime] = useState({ days: 42, hours: 7, minutes: 18 })
  const [connections, setConnections] = useState(247)

  useEffect(() => {
    const t = setInterval(() => {
      setConnections(c => c + Math.floor(Math.random() * 5 - 2))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Server Information</h1>
        <p className="text-xs text-text-secondary mt-0.5">System specifications, resource utilization and runtime details</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Uptime',       value: `${uptime.days}d ${uptime.hours}h`,   color: '#00c878' },
          { label: 'WS Clients',   value: String(connections),                  color: '#38bdf8' },
          { label: 'Environment',  value: 'Production',                          color: '#a78bfa' },
          { label: 'Node Version', value: 'v20.11.1',                            color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
            <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* System info */}
        <div className="rounded-xl overflow-hidden xl:col-span-2" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">System Details</h2>
          </div>
          <div className="px-5 pb-2 grid grid-cols-1 md:grid-cols-2">
            <div>
              <InfoRow label="OS"                    value="Ubuntu 22.04 LTS" />
              <InfoRow label="Kernel"                value="5.15.0-1053-aws" mono />
              <InfoRow label="Architecture"          value="x86_64" />
              <InfoRow label="Hostname"              value="tradex-prod-01" mono />
              <InfoRow label="Data Center"           value="AWS us-east-1 (N. Virginia)" />
              <InfoRow label="IP Address"            value="10.0.1.42 (private)" mono />
            </div>
            <div>
              <InfoRow label="Server Framework"      value="Express.js 4.18" />
              <InfoRow label="TypeScript"            value="5.4.2" mono />
              <InfoRow label="WebSocket Library"     value="ws 8.16" />
              <InfoRow label="Database"              value="In-Memory (Mock)" />
              <InfoRow label="Process ID"            value="1842" mono />
              <InfoRow label="Port"                  value="5000" mono />
            </div>
          </div>
        </div>

        {/* Resource gauges */}
        <div className="rounded-xl p-5 space-y-5" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <h2 className="text-sm font-semibold text-text-primary">Resource Usage</h2>
          <GaugeBar label="CPU"    value={3.2}  max={8}   color="#38bdf8" />
          <GaugeBar label="RAM"    value={6.1}  max={16}  color="#a78bfa" />
          <GaugeBar label="Disk"   value={42.5} max={200} color="#f59e0b" />
        </div>
      </div>

      {/* Environment variables (safe subset) */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
          <h2 className="text-sm font-semibold text-text-primary">Runtime Configuration</h2>
        </div>
        <div className="px-5 py-2">
          {[
            { key: 'NODE_ENV',       value: 'production' },
            { key: 'PORT',           value: '5000' },
            { key: 'CORS_ORIGIN',    value: 'https://tradex.io' },
            { key: 'JWT_EXPIRES_IN', value: '7d' },
            { key: 'LOG_LEVEL',      value: 'info' },
          ].map(v => (
            <div key={v.key} className="flex items-center gap-4 py-2.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}>
              <span className="font-mono text-xs font-bold" style={{ color: '#f59e0b', minWidth: '150px' }}>{v.key}</span>
              <span className="font-mono text-xs text-text-primary">{v.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
