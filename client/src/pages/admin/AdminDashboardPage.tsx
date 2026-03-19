import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// legacy shape kept for static parts below that still use it
interface Stats {
  totalDeposits: number
  totalWithdraws: number
  totalTrades: number
  totalUsers: number
  profitLoss: number
  depositsChange: number
  withdrawsChange: number
  tradesChange: number
  usersChange: number
  plChange: number
}

interface RecentTx {
  id: string
  user: string
  type: 'deposit' | 'withdraw' | 'trade'
  symbol?: string
  amount: number
  status: 'completed' | 'pending' | 'failed'
  time: string
}

interface TradeEngagement {
  label: string
  trades: number
  volume: number
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
function generateStats(): Stats {
  return {
    totalDeposits:  1_248_530,
    totalWithdraws:   387_200,
    totalTrades:       14_872,
    totalUsers:         3_214,
    profitLoss:       860_330,
    depositsChange:     12.4,
    withdrawsChange:    -3.1,
    tradesChange:       28.7,
    usersChange:         5.9,
    plChange:           18.2,
  }
}

function generateRecentTx(): RecentTx[] {
  const statuses: RecentTx['status'][] = ['completed', 'pending', 'failed', 'completed', 'completed']
  const types: RecentTx['type'][] = ['deposit', 'trade', 'withdraw', 'trade', 'deposit']
  const users = ['john.doe@email.com', 'maria.k@mail.com', 'alex.b@proton.me', 'user3821', 'trader_x99', 'emma.watts@fx.io', 'carlos.r@trade.net', 'noah.lin@invest.co']
  const symbols = ['EUR/USD', 'BTC/USDT', 'AAPL', 'ETH/USDT', 'XAUUSD', 'GBP/USD', 'NVDA', 'SOL/USDT']
  return Array.from({ length: 10 }, (_, i) => ({
    id: `TX-${1000 + i}`,
    user: users[i % users.length],
    type: types[i % types.length],
    symbol: symbols[i % symbols.length],
    amount: Math.round((Math.random() * 50000 + 500) * 100) / 100,
    status: statuses[i % statuses.length],
    time: new Date(Date.now() - i * 8 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }))
}

function generateEngagement(): TradeEngagement[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return labels.map(label => ({
    label,
    trades: Math.round(Math.random() * 3000 + 800),
    volume: Math.round(Math.random() * 15000000 + 2000000),
  }))
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatCard({
  label, value, change, prefix = '', icon, accent,
}: {
  label: string; value: string; change: number; prefix?: string; icon: React.ReactNode; accent: string
}) {
  const pos = change >= 0
  return (
    <div
      className="relative rounded-xl p-5 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0c1220 0%, #0e1628 100%)',
        border: '1px solid rgba(56,189,248,0.08)',
      }}
    >
      {/* Glow accent */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: pos ? 'rgba(0,200,120,0.1)' : 'rgba(255,48,71,0.1)',
            color: pos ? '#00c878' : '#ff3047',
          }}
        >
          {pos ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-text-primary">
        {prefix}{value}
      </p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: RecentTx['status'] }) {
  const map = {
    completed: { bg: 'rgba(0,200,120,0.1)', color: '#00c878', label: 'Completed' },
    pending:   { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Pending' },
    failed:    { bg: 'rgba(255,48,71,0.1)',  color: '#ff3047',  label: 'Failed' },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function TypeBadge({ type }: { type: RecentTx['type'] }) {
  const map = {
    deposit:  { bg: 'rgba(14,165,233,0.1)',  color: '#38bdf8', label: 'Deposit' },
    withdraw: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Withdraw' },
    trade:    { bg: 'rgba(139,92,246,0.1)',  color: '#a78bfa', label: 'Trade' },
  }
  const m = map[type]
  return (
    <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function TradeEngagementChart({ data }: { data: TradeEngagement[] }) {
  const max = Math.max(...data.map(d => d.trades))
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => {
        const pct = (d.trades / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex flex-col justify-end" style={{ height: '120px' }}>
              {/* Tooltip */}
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-200 rounded px-2 py-1 text-xs text-text-primary font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style={{ border: '1px solid rgba(56,189,248,0.15)' }}
              >
                {d.trades.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${pct}%`,
                  background: i === new Date().getDay() - 1
                    ? 'linear-gradient(180deg, #38bdf8, #0369a1)'
                    : 'linear-gradient(180deg, rgba(56,189,248,0.5), rgba(3,105,161,0.3))',
                  minHeight: '4px',
                }}
              />
            </div>
            <span className="text-2xs text-text-secondary" style={{ fontSize: '10px' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data)
  const norm = (v: number) => ((v - min) / (max - min || 1)) * 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 60},${28 - norm(v)}`).join(' ')
  return (
    <svg width="60" height="28" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Date Picker button ───────────────────────────────────────────────────────
function DateInput({ label, value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs text-text-primary rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-400"
        style={{
          background: 'rgba(14,165,233,0.06)',
          border: '1px solid rgba(56,189,248,0.12)',
          colorScheme: 'dark',
        }}
      />
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [fromDate, setFromDate] = useState(monthAgo)
  const [toDate,   setToDate]   = useState(today)
  const [stats]   = useState<Stats>(generateStats())
  const [recentTx] = useState<RecentTx[]>(generateRecentTx())
  const [engagement] = useState<TradeEngagement[]>(generateEngagement())

  const randomHistory = () => Array.from({ length: 10 }, () => Math.random() * 100 + 50)

  const STAT_CARDS = [
    {
      label: 'Total Deposits',
      value: stats.totalDeposits.toLocaleString(),
      change: stats.depositsChange,
      prefix: '$',
      accent: '#0ea5e9',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      ),
    },
    {
      label: 'Total Withdraws',
      value: stats.totalWithdraws.toLocaleString(),
      change: stats.withdrawsChange,
      prefix: '$',
      accent: '#f59e0b',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      ),
    },
    {
      label: 'Total Trades',
      value: stats.totalTrades.toLocaleString(),
      change: stats.tradesChange,
      prefix: '',
      accent: '#a78bfa',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: stats.usersChange,
      prefix: '',
      accent: '#34d399',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: 'Profit / Loss',
      value: stats.profitLoss.toLocaleString(),
      change: stats.plChange,
      prefix: '$',
      accent: '#00c878',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Page header + date filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">Welcome back — overview of your platform performance</p>
        </div>
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
        >
          <DateInput label="From" value={fromDate} onChange={setFromDate} />
          <span className="text-text-muted text-sm">–</span>
          <DateInput label="To" value={toDate} onChange={setToDate} />
          <button
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff' }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAT_CARDS.map(c => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Bottom row: Recent Transactions + Trade Engagement */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Recent Transactions Table */}
        <div
          className="xl:col-span-2 rounded-xl overflow-hidden"
          style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Recent Transactions</h2>
            <button className="text-xs font-medium text-brand-300 hover:text-brand-200 transition-colors">
              View all →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                  {['ID', 'User', 'Type', 'Asset', 'Amount', 'Status', 'Time'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted"
                      style={{ fontSize: '10px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTx.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className="transition-colors group"
                    style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="px-5 py-3 font-mono text-brand-300">{tx.id}</td>
                    <td className="px-5 py-3 text-text-secondary truncate max-w-[130px]">{tx.user}</td>
                    <td className="px-5 py-3"><TypeBadge type={tx.type} /></td>
                    <td className="px-5 py-3 font-mono text-text-primary">{tx.symbol ?? '—'}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-text-primary">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-5 py-3 font-mono text-text-muted">{tx.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Engagement */}
        <div
          className="rounded-xl"
          style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Trade Engagement</h2>
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wide" style={{ fontSize: '10px' }}>This Week</span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Summary mini stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Avg Daily Trades', v: Math.round(engagement.reduce((a, d) => a + d.trades, 0) / 7).toLocaleString(), c: '#0ea5e9' },
                { l: 'Peak Volume', v: `$${(Math.max(...engagement.map(d => d.volume)) / 1e6).toFixed(1)}M`, c: '#a78bfa' },
              ].map(s => (
                <div key={s.l} className="rounded-lg p-3" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(56,189,248,0.08)' }}>
                  <p className="text-base font-bold font-mono" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-2xs text-text-secondary mt-0.5" style={{ fontSize: '10px' }}>{s.l}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <TradeEngagementChart data={engagement} />

            {/* Legend */}
            <div className="flex items-center justify-between text-2xs text-text-muted" style={{ fontSize: '10px' }}>
              {engagement.map(d => (
                <span key={d.label} className="font-mono">{d.trades.toLocaleString()}</span>
              ))}
            </div>

            {/* Asset breakdown */}
            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(56,189,248,0.06)' }}>
              <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>Asset Breakdown</p>
              {[
                { label: 'Forex',  pct: 38, color: '#38bdf8' },
                { label: 'Crypto', pct: 29, color: '#f59e0b' },
                { label: 'Stocks', pct: 21, color: '#a78bfa' },
                { label: 'Others', pct: 12, color: '#34d399' },
              ].map(a => (
                <div key={a.label} className="flex items-center gap-3">
                  <span className="text-2xs text-text-secondary w-10" style={{ fontSize: '10px' }}>{a.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                  <span className="text-2xs font-mono font-semibold" style={{ color: a.color, fontSize: '10px' }}>{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Volume mini sparklines row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Forex Volume',  value: '$8.4M', color: '#38bdf8' },
          { label: 'Crypto Volume', value: '$5.2M', color: '#f59e0b' },
          { label: 'Stock Volume',  value: '$3.1M', color: '#a78bfa' },
          { label: 'Commodity Vol', value: '$1.8M', color: '#34d399' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}
          >
            <div>
              <p className="text-sm font-bold font-mono text-text-primary">{s.value}</p>
              <p className="text-2xs text-text-secondary mt-0.5" style={{ fontSize: '10px' }}>{s.label}</p>
            </div>
            <Sparkline data={randomHistory()} color={s.color} />
          </div>
        ))}
      </div>
    </div>
  )
}
