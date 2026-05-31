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
         style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
        Not enough data yet - start trading to build your equity curve
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
// P&L Calendar — premium redesign
// ---------------------------------------------------------------------------
function PnlCalendar({ trades }: { trades: TradeRecord[] }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null)

  const now   = new Date()
  const base  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year  = base.getFullYear()
  const month = base.getMonth()
  const label = base.toLocaleString('default', { month: 'long', year: 'numeric' })

  // ── Build day map ──────────────────────────────────────────────────────────
  const dayMap: Record<string, { pnl: number; count: number; wins: number }> = {}
  trades.forEach(t => {
    if (!t.closedAt || t.netPnl == null) return
    const d   = new Date(t.closedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (!dayMap[key]) dayMap[key] = { pnl: 0, count: 0, wins: 0 }
    dayMap[key].pnl   += t.netPnl
    dayMap[key].count += 1
    if (t.netPnl > 0) dayMap[key].wins++
  })

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const monthEntries = Object.entries(dayMap).filter(([k]) => {
    const [y, m] = k.split('-').map(Number)
    return y === year && m === month + 1
  })
  const monthlyPnl = monthEntries.reduce((s, [, v]) => s + v.pnl, 0)
  const tradingDays = monthEntries.length
  const winDays     = monthEntries.filter(([, v]) => v.pnl > 0).length
  const monthPnls   = monthEntries.map(([, v]) => v.pnl)
  const bestDay     = monthPnls.length ? Math.max(...monthPnls) : 0
  const worstDay    = monthPnls.length ? Math.min(...monthPnls) : 0
  const maxAbsMonth = Math.max(Math.abs(bestDay), Math.abs(worstDay), 1)

  // ── Build rows (weeks) ────────────────────────────────────────────────────
  const flatCells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (flatCells.length % 7 !== 0) flatCells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < flatCells.length; i += 7) rows.push(flatCells.slice(i, i + 7))

  const weekTotal = (row: (number | null)[]): number =>
    row.reduce<number>((s, day) => {
      if (!day) return s
      const k = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      return s + (dayMap[k]?.pnl ?? 0)
    }, 0)

  const fmtShort = (v: number) => {
    const sign = v >= 0 ? '+' : ''
    if (Math.abs(v) >= 10000) return sign + '$' + (v/1000).toFixed(0) + 'k'
    if (Math.abs(v) >= 1000)  return sign + '$' + (v/1000).toFixed(1) + 'k'
    return sign + '$' + v.toFixed(0)
  }

  const G = '#10b981', R = '#ef4444', MUTED = '#334155'

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(14,165,233,0.04) 0%, rgba(0,0,0,0) 60%)',
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>

      {/* ── Top header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 22px 0', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>

          {/* Title + icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.1))',
              border: '1px solid rgba(14,165,233,0.25)',
              boxShadow: '0 0 12px rgba(14,165,233,0.15)',
            }}>
              {/* Calendar icon */}
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', margin: 0, lineHeight: 1.2 }}>P&amp;L Calendar</h3>
              <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Daily closed trade performance</p>
            </div>
          </div>

          {/* Month nav + monthly total */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setMonthOffset(o => o - 1)} style={{
                width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', minWidth: 130, textAlign: 'center' }}>{label}</span>
              <button onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} disabled={monthOffset === 0} style={{
                width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#64748b', cursor: monthOffset === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: monthOffset === 0 ? 0.3 : 1,
              }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 900, fontFamily: 'monospace',
              color: monthlyPnl >= 0 ? G : R,
              textShadow: `0 0 20px ${monthlyPnl >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
              lineHeight: 1,
            }}>
              {monthlyPnl >= 0 ? '+' : ''}{formatCurrency(monthlyPnl)}
            </div>
          </div>
        </div>

        {/* ── Monthly stats strip ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            {
              icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              label: 'Trading Days', value: String(tradingDays), color: '#38bdf8',
            },
            {
              icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={G} strokeWidth={2}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              label: 'Win Days',
              value: tradingDays > 0 ? `${winDays} (${Math.round(winDays/tradingDays*100)}%)` : '—',
              color: G,
            },
            {
              icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={G} strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
              label: 'Best Day', value: bestDay > 0 ? fmtShort(bestDay) : '—', color: G,
            },
            {
              icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={R} strokeWidth={2}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
              label: 'Worst Day', value: worstDay < 0 ? fmtShort(worstDay) : '—', color: R,
            },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                {s.icon}
                <span style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div data-calendar style={{ padding: '0 22px 20px', position: 'relative' }}>

        {/* Weekday + Week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 64px', gap: 4, marginBottom: 4 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: 4 }}>{d}</div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Week</div>
        </div>

        {/* Weeks */}
        {rows.map((row, ri) => {
          const wPnl: number = weekTotal(row)
          const hasWeekTrades = row.some(day => {
            if (!day) return false
            const k = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            return !!dayMap[k]
          })
          return (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 64px', gap: 4, marginBottom: 4 }}>
              {row.map((day, ci) => {
                if (!day) return <div key={`e-${ri}-${ci}`} style={{ borderRadius: 10 }}/>
                const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const data    = dayMap[key]
                const isToday = key === todayStr
                const inFuture = new Date(year, month, day) > now && key !== todayStr

                // Heat map intensity relative to best/worst day this month
                const intensity = data
                  ? Math.min(Math.abs(data.pnl) / maxAbsMonth, 1)
                  : 0
                const alpha = data ? 0.12 + intensity * 0.55 : 0

                const bg = data
                  ? data.pnl >= 0
                    ? `rgba(16,185,129,${alpha})`
                    : `rgba(239,68,68,${alpha})`
                  : inFuture ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'

                const pnlColor2 = data
                  ? data.pnl >= 0 ? G : R
                  : inFuture ? '#1e293b' : MUTED

                const borderStyle = isToday
                  ? `1px solid rgba(56,189,248,0.7)`
                  : data
                  ? `1px solid ${data.pnl >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`
                  : '1px solid rgba(255,255,255,0.04)'

                const glowShadow = isToday
                  ? '0 0 0 2px rgba(56,189,248,0.15), inset 0 0 10px rgba(56,189,248,0.05)'
                  : data && intensity > 0.5
                  ? `inset 0 0 12px ${data.pnl >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}`
                  : 'none'

                return (
                  <div
                    key={key}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const parent = (e.currentTarget as HTMLElement).closest('[data-calendar]')?.getBoundingClientRect()
                      setTooltip({ key, x: rect.left - (parent?.left ?? 0), y: rect.bottom - (parent?.top ?? 0) })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      minHeight: 58, borderRadius: 10, padding: '7px 6px',
                      background: bg, border: borderStyle, boxShadow: glowShadow,
                      cursor: data ? 'default' : 'default',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Gradient sheen for high-intensity days */}
                    {data && intensity > 0.6 && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 10,
                        background: data.pnl >= 0
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, transparent 70%)'
                          : 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, transparent 70%)',
                        pointerEvents: 'none',
                      }}/>
                    )}

                    {/* Day number */}
                    <span style={{
                      fontSize: 11, fontWeight: isToday ? 800 : 600, alignSelf: 'flex-start',
                      color: isToday ? '#38bdf8' : data ? '#94a3b8' : inFuture ? '#1e293b' : '#334155',
                      lineHeight: 1,
                    }}>{day}</span>

                    {/* P&L value */}
                    {data && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{
                          fontSize: intensity > 0.4 ? 12 : 10,
                          fontWeight: 800, fontFamily: 'monospace',
                          color: pnlColor2, lineHeight: 1,
                          textShadow: intensity > 0.6 ? `0 0 8px ${data.pnl >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}` : 'none',
                        }}>
                          {fmtShort(data.pnl)}
                        </span>
                        {/* Trade count dots */}
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Array.from({ length: Math.min(data.count, 5) }).map((_, i) => (
                            <span key={i} style={{
                              width: 4, height: 4, borderRadius: '50%',
                              background: data.pnl >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)',
                              boxShadow: data.pnl >= 0 ? '0 0 3px rgba(16,185,129,0.5)' : '0 0 3px rgba(239,68,68,0.5)',
                            }}/>
                          ))}
                          {data.count > 5 && <span style={{ fontSize: 8, color: pnlColor2, lineHeight: '4px' }}>+{data.count-5}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Week total */}
              <div style={{
                minHeight: 58, borderRadius: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: hasWeekTrades
                  ? wPnl >= 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)'
                  : 'rgba(255,255,255,0.02)',
                border: hasWeekTrades
                  ? `1px solid ${wPnl >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`
                  : '1px solid rgba(255,255,255,0.04)',
              }}>
                {hasWeekTrades ? (
                  <>
                    <span style={{ fontSize: 8, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wk</span>
                    <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: wPnl >= 0 ? G : R, lineHeight: 1 }}>
                      {fmtShort(wPnl)}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: '#1e3a5f' }}>—</span>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Hover tooltip ──────────────────────────────────────────────── */}
        {tooltip && dayMap[tooltip.key] && (() => {
          const d   = dayMap[tooltip.key]
          const [y, m, day] = tooltip.key.split('-').map(Number)
          const dateLabel = new Date(y, m-1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const winRate2 = d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0
          return (
            <div style={{
              position: 'absolute', left: Math.min(tooltip.x, 500), top: tooltip.y + 6,
              zIndex: 50, pointerEvents: 'none',
              background: 'rgba(10,14,26,0.97)', backdropFilter: 'blur(12px)',
              border: `1px solid ${d.pnl >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
              borderRadius: 12, padding: '10px 14px', minWidth: 160,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px' }}>{dateLabel}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Net P&L</span>
                <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: d.pnl >= 0 ? G : R }}>
                  {d.pnl >= 0 ? '+' : ''}{formatCurrency(d.pnl)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Trades</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{d.count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Win rate</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: winRate2 >= 50 ? G : R }}>{winRate2}%</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Legend + heatmap scale ───────────────────────────────────────── */}
      <div style={{ padding: '12px 22px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(16,185,129,0.6)', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }}/>
            <span style={{ fontSize: 10, color: '#475569' }}>Profit day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(239,68,68,0.6)', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}/>
            <span style={{ fontSize: 10, color: '#475569' }}>Loss day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            <span style={{ fontSize: 10, color: '#475569' }}>No trades</span>
          </div>
        </div>
        {/* Heatmap scale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#334155' }}>Low</span>
          <div style={{
            width: 80, height: 8, borderRadius: 4, overflow: 'hidden',
            background: 'linear-gradient(to right, rgba(16,185,129,0.15), rgba(16,185,129,0.7))',
          }}/>
          <span style={{ fontSize: 10, color: '#334155' }}>High intensity</span>
        </div>
      </div>

      <style>{`[data-calendar]{position:relative}`}</style>
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
          style={trade.side === 'long'
            ? { background: 'rgba(0,200,120,0.12)', color: '#00c878' }
            : { background: 'rgba(255,48,71,0.12)', color: '#ff3047' }
          }>{trade.side}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-secondary tabular">{trade.quantity}</td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-secondary tabular">{formatCurrency(trade.entryPrice ?? trade.entry_price)}</td>
      <td className="px-4 py-2.5 text-xs text-right font-mono tabular">
        {isClosed && trade.exitPrice ? formatCurrency(trade.exitPrice) : <span className="text-text-muted">Open</span>}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono font-semibold tabular"
          style={{ color: isClosed ? pnlColor(pnl) : '#6b8099' }}>
        {isClosed ? formatPnl(pnl) : '-'}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-muted tabular">
        {formatCurrency(trade.commission)}
      </td>
      <td className="px-4 py-2.5 text-xs text-right font-mono text-text-muted">
        {isClosed && trade.holdingPeriodMs ? fmtDuration(trade.holdingPeriodMs) : '-'}
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
    const ac = t.assetClass ?? 'unknown'
    if (!byClass[ac]) byClass[ac] = { count: 0, pnl: 0 }
    byClass[ac].count++
    byClass[ac].pnl += t.netPnl ?? t.net_pnl ?? 0
  }
  const entries = Object.entries(byClass).sort((a, b) => b[1].count - a[1].count)
  const total = closed.length

  const classColors: Record<string, string> = { stock: '#0ea5e9', crypto: '#e879f9', forex: '#f59e0b' }

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
    <div className="flex flex-col h-full overflow-y-auto">
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
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="text-text-secondary font-medium">No trades yet</p>
            <p className="text-text-muted text-sm text-center max-w-xs">Place your first trade to start building performance analytics and an equity curve.</p>
          </div>
        ) : (
          <>
            {/* Stats & charts - only visible once a position has been closed */}
            {hasClosedTrades ? (<>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Net P&L" value={formatPnl(stats!.netProfit ?? stats!.totalNetPnl)} color={pnlColor(stats!.netProfit ?? stats!.totalNetPnl)}
                sub={stats!.totalTrades + ' total trades'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
              <StatCard label="Win Rate" value={fmtPct(stats!.winRate, 1)}
                color={stats!.winRate >= 0.5 ? '#00c878' : '#ff3047'}
                sub={stats!.winningTrades + 'W / ' + stats!.losingTrades + 'L'}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>}/>
              <StatCard label="Profit Factor" value={stats!.grossLoss === 0 ? '∞' : (stats!.profitFactor ?? 0).toFixed(2)}
                color={(stats!.profitFactor ?? 0) >= 1 ? '#00c878' : '#ff3047'}
                sub="Gross profit / loss"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>}/>
              <StatCard label="Sharpe Ratio" value={(stats!.sharpeRatio ?? 0).toFixed(2)}
                color={(stats!.sharpeRatio ?? 0) >= 1 ? '#00c878' : (stats!.sharpeRatio ?? 0) >= 0 ? '#f59e0b' : '#ff3047'}
                sub="Annualised (√252)"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}/>
              <StatCard label="Max Drawdown" value={fmtPct((stats!.maxDrawdownPercent ?? 0) / 100)}
                color='#ff3047'
                sub={'Peak: ' + formatCurrency(stats!.maxDrawdown ?? 0)}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>}/>
            </div>

            {/* Second row KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Avg Win" value={formatCurrency(stats!.avgWin)} color="#00c878" sub="Per winning trade"/>
              <StatCard label="Avg Loss" value={formatCurrency(stats!.avgLoss)} color="#ff3047" sub="Per losing trade"/>
              <StatCard label="Expectancy" value={formatCurrency(stats!.expectancy ?? 0)} color={pnlColor(stats!.expectancy ?? 0)} sub="Per trade expected value"/>
              <StatCard label="Avg Holding" value={fmtDuration(stats!.avgHoldingPeriodMs ?? 0)} sub={formatCurrency(stats!.totalVolume ?? 0) + ' total volume'}/>
            </div>

            {/* Equity curve */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Equity Curve</h3>
                {(stats!.equityCurve ?? []).length > 0 && (
                  <span className="text-xs font-mono font-semibold"
                    style={{ color: pnlColor((stats!.equityCurve ?? [])[(stats!.equityCurve ?? []).length - 1].equity - (stats!.equityCurve ?? [])[0].equity) }}>
                    {formatCurrency((stats!.equityCurve ?? [])[(stats!.equityCurve ?? []).length - 1].equity)}
                  </span>
                )}
              </div>
              <EquityCurve points={stats!.equityCurve ?? []} />
            </div>

            {/* Asset breakdown */}
            <AssetBreakdown trades={trades} />

            {/* P&L Calendar */}
            <PnlCalendar trades={trades} />
            </>) : (
              /* No closed trades yet but open positions exist - show banner above journal */
              <div className="rounded-xl p-6 flex items-center gap-4"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <svg className="w-8 h-8 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <div>
                  <p className="text-text-primary font-semibold text-sm">Position open - stats available after closing</p>
                  <p className="text-text-muted text-xs mt-0.5">Performance metrics (win rate, P&amp;L, Sharpe ratio) are calculated on completed round-trip trades. Close your position to unlock analytics.</p>
                </div>
              </div>
            )}

            {/* Trade journal - always shown when there are any entries */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
