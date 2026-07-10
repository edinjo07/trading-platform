import React, { useEffect, useState } from 'react'
import { getLeaderboard, LeaderboardEntry } from '../api/leaderboard'
import { useAuthStore } from '../store/authStore'

const pnlColor = (v: number) => (v >= 0 ? 'var(--t-bull)' : 'var(--t-bear)')
const retStr   = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

// Metallic rank identities — gold / silver / bronze
const RANK_META = [
  { ring: '#f6c453', grad: 'linear-gradient(135deg,#f8d47c,#d99a26)', glow: 'rgba(246,196,83,0.35)'  },
  { ring: '#b8c4d4', grad: 'linear-gradient(135deg,#d3dce8,#8593a6)', glow: 'rgba(184,196,212,0.28)' },
  { ring: '#d0885a', grad: 'linear-gradient(135deg,#e0a37a,#a75f33)', glow: 'rgba(208,136,90,0.30)'  },
]
const GRADIENT = RANK_META.map(m => m.grad)

/** Crafted metallic rank badge (replaces emoji medals) */
function RankBadge({ rank, size = 26 }: { rank: number; size?: number }) {
  const m = RANK_META[rank - 1]
  if (!m) return <span className="font-black font-mono text-text-muted text-sm">{rank}</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: m.grad, border: `1.5px solid ${m.ring}`,
      boxShadow: `0 0 10px ${m.glow}, inset 0 1px 2px rgba(255,255,255,0.45)`,
      color: '#1a1206', fontSize: size * 0.42, fontWeight: 900, fontFamily: 'ui-monospace,monospace',
    }}>
      {rank}
    </span>
  )
}

/** Flame mark for win streaks */
function StreakFlame({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
    </svg>
  )
}

type SortKey = 'returnPct' | 'netPnl' | 'winRate' | 'sharpe' | 'trades'

