import React, { useEffect, useRef, useState } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency, formatPnl } from '../utils/formatters'
import { PerformanceStats, TradeRecord, EquityPoint } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDuration(ms: number): string {
  if (ms < 60_000) return '<1 min'
  if (ms < 3_600_000) return (ms / 60_000).toFixed(0) + 'm'
  if (ms < 86_400_000) return (ms / 3_600_000).toFixed(1) + 'h'
  return (ms / 86_400_000).toFixed(1) + 'd'
}

function fmtPct(v: number, decimals = 2) {
  const s = (v * 100).toFixed(decimals)
  return (v >= 0 ? '+' : '') + s + '%'
}

function pnlColor(v: number) {
  return v >= 0 ? '#00c878' : '#ff3047'
}

// ---------------------------------------------------------------------------
// Mini stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1.5"
         style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <span className="text-xl font-bold font-mono tabular-nums" style={{ color: color ?? '#e2eaf0' }}>{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SVG equity curve
// ---------------------------------------------------------------------------
function EquityCurve({ points }: { points: EquityPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Not enough data yet — start trading to build your equity curve
      </div>
    )
  }

  const W = 900, H = 220
  const PAD = { top: 12, right: 24, bottom: 32, left: 64 }
  const equities = points.map(p => p.equity)
  const minE = Math.min(...equities)
  const maxE = Math.max(...equities)
  const rangeE = maxE - minE || 1

  const xs = points.map((_, i) => PAD.left + ((i / (points.length - 1)) * (W - PAD.left - PAD.right)))
  const ys = equities.map(e => PAD.top + ((1 - (e - minE) / rangeE) * (H - PAD.top - PAD.bottom)))

  const lineD = xs.map((x, i) => (i === 0 ? `M${x},${ys[i]}` : `L${x},${ys[i]}`)).join(' ')
  const areaD = lineD + ` L${xs[xs.length - 1]},${H - PAD.bottom} L${xs[0]},${H - PAD.bottom} Z`

  const first = equities[0]
  const last = equities[equities.length - 1]
  const isUp = last >= first
  const lineColor = isUp ? '#00c878' : '#ff3047'
  const gradId = isUp ? 'ecUp' : 'ecDn'
  const gradStop = isUp ? '#00c878' : '#ff3047'

  // Y-axis ticks (4)
  const yTicks = [0, 0.33, 0.67, 1].map(t => ({
    y: PAD.top + (1 - t) * (H - PAD.top - PAD.bottom),
    label: formatCurrency(minE + t * rangeE),
  }))

  // X-axis ticks (5)
  const xTickIdxs = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * (points.length - 1)))
  const xTicks = xTickIdxs.map(i => ({
    x: xs[i],
    label: new Date(points[i].time).toLocaleDateString([], { month: 'short', day: 'numeric' }),
  }))

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradStop} stopOpacity="0.22" />
          <stop offset="100%" stopColor={gradStop} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* Line */}
      <path d={lineD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Y-axis labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end"
          fontSize={10} fill="#4b6070" fontFamily="monospace">{t.label}</text>
      ))}
      {/* X-axis labels */}
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={H - 6} textAnchor="middle"
          fontSize={10} fill="#4b6070" fontFamily="monospace">{t.label}</text>
      ))}
      {/* Endpoint dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={lineColor} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// P&L Calendar
// ---------------------------------------------------------------------------
function PnlCalendar({ trades }: { trades: TradeRecord[] }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const now    = new Date()
  const year   = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getFullYear()
  const month  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getMonth()
  const label  = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  // Group closed trades by date key YYYY-MM-DD
  const dayMap: Record<string, { pnl: number; count: number }> = {}
  trades.forEach(t => {
    if (!t.closedAt || t.netPnl == null) return
    const d  = new Date(t.closedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (!dayMap[key]) dayMap[key] = { pnl: 0, count: 0 }
    dayMap[key].pnl   += t.netPnl
    dayMap[key].count += 1
  })

  const firstDay    = new Date(year, month, 1).getDay()  // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const allPnls   = Object.values(dayMap).map(d => Math.abs(d.pnl))
  const maxAbs    = allPnls.length ? Math.max(...allPnls) : 1

  const cells: (null | number)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthlyPnl = Object.entries(dayMap)
    .filter(([k]) => {
      const [y, m] = k.split('-').map(Number)
      return y === year && m === month + 1
    })
    .reduce((acc, [, v]) => acc + v.pnl, 0)

  return (
    <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">P&amp;L Calendar</h3>
          <p className="text-xs text-text-muted mt-0.5">Daily closed trade results</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold tabular"
            style={{ color: monthlyPnl >= 0 ? '#00c878' : '#ff3047' }}>
            {monthlyPnl >= 0 ? '+' : ''}{formatCurrency(monthlyPnl)}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMonthOffset(o => o - 1)}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors text-text-muted hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-xs font-semibold text-text-secondary w-36 text-center">{label}</span>
            <button type="button" onClick={() => setMonthOffset(o => Math.min(o + 1, 0))}
              disabled={monthOffset === 0}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors text-text-muted hover:text-white disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider pb-1.5"
               style={{ color: '#3b5070' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const data = dayMap[key]
          const isToday = key === todayStr
          const intensity = data ? Math.min(data.pnl === 0 ? 0 : Math.abs(data.pnl) / maxAbs, 1) : 0
          const alpha     = data ? 0.15 + intensity * 0.6 : 0

          let bg = 'rgba(255,255,255,0.03)'
          let textColor = '#3b5070'
          if (data) {
            bg = data.pnl >= 0
              ? `rgba(0,200,120,${alpha})`
              : `rgba(255,48,71,${alpha})`
            textColor = data.pnl >= 0 ? '#00c878' : '#ff3047'
          }

          return (
            <div key={key}
              title={data ? `${formatCurrency(data.pnl)} (${data.count} trade${data.count > 1 ? 's' : ''})` : `${day} — no trades`}
              className="aspect-square rounded-md flex flex-col items-center justify-center cursor-default relative transition-all"
              style={{
                background: bg,
                border: isToday ? '1px solid rgba(14,165,233,0.5)' : '1px solid transparent',
              }}>
              <span className="text-[10px] font-mono leading-none" style={{ color: data ? textColor : '#3b5070' }}>{day}</span>
              {data && (
                <span className="text-[9px] font-mono font-bold leading-none mt-0.5 tabular" style={{ color: textColor }}>
                  {data.pnl >= 0 ? '+' : ''}{data.pnl >= 1000 || data.pnl <= -1000
                    ? (data.pnl / 1000).toFixed(1) + 'k'
                    : data.pnl.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(0,200,120,0.55)' }} />
          <span className="text-[10px] text-text-muted">Profit day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,48,71,0.55)' }} />
          <span className="text-[10px] text-text-muted">Loss day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} />
          <span className="text-[10px] text-text-muted">No trades</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trade Journal row
// ---------------------------------------------------------------------------
function JournalRow({ trade, idx }: { trade: TradeRecord; idx: number }) {
  const pnl = trade.netPnl ?? 0
  const isWin = pnl > 0
  const isClosed = !!trade.closedAt
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
      <td className="px-4 py-2.5 font-bold text-text-primary text-xs font-mono">{trade.symbol}</td>
      <td className="px-4 py-2.5 text-xs">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
          style={trade.side === 'buy'
            ? { background: 'rgba(0,200,120,0.12)', color: '#00c878' }
            : { background: 'rgba(255,48,71,0.12)', color: '#ff3047' }
          }>{trade.side}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-secondary tabular">{trade.quantity}</td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-secondary tabular">{formatCurrency(trade.entryPrice)}</td>
      <td className="px-4 py-2.5 text-xs text-right font-mono tabular">
        {isClosed && trade.exitPrice ? formatCurrency(trade.exitPrice) : <span className="text-text-muted">Open</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono font-semibold tabular"
          style={{ color: isClosed ? pnlColor(pnl) : '#6b8099' }}>
        {isClosed ? formatPnl(pnl) : '—'}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-muted tabular">
        {formatCurrency(trade.commission)}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-muted">
        {isClosed && trade.holdingPeriodMs ? fmtDuration(trade.holdingPeriodMs) : '—'}
      </td>
      <td className="px-4 py-2.5 text-xs text-center">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
          style={isClosed
            ? isWin
              ? { background: 'rgba(0,200,120,0.12)', color: '#00c878' }
              : { background: 'rgba(255,48,71,0.12)', color: '#ff3047' }
            : { background: 'rgba(255,255,255,0.06)', color: '#6b8099' }
          }>{isClosed ? (isWin ? 'Win' : 'Loss') : 'Open'}</span>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Asset class breakdown bar
// ---------------------------------------------------------------------------
function AssetBreakdown({ trades }: { trades: TradeRecord[] }) {
  const closed = trades.filter(t => !!t.closedAt)
  if (closed.length === 0) return null

  const byClass: Record<string, { count: number; pnl: number }> = {}
  for (const t of closed) {
    const ac = t.assetClass
    if (!byClass[ac]) byClass[ac] = { count: 0, pnl: 0 }
    byClass[ac].count++
    byClass[ac].pnl += t.netPnl ?? 0
  }
  const entries = Object.entries(byClass).sort((a, b) => b[1].count - a[1].count)
  const total = closed.length

  const classColors: Record<string, string> = { stock: '#0ea5e9', crypto: '#e879f9', forex: '#f59e0b' }

  return (
    <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-sm font-semibold text-text-primary mb-4">Asset Class Breakdown</h3>
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {entries.map(([ac, d]) => (
          <div key={ac} style={{ width: (d.count / total * 100) + '%', background: classColors[ac] ?? '#6b8099' }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {entries.map(([ac, d]) => (
          <div key={ac} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: classColors[ac] ?? '#6b8099' }} />
              <span className="text-text-secondary capitalize font-medium">{ac}</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-text-muted">{d.count} trades</span>
              <span style={{ color: pnlColor(d.pnl) }}>{formatPnl(d.pnl)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { performanceStats: stats, tradeJournal: trades, analyticsLoading, loadAnalytics } = useTradingStore()

  useEffect(() => { loadAnalytics() }, [])

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="text-text-muted text-sm">Loading analytics…</span>
      </div>
    )
  }

  const hasClosedTrades = stats && stats.totalTrades > 0
  const hasAnyTrades    = trades && trades.length > 0
  // Show the "No trades yet" splash only when there are genuinely no journal
  // entries at all.  An open position (buy executed, not yet closed) has
  // closedAt=undefined and counts toward hasAnyTrades but not hasClosedTrades.
  const empty = !hasClosedTrades && !hasAnyTrades

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#06090f' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Performance Analytics</h1>
          <p className="text-xs text-text-muted mt-0.5">Your detailed trading statistics and trade journal</p>
        </div>
        <button onClick={() => loadAnalytics()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-5">
        {empty ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl"
               style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="text-text-secondary font-medium">No trades yet</p>
            <p className="text-text-muted text-sm text-center max-w-xs">Place your first trade to start building performance analytics and an equity curve.</p>
          </div>
        ) : (
          <>
            {/* Stats & charts — only visible once a position has been closed */}
            {hasClosedTrades ? (<>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Net P&L" value={formatPnl(stats!.netProfit)} color={pnlColor(stats!.netProfit)}
                sub={stats!.totalTrades + ' total trades'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
              <StatCard label="Win Rate" value={fmtPct(stats!.winRate, 1)}
                color={stats!.winRate >= 0.5 ? '#00c878' : '#ff3047'}
                sub={stats!.winningTrades + 'W / ' + stats!.losingTrades + 'L'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>}/>
              <StatCard label="Profit Factor" value={stats!.grossLoss === 0 ? '∞' : stats!.profitFactor.toFixed(2)}
                color={stats!.profitFactor >= 1 ? '#00c878' : '#ff3047'}
                sub="Gross profit / loss"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>}/>
              <StatCard label="Sharpe Ratio" value={stats!.sharpeRatio.toFixed(2)}
                color={stats!.sharpeRatio >= 1 ? '#00c878' : stats!.sharpeRatio >= 0 ? '#f59e0b' : '#ff3047'}
                sub="Annualised (√252)"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}/>
              <StatCard label="Max Drawdown" value={fmtPct(stats!.maxDrawdownPercent / 100)}
                color='#ff3047'
                sub={'Peak: ' + formatCurrency(stats!.maxDrawdown)}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>}/>
            </div>

            {/* Second row KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Avg Win" value={formatCurrency(stats!.avgWin)} color="#00c878" sub="Per winning trade"/>
              <StatCard label="Avg Loss" value={formatCurrency(stats!.avgLoss)} color="#ff3047" sub="Per losing trade"/>
              <StatCard label="Expectancy" value={formatCurrency(stats!.expectancy)} color={pnlColor(stats!.expectancy)} sub="Per trade expected value"/>
              <StatCard label="Avg Holding" value={fmtDuration(stats!.avgHoldingPeriodMs)} sub={formatCurrency(stats!.totalVolume) + ' total volume'}/>
            </div>

            {/* Equity curve */}
            <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Equity Curve</h3>
                {stats!.equityCurve.length > 0 && (
                  <span className="text-xs font-mono font-semibold"
                    style={{ color: pnlColor(stats!.equityCurve[stats!.equityCurve.length - 1].equity - stats!.equityCurve[0].equity) }}>
                    {formatCurrency(stats!.equityCurve[stats!.equityCurve.length - 1].equity)}
                  </span>
                )}
              </div>
              <EquityCurve points={stats!.equityCurve} />
            </div>

            {/* Asset breakdown */}
            <AssetBreakdown trades={trades} />

            {/* P&L Calendar */}
            <PnlCalendar trades={trades} />
            </>) : (
              /* No closed trades yet but open positions exist — show banner above journal */
              <div className="rounded-xl p-6 flex items-center gap-4"
                   style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
                <svg className="w-8 h-8 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <div>
                  <p className="text-text-primary font-semibold text-sm">Position open — stats available after closing</p>
                  <p className="text-text-muted text-xs mt-0.5">Performance metrics (win rate, P&amp;L, Sharpe ratio) are calculated on completed round-trip trades. Close your position to unlock analytics.</p>
                </div>
              </div>
            )}

            {/* Trade journal — always shown when there are any entries */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-text-primary">Trade Journal</h3>
                <span className="text-xs text-text-muted">{trades.length} entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                      {['Symbol', 'Side', 'Qty', 'Entry', 'Exit', 'Net P&L', 'Commission', 'Duration', 'Result'].map((h, i) => (
                        <th key={h} className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${i >= 2 && i <= 5 ? 'text-right' : i === 8 ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => <JournalRow key={t.id} trade={t} idx={i} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
