import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  getBots, getBotById, createBot, startBot, stopBot, deleteBot,
  Bot, BotStrategy, BotLog, BotEquityPoint, SymbolSentiment, getNewsSentiment,
} from '../api/bots'

// ─── Constants ────────────────────────────────────────────────────────────────

const STRATEGY_META: Record<BotStrategy, { label: string; color: string; desc: string; gradient: string }> = {
  ma_crossover: { label: 'MA Cross',  color: '#0ea5e9', gradient: 'from-sky-500/10',    desc: 'Golden/death cross of fast & slow SMAs' },
  rsi:          { label: 'RSI',       color: '#8b5cf6', gradient: 'from-violet-500/10', desc: 'Buy oversold, sell overbought via RSI' },
  macd:         { label: 'MACD',      color: '#06b6d4', gradient: 'from-cyan-500/10',   desc: 'Signal-line crossover with histogram' },
  momentum:     { label: 'Momentum',  color: '#f59e0b', gradient: 'from-amber-500/10',  desc: 'Breakout above/below N-period range' },
}

const STRATEGY_ICON: Record<BotStrategy, React.ReactNode> = {
  ma_crossover: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 17 9 11 13 15 21 7"/>
      <polyline points="17 7 21 7 21 11"/>
    </svg>
  ),
  rsi: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M2 12 Q6 4 10 12 Q14 20 18 12 Q20 8 22 12"/>
    </svg>
  ),
  macd: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="12" width="3" height="8" rx="1"/>
      <rect x="9" y="8"  width="3" height="12" rx="1"/>
      <rect x="15" y="4" width="3" height="16" rx="1"/>
      <rect x="21" y="10" width="1" height="1"/>
    </svg>
  ),
  momentum: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M5 19 L12 5 L19 19"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  ),
}

const LOG_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  info:   { color: '#64748b', bg: 'transparent',              label: 'INFO'   },
  signal: { color: '#f59e0b', bg: 'rgba(245,158,11,0.05)',    label: 'SIGNAL' },
  trade:  { color: '#00c878', bg: 'rgba(0,200,120,0.05)',     label: 'TRADE'  },
  risk:   { color: '#f43f5e', bg: 'rgba(244,63,94,0.05)',     label: 'RISK'   },
  warn:   { color: '#f97316', bg: 'rgba(249,115,22,0.05)',    label: 'WARN'   },
  error:  { color: '#ef4444', bg: 'rgba(239,68,68,0.05)',     label: 'ERROR'  },
}

const SYMBOL_LIST = [
  'BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD',
  'AAPL','TSLA','NVDA','MSFT','GOOGL','AMZN','META',
  'EURUSD','GBPUSD','USDJPY','AUDUSD',
]

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function $pnl(n: number, showSign = true) {
  const s = n >= 0 ? (showSign ? '+' : '') : '-'
  return `${s}$${Math.abs(n).toFixed(2)}`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, compact = false }: { status: Bot['status']; compact?: boolean }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    running:    { bg: 'rgba(0,200,120,0.12)',   color: '#00c878', label: 'Running'    },
    warming_up: { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8', label: 'Warming up' },
    paused:     { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Paused'     },
    idle:       { bg: 'rgba(148,163,184,0.12)', color: '#64748b', label: 'Idle'       },
    stopped:    { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Stopped'    },
    error:      { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Error'      },
  }
  const c = cfg[status] ?? cfg.idle
  const alive = status === 'running' || status === 'warming_up'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
          style={{ background: c.bg, color: c.color }}>
      <span className={`rounded-full shrink-0 ${compact ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5'} ${alive ? 'animate-pulse' : ''}`}
            style={{ background: c.color, boxShadow: alive ? `0 0 5px ${c.color}` : 'none' }} />
      {c.label}
    </span>
  )
}

// ─── Equity area chart ────────────────────────────────────────────────────────

function EquityChart({ curve, height = 80 }: { curve: BotEquityPoint[]; height?: number }) {
  if (!curve || curve.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs" style={{ height, color: '#334155' }}>
        No equity data yet — trades will appear here
      </div>
    )
  }
  const W = 800
  const pnls = curve.map(p => p.pnl)
  const rawMin = Math.min(...pnls), rawMax = Math.max(...pnls)
  const pad  = (rawMax - rawMin) * 0.1 || 1
  const min  = rawMin - pad, max = rawMax + pad
  const range = max - min
  const toY = (v: number) => height - ((v - min) / range) * height
  const zeroY = toY(0)
  const pts = curve.map((p, i) => ({ x: (i / (curve.length - 1)) * W, y: toY(p.pnl) }))
  const linePts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fillPath =
    `M ${pts[0].x},${Math.min(zeroY, height)} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${Math.min(zeroY, height)} Z`
  const lastPnl = pnls[pnls.length - 1]
  const color = lastPnl >= 0 ? '#00c878' : '#ef4444'
  const uid = Math.random().toString(36).slice(2, 7)
  return (
    <div style={{ position: 'relative', height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
           style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`eg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* zero line */}
        {zeroY >= 0 && zeroY <= height && (
          <line x1="0" y1={zeroY} x2={W} y2={zeroY}
                stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4"/>
        )}
        <path d={fillPath} fill={`url(#eg-${uid})`}/>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={linePts}/>
        {/* last point dot */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3"
                fill={color} stroke="#000" strokeWidth="2"/>
      </svg>
    </div>
  )
}

// Mini sparkline for bot cards
function MiniSparkline({ curve }: { curve: BotEquityPoint[] }) {
  if (!curve || curve.length < 2) return <div style={{ width: 64, height: 24 }} />
  const W = 64, H = 24
  const pnls = curve.map(p => p.pnl)
  const min = Math.min(...pnls), max = Math.max(...pnls)
  const range = max - min || 1
  const pts = curve.map((p, i) => `${((i / (curve.length - 1)) * W).toFixed(1)},${(H - ((p.pnl - min) / range) * H).toFixed(1)}`).join(' ')
  const color = pnls[pnls.length - 1] >= 0 ? '#00c878' : '#ef4444'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts}/>
    </svg>
  )
}

// ─── Log line ─────────────────────────────────────────────────────────────────

function LogLine({ log }: { log: BotLog }) {
  const s = LOG_STYLE[log.level] ?? LOG_STYLE.info
  return (
    <div className="flex items-start gap-3 px-4 py-1.5"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: s.bg }}>
      <span className="text-xs font-mono shrink-0 tabular-nums" style={{ color: '#334155', minWidth: 72 }}>
        {fmtTime(log.ts)}
      </span>
      <span className="text-xs font-bold shrink-0 uppercase tabular-nums" style={{ color: s.color, minWidth: 52 }}>
        {s.label}
      </span>
      <span className="text-xs font-mono leading-relaxed break-all" style={{ color: s.color, opacity: 0.85 }}>
        {log.message}
      </span>
    </div>
  )
}