export default function LeaderboardPage() {
  const me = useAuthStore(s => s.user)
  const [data, setData]       = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('returnPct')
  const [period, setPeriod]   = useState<'monthly' | 'all-time'>('monthly')

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    const load = (silent: boolean) => getLeaderboard(period)
      .then(d => { if (alive) { setData(d); setError(null) } })
      .catch(() => { if (alive && !silent) setError('Failed to load leaderboard') })
      .finally(() => { if (alive) setLoading(false) })
    load(false)
    // Live: refresh every 60s without flashing the loader
    const id = setInterval(() => load(true), 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [period])

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey]).map((e, i) => ({ ...e, displayRank: i + 1 }))
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'returnPct', label: 'Return %' },
    { key: 'netPnl',    label: 'Net P&L' },
    { key: 'winRate',   label: 'Win Rate' },
    { key: 'sharpe',    label: 'Sharpe' },
    { key: 'trades',    label: 'Trades' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2.5">
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: 'rgba(246,196,83,0.12)', border: '1px solid rgba(246,196,83,0.3)', color: '#f6c453' }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79M18 2H6v7a6 6 0 1012 0V2z"/>
              </svg>
            </span>
            Leaderboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bull">
              <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse2" /> Live
            </span>
            <span className="text-text-muted text-sm">· Ranked by realized demo P&amp;L</span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid rgba(var(--ink),0.06)' }}>
          {(['monthly', 'all-time'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all"
              style={period === p ? { background: 'var(--t-accent-s)', color: 'var(--t-accent)' } : { color: 'var(--t-text-3)' }}>
              {p === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card flex items-center justify-center py-20 text-text-muted text-sm">
          Loading leaderboard…
        </div>
      )}

      {error && (
        <div className="card flex items-center justify-center py-20 text-bear text-sm">{error}</div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--ink),0.05)', color: 'var(--t-text-3)' }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>
            </svg>
          </div>
          <p className="text-text-primary font-semibold">No ranked traders yet</p>
          <p className="text-text-muted text-sm max-w-xs">
            Close some trades on a demo account to get on the board. Rankings are computed from real demo performance.
          </p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          {/* ─ Podium top 3 ─ */}
          <div className="grid grid-cols-3 gap-4">
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, podiumIdx) => {
              const isCenter = podiumIdx === 1 // #1 is in the center
              const ri = isCenter ? 0 : podiumIdx === 0 ? 1 : 2
              const heights = ['h-24', 'h-32', 'h-20']
              return (
                <div key={entry.userId}
                  className={`card flex flex-col items-center justify-end pb-4 ${isCenter ? 'ring-2 ring-yellow-400/40' : ''}`}
                  style={isCenter ? { background: 'rgba(var(--ink),0.06)' } : {}}>
                  {/* Rank badge */}
                  <div className="mb-2"><RankBadge rank={ri + 1} size={30} /></div>
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black mb-2"
                       style={{ color: '#fff', background: GRADIENT[ri], boxShadow: isCenter ? '0 0 24px rgba(251,191,36,0.4)' : 'none' }}>
                    {entry.avatar}
                  </div>
                  <div className="font-bold text-text-primary text-sm">{entry.username}</div>
                  <div className="text-xs text-text-muted mb-1">{entry.trades} trades · {(entry.winRate * 100).toFixed(0)}% win</div>
                  <div className="text-xl font-black font-mono" style={{ color: pnlColor(entry.returnPct) }}>
                    {retStr(entry.returnPct)}
                  </div>
                  <div className="text-xs text-text-muted">${entry.netPnl.toLocaleString()} P&L</div>
                  {/* Podium bar */}
                  <div className={`w-full mt-4 rounded-t-lg ${heights[ri]}`}
                       style={{ background: `linear-gradient(180deg,${ri===0?'rgba(251,191,36,0.25)':ri===1?'rgba(174,166,186,0.15)':'rgba(249,115,22,0.18)'},transparent)`, borderTop: `2px solid ${ri===0?'rgba(251,191,36,0.5)':ri===1?'rgba(174,166,186,0.35)':'rgba(249,115,22,0.4)'}` }} />
                </div>
              )
            })}
          </div>

          {/* ─ Sort controls ─ */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted font-semibold uppercase tracking-wider mr-1">Sort by</span>
            {COLS.map(c => (
              <button key={c.key} onClick={() => setSortKey(c.key)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={sortKey === c.key
                  ? { background: 'var(--t-accent-s)', color: 'var(--t-accent)', border: '1px solid rgba(79,140,255,0.3)' }
                  : { background: 'rgba(var(--ink),0.04)', color: 'var(--t-text-3)', border: '1px solid rgba(var(--ink),0.06)' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* ─ Rankings table ─ */}
          <div className="card overflow-hidden p-0">
            {/* Full table header */}
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(var(--ink),0.05)', background: 'rgba(var(--ink),0.02)' }}>
                  <th className="py-3 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted w-12">#</th>
                  <th className="py-3 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Trader</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Return</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Net P&L</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Win Rate</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Sharpe</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Trades</th>
                  <th className="py-3 px-4 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Streak</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => {
                  const isMe = !!me && entry.userId === me.id
                  return (
                  <tr key={entry.userId}
                    className="transition-colors"
                    style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(var(--ink),0.04)' : 'none', background: isMe ? 'rgba(79,140,255,0.08)' : undefined }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(79,140,255,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(79,140,255,0.08)' : ''}>
                    {/* Rank */}
                    <td className="px-4 py-3.5">
                      <RankBadge rank={entry.displayRank} size={24} />
                    </td>
                    {/* Trader */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                             style={{ color: '#fff', background: entry.displayRank <= 3 ? GRADIENT[entry.displayRank - 1] : 'linear-gradient(135deg,#4f8cff,#7c3aed)' }}>
                          {entry.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                            {entry.username}
                            {isMe && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--t-accent-s)', color: 'var(--t-accent)' }}>YOU</span>}
                          </div>
                          <div className="text-text-muted text-[11px] font-mono">Equity ${entry.equity.toLocaleString()}</div>
                        </div>
                      </div>
                    </td>
                    {/* Return */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-black font-mono tabular text-sm" style={{ color: pnlColor(entry.returnPct) }}>
                        {retStr(entry.returnPct)}
                      </span>
                    </td>
                    {/* Net P&L */}
                    <td className="px-4 py-3.5 text-right font-mono tabular text-text-primary text-sm">
                      ${entry.netPnl.toLocaleString()}
                    </td>
                    {/* Win Rate */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono tabular text-text-primary text-sm">
                          {(entry.winRate * 100).toFixed(0)}%
                        </span>
                        {/* Mini win rate bar */}
                        <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(var(--ink),0.08)' }}>
                          <div className="h-1 rounded-full" style={{ width: `${entry.winRate * 100}%`, background: 'var(--t-bull)' }} />
                        </div>
                      </div>
                    </td>
                    {/* Sharpe */}
                    <td className="px-4 py-3.5 text-right font-mono tabular text-text-secondary text-sm">
                      {entry.sharpe.toFixed(2)}
                    </td>
                    {/* Trades */}
                    <td className="px-4 py-3.5 text-right font-mono tabular text-text-secondary text-sm">
                      {entry.trades}
                    </td>
                    {/* Streak */}
                    <td className="px-4 py-3.5 text-right">
                      {entry.streak > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: 'var(--t-bull-s)', color: 'var(--t-bull)' }}>
                          <StreakFlame /> {entry.streak}W
                        </span>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-center text-text-muted text-xs">
            Ranked by realized demo P&amp;L across all traders · Updates live every 60s
          </p>
        </>
      )}
    </div>
  )
}
