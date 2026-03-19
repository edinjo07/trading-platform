import React, { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeEngagement {
  label: string
  trades: number
  volume: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────
function generateEngagement(): TradeEngagement[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return labels.map(label => ({
    label,
    trades: Math.round(Math.random() * 3000 + 800),
    volume: Math.round(Math.random() * 15000000 + 2000000),
  }))
}

function randomHistory(): number[] {
  return Array.from({ length: 12 }, () => Math.random() * 100 + 50)
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function TradeEngagementChart({ data }: { data: TradeEngagement[] }) {
  const max = Math.max(...data.map(d => d.trades))
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  return (
    <div className="flex items-end gap-3 h-48">
      {data.map((d, i) => {
        const pct = (d.trades / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex flex-col justify-end" style={{ height: '160px' }}>
              <div
                className="absolute -top-9 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 text-text-primary"
                style={{ background: '#182032', border: '1px solid rgba(56,189,248,0.15)' }}
              >
                {d.trades.toLocaleString()} trades
              </div>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${pct}%`,
                  background: i === todayIdx
                    ? 'linear-gradient(180deg, #38bdf8, #0369a1)'
                    : 'linear-gradient(180deg, rgba(56,189,248,0.5), rgba(3,105,161,0.3))',
                  minHeight: '4px',
                }}
              />
            </div>
            <span className="text-text-secondary" style={{ fontSize: '10px' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data)
  const norm = (v: number) => ((v - min) / (max - min || 1)) * 36
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${36 - norm(v)}`).join(' ')
  return (
    <svg width="80" height="36" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── VolumeCard ───────────────────────────────────────────────────────────────
function VolumeCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const data = randomHistory()
  const first = data[0], last = data[data.length - 1]
  const up = last >= first
  return (
    <div
      className="rounded-xl px-4 py-4 flex items-center justify-between"
      style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
    >
      <div>
        <p className="text-lg font-bold font-mono text-text-primary">{value}</p>
        <p className="text-xs font-medium text-text-secondary mt-0.5">{label}</p>
        {sub && <p className="text-text-muted mt-0.5" style={{ fontSize: '10px' }}>{sub}</p>}
        <span
          className="inline-flex items-center gap-0.5 text-xs font-semibold mt-1"
          style={{ color: up ? '#00c878' : '#ff3047' }}
        >
          {up ? '▲' : '▼'} {(Math.random() * 8 + 1).toFixed(1)}%
        </span>
      </div>
      <Sparkline data={data} color={color} />
    </div>
  )
}

// =============================================================================
// Analytics Page
// =============================================================================
export default function AdminAnalyticsPage() {
  const [engagement] = useState<TradeEngagement[]>(() => generateEngagement())

  const totalTrades  = engagement.reduce((a, d) => a + d.trades, 0)
  const avgDaily     = Math.round(totalTrades / 7)
  const peakVolume   = Math.max(...engagement.map(d => d.volume))
  const totalVolume  = engagement.reduce((a, d) => a + d.volume, 0)

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-secondary mt-0.5">Platform-wide trading activity, volume, and asset breakdown</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Trades This Week', value: totalTrades.toLocaleString(),                      color: '#38bdf8' },
          { label: 'Avg Daily Trades',        value: avgDaily.toLocaleString(),                         color: '#a78bfa' },
          { label: 'Peak Daily Volume',       value: `$${(peakVolume / 1e6).toFixed(1)}M`,              color: '#f59e0b' },
          { label: 'Total Weekly Volume',     value: `$${(totalVolume / 1e6).toFixed(1)}M`,             color: '#00c878' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-4" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Trade Engagement + Asset Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Bar chart */}
        <div
          className="xl:col-span-2 rounded-xl"
          style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Trade Engagement</h2>
            <span className="font-semibold text-text-muted uppercase tracking-wide" style={{ fontSize: '10px' }}>This Week</span>
          </div>
          <div className="px-5 py-5">
            <TradeEngagementChart data={engagement} />
            <div
              className="mt-4 pt-4 grid grid-cols-7 gap-1 text-center"
              style={{ borderTop: '1px solid rgba(56,189,248,0.06)' }}
            >
              {engagement.map(d => (
                <div key={d.label}>
                  <p className="font-mono text-text-primary font-semibold" style={{ fontSize: '11px' }}>{d.trades.toLocaleString()}</p>
                  <p className="text-text-muted" style={{ fontSize: '10px' }}>{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Asset breakdown */}
        <div className="rounded-xl" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Asset Breakdown</h2>
            <span className="font-semibold text-text-muted uppercase tracking-wide" style={{ fontSize: '10px' }}>By Volume</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            {[
              { label: 'Forex',      pct: 38, trades: 5642, volume: '$8.4M',  color: '#38bdf8' },
              { label: 'Crypto',     pct: 29, trades: 4301, volume: '$5.2M',  color: '#f59e0b' },
              { label: 'Stocks',     pct: 21, trades: 3116, volume: '$3.1M',  color: '#a78bfa' },
              { label: 'Commodities',pct:  8, trades: 1187, volume: '$1.2M',  color: '#34d399' },
              { label: 'Indices',    pct:  4, trades:  594, volume: '$0.6M',  color: '#f43f5e' },
            ].map(a => (
              <div key={a.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">{a.label}</span>
                  <span className="font-mono text-text-secondary">{a.trades.toLocaleString()} trades · {a.volume}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                  <span className="font-mono font-bold w-8 text-right text-xs" style={{ color: a.color }}>{a.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume sparklines */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Volume Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          <VolumeCard label="Forex Volume"     value="$8.4M"   sub="Spot & derivatives"  color="#38bdf8" />
          <VolumeCard label="Crypto Volume"    value="$5.2M"   sub="BTC, ETH, alts"       color="#f59e0b" />
          <VolumeCard label="Stock Volume"     value="$3.1M"   sub="US & EU equities"     color="#a78bfa" />
          <VolumeCard label="Commodity Vol"    value="$1.8M"   sub="Gold, Oil, Gas"        color="#34d399" />
          <VolumeCard label="Total Revenue"    value="$18.5M"  sub="All instruments"       color="#00c878" />
          <VolumeCard label="Avg Trade Size"   value="$3,420"  sub="Per transaction"       color="#f43f5e" />
          <VolumeCard label="New Users Today"  value="47"      sub="First-time traders"    color="#e879f9" />
          <VolumeCard label="Active Sessions"  value="312"     sub="Connected right now"   color="#fb923c" />
        </div>
      </div>

      {/* Daily volume table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
          <h2 className="text-sm font-semibold text-text-primary">Daily Breakdown</h2>
          <span className="font-semibold text-text-muted uppercase tracking-wide" style={{ fontSize: '10px' }}>This Week</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                {['Day', 'Trades', 'Volume', 'Avg Trade', 'New Users', 'Revenue'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {engagement.map((d, i) => {
                const avg = Math.round(d.volume / d.trades)
                const users = Math.round(Math.random() * 80 + 20)
                const rev = Math.round(d.volume * 0.0008)
                const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
                return (
                  <tr
                    key={d.label}
                    style={{
                      borderBottom: '1px solid rgba(56,189,248,0.04)',
                      background: isToday ? 'rgba(14,165,233,0.04)' : 'transparent',
                    }}
                  >
                    <td className="px-5 py-3 font-semibold" style={{ color: isToday ? '#38bdf8' : undefined }}>
                      {d.label}{isToday && <span className="ml-2 text-brand-300" style={{ fontSize: '10px' }}>today</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-text-primary">{d.trades.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-text-primary">${(d.volume / 1e6).toFixed(2)}M</td>
                    <td className="px-5 py-3 font-mono text-text-secondary">${avg.toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-text-secondary">{users}</td>
                    <td className="px-5 py-3 font-mono font-semibold" style={{ color: '#00c878' }}>${rev.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