// ─── Bot card ─────────────────────────────────────────────────────────────────

function BotCard({ bot, selected, onClick }: { bot: Bot; selected: boolean; onClick: () => void }) {
  const meta     = STRATEGY_META[bot.strategy]
  const pnlPos   = bot.pnl >= 0
  const winRate  = bot.trades > 0 ? ((bot.wins / bot.trades) * 100).toFixed(0) : null
  const warmPct  = bot.warmupBarsNeeded > 0
    ? Math.min(100, Math.round((bot.warmupBarsCurrent / bot.warmupBarsNeeded) * 100))
    : 0

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: selected ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Strategy color accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
           style={{ background: meta.color }}/>

      <div className="pl-4 pr-3 pt-3 pb-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white truncate leading-tight">{bot.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>{bot.symbol}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: '#1e2d3d' }}/>
              <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={bot.status} compact />
            <MiniSparkline curve={bot.equityCurve} />
          </div>
        </div>

        {/* Warmup bar */}
        {bot.status === 'warming_up' && (
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#38bdf8' }}>
              <span>Warming up</span>
              <span>{bot.warmupBarsCurrent}/{bot.warmupBarsNeeded}</span>
            </div>
            <div className="h-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.15)' }}>
              <div className="h-0.5 rounded-full transition-all" style={{ width: `${warmPct}%`, background: '#38bdf8' }}/>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold font-mono" style={{ color: pnlPos ? '#00c878' : '#ef4444' }}>
              {$pnl(bot.pnl)}
            </span>
            <span className="text-xs" style={{ color: '#334155' }}>pnl</span>
          </div>
          <span style={{ color: '#1e2d3d' }}>·</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-white">{bot.trades}</span>
            <span className="text-xs" style={{ color: '#334155' }}>trades</span>
          </div>
          {winRate && (
            <>
              <span style={{ color: '#1e2d3d' }}>·</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold" style={{ color: '#38bdf8' }}>{winRate}%</span>
                <span className="text-xs" style={{ color: '#334155' }}>win</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── News Sentiment Panel ─────────────────────────────────────────────────────

const SENT_COLOR = { bullish: '#00c878', bearish: '#ef4444', neutral: '#f59e0b' }
const SENT_BG    = { bullish: 'rgba(0,200,120,0.07)', bearish: 'rgba(239,68,68,0.07)', neutral: 'rgba(245,158,11,0.07)' }

function NewsSentimentPanel({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<SymbolSentiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)
  const load = useCallback(async () => {
    try { const s = await getNewsSentiment(symbol); setData(s); setErr(null) }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message ?? 'Failed') }
    finally { setLoading(false) }
  }, [symbol])
  useEffect(() => { setLoading(true); setData(null); load(); const id = setInterval(load, 5 * 60_000); return () => clearInterval(id) }, [load])

  const label = data?.label ?? 'neutral'
  const score = data?.score ?? 0
  const barW  = Math.round(Math.abs(score) * 100)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2}>
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#38bdf8' }}>News Sentiment</span>
          {data && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: SENT_BG[label], color: SENT_COLOR[label] }}>
              {label.charAt(0).toUpperCase() + label.slice(1)} {data.score !== 0 ? `(${score >= 0 ? '+' : ''}${score.toFixed(2)})` : ''}
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs px-2 py-0.5 rounded-lg"
                style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.12)' }}>↻</button>
      </div>
      {loading && <p className="text-xs px-4 py-3" style={{ color: '#334155' }}>Loading…</p>}
      {err     && <p className="text-xs px-4 py-3" style={{ color: '#f43f5e' }}>{err}</p>}
      {data && !loading && (
        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs w-8 text-right" style={{ color: '#ef4444' }}>Bear</span>
            <div className="flex-1 h-1.5 rounded-full relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="absolute top-0 h-1.5 rounded-full transition-all"
                   style={{ width: `${barW}%`, left: score >= 0 ? '50%' : `${50 - barW}%`, background: SENT_COLOR[label] }}/>
              <div className="absolute left-1/2 top-0 w-px h-1.5" style={{ background: '#334155' }}/>
            </div>
            <span className="text-xs w-8" style={{ color: '#00c878' }}>Bull</span>
          </div>
          {data.headlines.slice(0, 3).map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 mt-0.5" style={{ color: SENT_COLOR[h.label] }}>●</span>
              <a href={h.url} target="_blank" rel="noopener noreferrer"
                 className="hover:underline line-clamp-1 flex-1" style={{ color: '#64748b' }}>{h.title}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Risk Disclosure Modal ────────────────────────────────────────────────────

function RiskDisclosureModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
           style={{ background: '#111', border: '1px solid rgba(239,68,68,0.2)', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
           onTouchMove={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(239,68,68,0.12)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Risk Disclosure</h2>
            <p className="text-xs" style={{ color: '#ef4444' }}>Read before activating</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { icon: '⚠', color: '#f59e0b', title: 'Automated trading carries real financial risk',    body: 'Bots execute trades autonomously. Market conditions can change instantly.' },
            { icon: '📉', color: '#ef4444', title: 'You may lose all capital allocated to this bot', body: 'Past performance does not guarantee future results.' },
            { icon: '⚖', color: '#a78bfa', title: 'You are solely responsible for all losses',      body: 'TradePilot accepts no liability for trading losses incurred.' },
            { icon: '💹', color: '#00c878', title: 'Real funds are at risk',                         body: 'Bots execute live orders. Only deploy capital you can afford to lose.' },
          ].map(r => (
            <div key={r.title} className="flex gap-3 rounded-xl p-3"
                 style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-base shrink-0">{r.icon}</span>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: r.color }}>{r.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{r.body}</p>
              </div>
            </div>
          ))}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl p-3 transition-all"
                 style={{ background: checked ? 'rgba(0,200,120,0.07)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${checked ? 'rgba(0,200,120,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
            <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                   checked={checked} onChange={e => setChecked(e.target.checked)}/>
            <span className="text-xs leading-relaxed" style={{ color: checked ? '#00c878' : '#64748b' }}>
              I have read and understood the risks. I accept full responsibility for any losses.
            </span>
          </label>
          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
              Cancel
            </button>
            <button onClick={onAccept} disabled={!checked}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: checked ? 'rgba(0,200,120,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${checked ? 'rgba(0,200,120,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      color: checked ? '#00c878' : '#334155',
                      cursor: checked ? 'pointer' : 'not-allowed',
                    }}>
              Accept &amp; Start
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create Bot Modal ─────────────────────────────────────────────────────────

type TabKey = 'strategy' | 'risk'

function CreateBotModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: Bot) => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  const [tab,       setTab]       = useState<TabKey>('strategy')
  const [name,      setName]      = useState('')
  const [symbol,    setSymbol]    = useState('BTCUSD')
  const [strategy,  setStrategy]  = useState<BotStrategy>('ma_crossover')
  const [tradeSize, setTradeSize] = useState(0.01)
  const [fastP,     setFastP]     = useState(9)
  const [slowP,     setSlowP]     = useState(21)
  const [rsiP,      setRsiP]      = useState(14)
  const [rsiOb,     setRsiOb]     = useState(70)
  const [rsiOs,     setRsiOs]     = useState(30)
  const [macdFast,  setMacdFast]  = useState(12)
  const [macdSlow,  setMacdSlow]  = useState(26)
  const [macdSig,   setMacdSig]   = useState(9)
  const [lookback,  setLookback]  = useState(20)
  const [slPct,     setSlPct]     = useState('')
  const [tpPct,     setTpPct]     = useState('')
  const [maxDL,     setMaxDL]     = useState('')
  const [maxDT,     setMaxDT]     = useState('')
  const [confirmB,  setConfirmB]  = useState(1)
  const [useNews,   setUseNews]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState<string | null>(null)

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm text-white font-mono outline-none transition-all"
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'
    e.currentTarget.style.background  = 'rgba(14,165,233,0.04)'
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.background  = 'rgba(255,255,255,0.04)'
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Bot name is required'); return }
    setLoading(true); setErr(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let params: any = { tradeSize }
      if (strategy === 'ma_crossover') params = { ...params, fastPeriod: fastP, slowPeriod: slowP }
      if (strategy === 'rsi')          params = { ...params, rsiPeriod: rsiP, rsiOverbought: rsiOb, rsiOversold: rsiOs }
      if (strategy === 'macd')         params = { ...params, macdFast, macdSlow, macdSignal: macdSig }
      if (strategy === 'momentum')     params = { ...params, lookbackPeriod: lookback }
      if (slPct)       params.stopLossPercent   = parseFloat(slPct)
      if (tpPct)       params.takeProfitPercent = parseFloat(tpPct)
      if (maxDL)       params.maxDailyLoss      = parseFloat(maxDL)
      if (maxDT)       params.maxDailyTrades    = parseInt(maxDT)
      if (confirmB > 1) params.confirmBars      = confirmB
      if (useNews)     params.useNewsFilter      = true
      const bot = await createBot({ name: name.trim(), symbol, strategy, params })
      onCreate(bot); onClose()
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message ?? 'Failed')
    } finally { setLoading(false) }
  }

  const labelCls = "block text-xs font-semibold uppercase tracking-wider mb-1.5"
  const labelStyle = { color: '#475569' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>

      {/* Modal shell — flex-col, does NOT scroll itself */}
      <div className="w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl"
           style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh' }}>

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}/>
        </div>

        {/* ── Fixed header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
             style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={2}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Deploy New Bot</h2>
              <p className="text-xs" style={{ color: '#475569' }}>Configure strategy &amp; risk</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── Fixed tabs ── */}
        <div className="flex border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['strategy', 'risk'] as TabKey[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{
                      color: tab === t ? '#0ea5e9' : '#334155',
                      borderBottom: `2px solid ${tab === t ? '#0ea5e9' : 'transparent'}`,
                    }}>
              {t === 'strategy' ? '⚙ Strategy' : '🛡 Risk Management'}
            </button>
          ))}
        </div>

        {/* ── Form wraps scrollable body + pinned footer ── */}
        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">

          {/* SCROLLABLE body — the only thing that moves */}
          <div className="flex-1 overflow-y-scroll p-5 space-y-5"
               style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}>

            {tab === 'strategy' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={labelStyle}>Bot Name</label>
                    <input className={inputCls} style={inputStyle} placeholder="Alpha Bot"
                           value={name} onChange={e => setName(e.target.value)}
                           onFocus={inputFocus} onBlur={inputBlur}/>
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Market</label>
                    <select className={inputCls} style={{ ...inputStyle, appearance: 'none' }}
                            value={symbol} onChange={e => setSymbol(e.target.value)}
                            onFocus={inputFocus} onBlur={inputBlur}>
                      {SYMBOL_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls} style={labelStyle}>Algorithm</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(STRATEGY_META) as [BotStrategy, typeof STRATEGY_META[BotStrategy]][]).map(([key, m]) => (
                      <button key={key} type="button" onClick={() => setStrategy(key)}
                              className="rounded-xl p-3 text-left transition-all"
                              style={{
                                border: `1px solid ${strategy === key ? m.color + '40' : 'rgba(255,255,255,0.07)'}`,
                                background: strategy === key ? m.color + '12' : 'rgba(255,255,255,0.025)',
                              }}>
                        <div className="flex items-center gap-2 mb-1" style={{ color: strategy === key ? m.color : '#475569' }}>
                          {STRATEGY_ICON[key]}
                          <span className="text-xs font-bold">{m.label}</span>
                        </div>
                        <p className="text-xs leading-snug" style={{ color: '#334155' }}>{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {strategy === 'ma_crossover' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} style={labelStyle}>Fast Period</label>
                      <input className={inputCls} style={inputStyle} type="number" min={2} max={50}
                             value={fastP} onChange={e => setFastP(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Slow Period</label>
                      <input className={inputCls} style={inputStyle} type="number" min={5} max={200}
                             value={slowP} onChange={e => setSlowP(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                    </div>
                  </div>
                )}
                {strategy === 'rsi' && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Period',     val: rsiP,  set: setRsiP,  min: 2,  max: 50 },
                      { label: 'Overbought', val: rsiOb, set: setRsiOb, min: 55, max: 90 },
                      { label: 'Oversold',   val: rsiOs, set: setRsiOs, min: 10, max: 45 },
                    ].map(f => (
                      <div key={f.label}>
                        <label className={labelCls} style={labelStyle}>{f.label}</label>
                        <input className={inputCls} style={inputStyle} type="number" min={f.min} max={f.max}
                               value={f.val} onChange={e => f.set(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                      </div>
                    ))}
                  </div>
                )}
                {strategy === 'macd' && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Fast EMA', val: macdFast, set: setMacdFast, min: 2,  max: 50  },
                      { label: 'Slow EMA', val: macdSlow, set: setMacdSlow, min: 5,  max: 200 },
                      { label: 'Signal',   val: macdSig,  set: setMacdSig,  min: 2,  max: 50  },
                    ].map(f => (
                      <div key={f.label}>
                        <label className={labelCls} style={labelStyle}>{f.label}</label>
                        <input className={inputCls} style={inputStyle} type="number" min={f.min} max={f.max}
                               value={f.val} onChange={e => f.set(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                      </div>
                    ))}
                  </div>
                )}
                {strategy === 'momentum' && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Lookback Bars</label>
                    <input className={inputCls} style={inputStyle} type="number" min={5} max={100}
                           value={lookback} onChange={e => setLookback(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                  </div>
                )}

                <div>
                  <label className={labelCls} style={labelStyle}>Trade Size <span className="normal-case font-normal" style={{ color: '#334155' }}>(units per order)</span></label>
                  <input className={inputCls} style={inputStyle} type="number" min={0.001} step={0.001}
                         value={tradeSize} onChange={e => setTradeSize(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                </div>
              </>
            )}

            {tab === 'risk' && (
              <div className="space-y-4">
                <p className="text-xs rounded-xl px-3 py-2.5" style={{ color: '#475569', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Leave blank to disable a limit. All limits checked on each price tick.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} style={labelStyle}>Stop Loss %</label>
                    <div className="relative">
                      <input className={inputCls} style={{ ...inputStyle, paddingRight: 28 }} type="number" min={0.1} step={0.1} placeholder="2.0"
                             value={slPct} onChange={e => setSlPct(e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#475569' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Take Profit %</label>
                    <div className="relative">
                      <input className={inputCls} style={{ ...inputStyle, paddingRight: 28 }} type="number" min={0.1} step={0.1} placeholder="4.0"
                             value={tpPct} onChange={e => setTpPct(e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#475569' }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Max Daily Loss</label>
                    <div className="relative">
                      <input className={inputCls} style={{ ...inputStyle, paddingLeft: 24 }} type="number" min={0} step={1} placeholder="500"
                             value={maxDL} onChange={e => setMaxDL(e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#475569' }}>$</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Max Daily Trades</label>
                    <input className={inputCls} style={inputStyle} type="number" min={1} step={1} placeholder="10"
                           value={maxDT} onChange={e => setMaxDT(e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Confirm Bars <span className="normal-case font-normal" style={{ color: '#334155' }}>(consecutive signals before entry)</span></label>
                  <input className={inputCls} style={inputStyle} type="number" min={1} max={10}
                         value={confirmB} onChange={e => setConfirmB(+e.target.value)} onFocus={inputFocus} onBlur={inputBlur}/>
                </div>
                <label className="flex items-start gap-3 cursor-pointer rounded-xl p-3.5 transition-all"
                       style={{ background: useNews ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.025)',
                                border: `1px solid ${useNews ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                  <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                         checked={useNews} onChange={e => setUseNews(e.target.checked)}/>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: useNews ? '#38bdf8' : '#64748b' }}>News Sentiment Filter</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#334155' }}>
                      Block buy signals when news sentiment for {symbol} is bearish. Cached 15 min.
                    </p>
                  </div>
                </label>
                {(slPct || tpPct || maxDL || maxDT || confirmB > 1 || useNews) && (
                  <div className="rounded-xl p-3.5 space-y-1.5"
                       style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: '#38bdf8' }}>Active guards</p>
                    {slPct && <p className="text-xs" style={{ color: '#94a3b8' }}>🔴 SL at <b className="text-white">{slPct}%</b> below entry</p>}
                    {tpPct && <p className="text-xs" style={{ color: '#94a3b8' }}>🟡 TP at <b className="text-white">{tpPct}%</b> above entry</p>}
                    {maxDL && <p className="text-xs" style={{ color: '#94a3b8' }}>🛡 Halt after <b className="text-white">${maxDL}</b> daily loss</p>}
                    {maxDT && <p className="text-xs" style={{ color: '#94a3b8' }}>⏱ Cap at <b className="text-white">{maxDT}</b> trades/day</p>}
                    {confirmB > 1 && <p className="text-xs" style={{ color: '#94a3b8' }}>⚡ Require <b className="text-white">{confirmB}</b> consecutive signals</p>}
                    {useNews && <p className="text-xs" style={{ color: '#38bdf8' }}>📰 News sentiment filter ON</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Pinned footer — always visible, never scrolls away ── */}
          <div className="shrink-0 px-5 pt-3 pb-5 border-t space-y-3"
               style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#111' }}>
            {err && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: loading ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.15)',
                        border: '1px solid rgba(14,165,233,0.3)',
                        color: '#38bdf8',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}>
                {loading ? 'Deploying…' : 'Deploy Bot →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BotsPage() {
  const [bots,            setBots]            = useState<Bot[]>([])
  const [selected,        setSelected]        = useState<Bot | null>(null)
  const [showModal,       setShowModal]       = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [actionId,        setActionId]        = useState<string | null>(null)
  const [showRiskModal,   setShowRiskModal]   = useState(false)
  const [pendingStart,    setPendingStart]    = useState<Bot | null>(null)
  const [mobileView,      setMobileView]      = useState<'list' | 'detail'>('list')
  const [showNews,        setShowNews]        = useState(false)
  const [activeLogFilter, setActiveLogFilter] = useState<string>('all')
  const selectedIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await getBots()
      setBots(list)
      if (selectedIdRef.current) {
        const updated = await getBotById(selectedIdRef.current).catch(() => null)
        if (updated) setSelected(updated)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [refresh])

  async function handleStart(bot: Bot) {
    if (!localStorage.getItem('tradepilot_risk_v1')) {
      setPendingStart(bot); setShowRiskModal(true); return
    }
    await _doStart(bot)
  }

  async function _doStart(bot: Bot) {
    setActionId(bot.id)
    try {
      const updated = await startBot(bot.id)
      setBots(b => b.map(x => x.id === bot.id ? updated : x))
      if (selected?.id === bot.id) setSelected(updated)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message)
    } finally { setActionId(null) }
  }

  async function handleStop(bot: Bot) {
    setActionId(bot.id)
    try {
      const updated = await stopBot(bot.id)
      setBots(b => b.map(x => x.id === bot.id ? updated : x))
      if (selected?.id === bot.id) setSelected(updated)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message)
    } finally { setActionId(null) }
  }

  async function handleDelete(bot: Bot) {
    if (!confirm(`Delete "${bot.name}"? This cannot be undone.`)) return
    setActionId(bot.id)
    try {
      await deleteBot(bot.id)
      setBots(b => b.filter(x => x.id !== bot.id))
      if (selected?.id === bot.id) { setSelected(null); selectedIdRef.current = null; setMobileView('list') }
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message)
    } finally { setActionId(null) }
  }

  async function selectBot(bot: Bot) {
    selectedIdRef.current = bot.id
    try { setSelected(await getBotById(bot.id)) } catch { setSelected(bot) }
    setMobileView('detail')
  }

  const activeCount  = bots.filter(b => b.status === 'running' || b.status === 'warming_up').length
  const totalTrades  = bots.reduce((a, b) => a + b.trades, 0)
  const totalPnl     = bots.reduce((a, b) => a + b.pnl, 0)
  const allWins      = bots.reduce((a, b) => a + b.wins, 0)
  const winRate      = totalTrades > 0 ? (allWins / totalTrades * 100).toFixed(1) : null

  const filteredLogs = selected
    ? (activeLogFilter === 'all' ? selected.logs : selected.logs.filter(l => l.level === activeLogFilter))
    : []

  const isStartable = (s: Bot['status']) => ['idle', 'stopped', 'error', 'paused'].includes(s)

  // ── Sidebar (bot list) ─────────────────────────────────────────────────────

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">My Bots</h2>
          <p className="text-xs mt-0.5" style={{ color: '#334155' }}>{bots.length} deployed · {activeCount} active</p>
        </div>
        <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          New
        </button>
      </div>

      {/* Bot list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(14,165,233,0.2)', borderTopColor: '#0ea5e9' }}/>
          </div>
        )}
        {!loading && bots.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-white mb-1">No bots yet</p>
            <p className="text-xs mb-4" style={{ color: '#334155' }}>Deploy your first automated strategy</p>
            <button onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8' }}>
              + Deploy Bot
            </button>
          </div>
        )}
        {bots.map(bot => (
          <BotCard key={bot.id} bot={bot} selected={selected?.id === bot.id} onClick={() => selectBot(bot)}/>
        ))}
      </div>
    </div>
  )

  // ── Detail panel ───────────────────────────────────────────────────────────

  const DetailContent = selected ? (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Detail header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0"
           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="min-w-0 flex-1">
          {/* Mobile back button */}
          <button onClick={() => setMobileView('list')}
                  className="flex items-center gap-1.5 mb-2 text-xs font-semibold md:hidden"
                  style={{ color: '#38bdf8' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            All bots
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-white">{selected.name}</h2>
            <StatusBadge status={selected.status}/>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: '#475569' }}>{selected.symbol}</span>
            <span style={{ color: '#1e2d3d' }}>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: STRATEGY_META[selected.strategy].color }}>
              {STRATEGY_META[selected.strategy].label}
            </span>
            {selected.startedAt && (
              <>
                <span style={{ color: '#1e2d3d' }}>·</span>
                <span className="text-xs" style={{ color: '#334155' }}>Started {fmtDate(selected.startedAt)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isStartable(selected.status) ? (
            <button onClick={() => handleStart(selected)} disabled={!!actionId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.25)', color: '#00c878', cursor: actionId ? 'not-allowed' : 'pointer' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              {actionId === selected.id ? '…' : 'Start'}
            </button>
          ) : (
            <button onClick={() => handleStop(selected)} disabled={!!actionId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', cursor: actionId ? 'not-allowed' : 'pointer' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              {actionId === selected.id ? '…' : 'Stop'}
            </button>
          )}
          <button onClick={() => handleDelete(selected)} disabled={!!actionId}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: actionId ? 'not-allowed' : 'pointer' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Warmup bar */}
      {selected.status === 'warming_up' && (
        <div className="px-5 py-2.5 border-b shrink-0"
             style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(56,189,248,0.04)' }}>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#38bdf8' }}>
            <span>Collecting bars for indicator warmup…</span>
            <span className="font-mono">{selected.warmupBarsCurrent}/{selected.warmupBarsNeeded}</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(56,189,248,0.12)' }}>
            <div className="h-1 rounded-full transition-all duration-300"
                 style={{
                   width: `${Math.min(100, (selected.warmupBarsCurrent / Math.max(1, selected.warmupBarsNeeded)) * 100)}%`,
                   background: 'linear-gradient(to right, #38bdf8, #0ea5e9)',
                 }}/>
          </div>
        </div>
      )}

      {/* Active position strip */}
      {selected.position === 'long' && (
        <div className="px-5 py-2.5 border-b flex items-center gap-4 shrink-0"
             style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,200,120,0.04)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00c878', boxShadow: '0 0 6px #00c878' }}/>
            <span className="text-xs font-bold" style={{ color: '#00c878' }}>LONG</span>
          </div>
          {selected.currentEntryPrice && (
            <span className="text-xs" style={{ color: '#64748b' }}>Entry <span className="text-white font-mono font-semibold">{selected.currentEntryPrice.toFixed(4)}</span></span>
          )}
          {selected.currentSL && (
            <span className="text-xs" style={{ color: '#f43f5e' }}>SL <span className="font-mono font-semibold">{selected.currentSL.toFixed(4)}</span></span>
          )}
          {selected.currentTP && (
            <span className="text-xs" style={{ color: '#fbbf24' }}>TP <span className="font-mono font-semibold">{selected.currentTP.toFixed(4)}</span></span>
          )}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px shrink-0"
           style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Total P&L',    value: $pnl(selected.pnl),  color: selected.pnl >= 0 ? '#00c878' : '#ef4444' },
          { label: 'Win Rate',     value: selected.trades > 0 ? ((selected.wins/selected.trades)*100).toFixed(1)+'%' : '—', color: '#38bdf8' },
          { label: 'Trades',       value: String(selected.trades), color: '#f59e0b' },
          { label: 'Max Drawdown', value: selected.maxDrawdown > 0 ? `$${selected.maxDrawdown.toFixed(2)}` : '—', color: '#ef4444' },
          { label: 'Today Trades', value: String(selected.dailyTrades), color: '#94a3b8' },
          { label: 'Today Loss',   value: selected.dailyLoss > 0 ? `$${selected.dailyLoss.toFixed(2)}` : '—', color: selected.dailyLoss > 0 ? '#f43f5e' : '#334155' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: '#334155' }}>{s.label}</p>
            <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Equity chart section */}
      <div className="px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>Equity Curve</span>
            {selected.equityCurve.length > 0 && (
              <span className="text-xs font-mono font-bold" style={{ color: selected.pnl >= 0 ? '#00c878' : '#ef4444' }}>
                {$pnl(selected.pnl)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs" style={{ color: '#334155' }}>
            {selected.params.stopLossPercent   && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.15)' }}>SL {selected.params.stopLossPercent}%</span>}
            {selected.params.takeProfitPercent && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)' }}>TP {selected.params.takeProfitPercent}%</span>}
            {selected.params.tradeSize && <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>Size {selected.params.tradeSize}</span>}
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <EquityChart curve={selected.equityCurve} height={90}/>
        </div>
      </div>

      {/* News sentiment (collapsible) */}
      <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <button onClick={() => setShowNews(n => !n)}
                className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#334155' }}>
          <span>News Sentiment · {selected.symbol}</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${showNews ? 'rotate-180' : ''}`}
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showNews && (
          <div className="mt-3">
            <NewsSentimentPanel symbol={selected.symbol}/>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 border-b shrink-0"
             style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>Activity Log</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#334155' }}>
              {filteredLogs.length}
            </span>
          </div>
          <div className="flex gap-1">
            {['all', 'trade', 'signal', 'risk', 'error'].map(lvl => (
              <button key={lvl} onClick={() => setActiveLogFilter(lvl)}
                      className="px-2 py-0.5 rounded-lg text-xs font-semibold transition-all capitalize"
                      style={activeLogFilter === lvl
                        ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }
                        : { background: 'transparent', color: '#334155', border: '1px solid transparent' }}>
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: '#1e2d3d' }}>
              <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M8 9h8M8 13h6M20 21H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2z"/>
              </svg>
              <p>No log entries yet</p>
            </div>
          )}
          {[...filteredLogs].reverse().map((log, i) => <LogLine key={i} log={log}/>)}
        </div>
      </div>
    </div>
  ) : (
    /* Empty detail state */
    <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4" style={{ color: '#1e2d3d' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
           style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.1)' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.4}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-sm mb-1">Select a bot</p>
        <p className="text-xs" style={{ color: '#1e2d3d' }}>View equity, logs &amp; controls</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.2),rgba(6,182,212,0.12))', border: '1px solid rgba(14,165,233,0.2)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={2}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">TradePilot</h1>
            <p className="text-xs hidden sm:block" style={{ color: '#334155' }}>MA · RSI · MACD · Momentum · SL/TP · Daily risk controls</p>
          </div>
        </div>

        {/* Portfolio summary pills */}
        <div className="hidden lg:flex items-center gap-2">
          {[
            { label: 'Active', value: activeCount, color: '#00c878' },
            { label: 'Trades', value: totalTrades, color: '#f59e0b' },
            { label: 'P&L',    value: $pnl(totalPnl), color: totalPnl >= 0 ? '#00c878' : '#ef4444' },
            { label: 'Win',    value: winRate ? winRate + '%' : '—', color: '#38bdf8' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs" style={{ color: '#334155' }}>{s.label}</span>
              <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          <span className="hidden sm:inline">Deploy Bot</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* ── Mobile stats strip ── */}
      <div className="flex gap-px border-b lg:hidden shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Active', value: String(activeCount), color: '#00c878' },
          { label: 'Trades', value: String(totalTrades), color: '#f59e0b' },
          { label: 'P&L',    value: $pnl(totalPnl),     color: totalPnl >= 0 ? '#00c878' : '#ef4444' },
          { label: 'Win',    value: winRate ? winRate + '%' : '—', color: '#38bdf8' },
        ].map(s => (
          <div key={s.label} className="flex-1 px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <p className="text-xs" style={{ color: '#334155' }}>{s.label}</p>
            <p className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar — always shown on desktop, shown on mobile only if list view */}
        <div className={`flex-col border-r overflow-hidden ${
          mobileView === 'list' ? 'flex' : 'hidden'
        } md:flex md:w-72 lg:w-80 w-full`}
             style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {SidebarContent}
        </div>

        {/* Detail panel — shown on desktop always, on mobile only if detail view */}
        <div className={`flex-col flex-1 overflow-hidden ${
          mobileView === 'detail' ? 'flex' : 'hidden'
        } md:flex`}>
          {DetailContent}
        </div>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <CreateBotModal onClose={() => setShowModal(false)} onCreate={b => setBots(prev => [b, ...prev])}/>
      )}
      {showRiskModal && pendingStart && (
        <RiskDisclosureModal
          onAccept={() => {
            localStorage.setItem('tradepilot_risk_v1', Date.now().toString())
            setShowRiskModal(false)
            _doStart(pendingStart)
            setPendingStart(null)
          }}
          onClose={() => { setShowRiskModal(false); setPendingStart(null) }}
        />
      )}
    </div>
  )
}
