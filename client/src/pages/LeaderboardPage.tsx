import React, { useEffect, useState } from 'react'
import { getLeaderboard, LeaderboardEntry } from '../api/leaderboard'

const FLAG: Record<string, string> = {
  US: '🇺🇸', UK: '🇬🇧', DE: '🇩🇪', AU: '🇦🇺', CA: '🇨🇦',
  SG: '🇸🇬', JP: '🇯🇵', FR: '🇫🇷', BR: '🇧🇷', NZ: '🇳🇿',
}

const MEDAL = ['🥇', '🥈', '🥉']

const GRADIENT = [
  'linear-gradient(135deg,#fbbf24,#f59e0b)',
  'linear-gradient(135deg,#94a3b8,#64748b)',
  'linear-gradient(135deg,#f97316,#b45309)',
]

type SortKey = 'returnPct' | 'netPnl' | 'winRate' | 'sharpe' | 'trades'

export default function LeaderboardPage() {
  const [data, setData]       = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('returnPct')
  const [period, setPeriod]   = useState<'monthly' | 'all-time'>('monthly')

  useEffect(() => {
    setLoading(true)
    getLeaderboard()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load leaderboard'); setLoading(false) })
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
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
            🏆 Leaderboard
          </h1>
          <p className="text-text-muted text-sm mt-1">Top traders ranked by verified performance</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['monthly', 'all-time'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all"
              style={period === p ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8' } : { color: '#6b8099' }}>
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

      {!loading && !error && (
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
                  style={isCenter ? { background: 'linear-gradient(160deg,#0f1e35,#0c1829)' } : {}}>
                  {/* Medal */}
                  <div className="text-2xl mb-1">{MEDAL[ri]}</div>
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black mb-2"
                       style={{ background: GRADIENT[ri], boxShadow: isCenter ? '0 0 24px rgba(251,191,36,0.4)' : 'none' }}>
                    {entry.avatar}
                  </div>
                  <div className="font-bold text-white text-sm">{entry.username}</div>
                  <div className="text-xs text-text-muted mb-1">{FLAG[entry.country] ?? ''} {entry.country}</div>
                  <div className="text-xl font-black font-mono" style={{ color: '#00c878' }}>
                    +{entry.returnPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-muted">${entry.netPnl.toLocaleString()} P&L</div>
                  {/* Podium bar */}
                  <div className={`w-full mt-4 rounded-t-lg ${heights[ri]}`}
                       style={{ background: `linear-gradient(180deg,${ri===0?'rgba(251,191,36,0.25)':ri===1?'rgba(148,163,184,0.15)':'rgba(249,115,22,0.18)'},transparent)`, borderTop: `2px solid ${ri===0?'rgba(251,191,36,0.5)':ri===1?'rgba(148,163,184,0.35)':'rgba(249,115,22,0.4)'}` }} />
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
                  ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.06)' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* ─ Rankings table ─ */}
          <div className="card overflow-hidden p-0">
            {/* Full table header */}
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
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
                {sorted.map((entry, i) => (
                  <tr key={entry.userId}
                    className="transition-colors"
                    style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    {/* Rank */}
                    <td className="px-4 py-3.5">
                      {entry.displayRank <= 3
                        ? <span className="text-base">{MEDAL[entry.displayRank - 1]}</span>
                        : <span className="font-black font-mono text-text-muted text-sm">{entry.displayRank}</span>}
                    </td>
                    {/* Trader */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                             style={{ background: entry.displayRank <= 3 ? GRADIENT[entry.displayRank - 1] : 'linear-gradient(135deg,#0ea5e9,#7c3aed)' }}>
                          {entry.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary text-sm">{entry.username}</div>
                          <div className="text-text-muted text-[11px]">{FLAG[entry.country] ?? ''} {entry.country}</div>
                        </div>
                      </div>
                    </td>
                    {/* Return */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-black font-mono tabular text-sm" style={{ color: '#00c878' }}>
                        +{entry.returnPct.toFixed(1)}%
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
                        <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-1 rounded-full" style={{ width: `${entry.winRate * 100}%`, background: '#00c878' }} />
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
                              style={{ background: 'rgba(0,200,120,0.12)', color: '#00c878' }}>
                          🔥 {entry.streak}W
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <p className="text-center text-text-muted text-xs">
            Rankings update every 60 seconds · Verified by TradeX Pro · FCA Regulated
          </p>
        </>
      )}
    </div>
  )
}
