import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  getBots, getBotById, createBot, startBot, stopBot, deleteBot,
  Bot, BotStrategy, BotLog, BotEquityPoint, SymbolSentiment, getNewsSentiment,
} from '../api/bots'

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:        '#07090f',
  surface:   '#0c1018',
  surface2:  '#111927',
  border:    'rgba(255,255,255,0.07)',
  border2:   'rgba(255,255,255,0.12)',
  text1:     '#e2e8f0',
  text2:     '#64748b',
  text3:     '#334155',
  blue:      '#0ea5e9',
  blueGlow:  'rgba(14,165,233,0.18)',
  green:     '#10b981',
  red:       '#ef4444',
  amber:     '#f59e0b',
  cyan:      '#06b6d4',
  violet:    '#8b5cf6',
}

const STRAT: Record<BotStrategy, { label: string; color: string; glow: string }> = {
  ma_crossover: { label: 'MA Cross',  color: '#0ea5e9', glow: 'rgba(14,165,233,0.15)'  },
  rsi:          { label: 'RSI',       color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)'  },
  macd:         { label: 'MACD',      color: '#06b6d4', glow: 'rgba(6,182,212,0.15)'   },
  momentum:     { label: 'Momentum',  color: '#f59e0b', glow: 'rgba(245,158,11,0.15)'  },
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; pulse: boolean }> = {
  running:    { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Running',    pulse: true  },
  warming_up: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9', label: 'Warming up', pulse: true  },
  paused:     { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Paused',     pulse: false },
  idle:       { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Idle',       pulse: false },
  stopped:    { bg: 'rgba(100,116,139,0.1)', color: '#475569', label: 'Stopped',    pulse: false },
  error:      { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'Error',      pulse: false },
}

const LOG_CFG: Record<string, { color: string; border: string; label: string }> = {
  info:   { color: '#475569', border: '#1e293b', label: 'INFO'   },
  signal: { color: '#f59e0b', border: '#78350f', label: 'SIGNAL' },
  trade:  { color: '#10b981', border: '#064e3b', label: 'TRADE'  },
  risk:   { color: '#f43f5e', border: '#881337', label: 'RISK'   },
  warn:   { color: '#fb923c', border: '#7c2d12', label: 'WARN'   },
  error:  { color: '#ef4444', border: '#7f1d1d', label: 'ERROR'  },
}

const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  { label: 'Crypto', symbols: [
    'BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','LTCUSD','BCHUSD','DSHUSD',
    'DOTUSD','LNKUSD','ADAUSD','AVAXUSD','MATICUSD','DOGEUSD','XLMUSD',
    'XTZUSD','UNIUSD','NEARUSD','ATOMUSD','ALGOUSD','FILUSD',
  ]},
  { label: 'Stocks', symbols: [
    'AAPL','TSLA','NVDA','MSFT','GOOGL','AMZN','META','JPM','NFLX','COIN',
    'AMD','DIS','LMT','RTX','NOC','GD','BA','HII','LDOS','CACI',
    'XOM','CVX','COP',
  ]},
  { label: 'Forex Majors', symbols: [
    'EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD',
  ]},
  { label: 'Forex Minors', symbols: [
    'AUDCAD','AUDCHF','AUDJPY','AUDNZD','CADCHF','CADJPY','CHFJPY',
    'EURAUD','EURCAD','EURCHF','EURGBP','EURJPY','EURNZD',
    'GBPAUD','GBPCAD','GBPCHF','GBPJPY','GBPNZD',
    'NZDCAD','NZDCHF','NZDJPY',
  ]},
  { label: 'Forex Exotics', symbols: [
    'EURHUF','EURNOK','EURPLN','EURSEK','EURZAR','EURMXN','EURTRY',
    'GBPNOK','GBPPLN','GBPSEK','GBPZAR',
    'USDCNH','USDCZK','USDDKK','USDHKD','USDHUF','USDILS','USDMXN',
    'USDNOK','USDPLN','USDSEK','USDSGD','USDTHB','USDZAR','USDTRY',
    'NOKJPY','SGDJPY','AUDMXN','AUDSGD','EURSGD','GBPSGD','NZDSGD','EURCZK',
  ]},
  { label: 'Commodities', symbols: [
    'XAUUSD','XAGUSD','XPTUSD','XPDUSD',
    'XBRUSD','WTI','BRENT','NGAS','GC25',
    'COCOA','COFFEE','CORN','COTTON','OJ','SOYBEAN','SUGAR','WHEAT',
    'COPPER','LUMBER','HO',
  ]},
  { label: 'Indices', symbols: [
    'US500','USTEC','US30','UK100','DE40','F40','JP225','AUS200',
    'STOXX50','CA60','CH20','HK50','ES35','IT40','NL25','NO25',
    'SING','PL40','ZA50','TW50','IN50','KO200','DX','VIX','EUSTX50',
  ]},
  { label: 'Bonds', symbols: [
    'TNOTE','BUND','GILT','JGB','OAT','BTP','AUB','BONO','USBOND',
  ]},
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPnl(n: number) {
  const s = n >= 0 ? '+' : '-'
  return `${s}$${Math.abs(n).toFixed(2)}`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.idle
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: compact ? '2px 8px' : '3px 10px',
      borderRadius: 20, fontSize: compact ? 10 : 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}22`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0,
        boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}` : 'none',
        animation: cfg.pulse ? 'pulse 1.8s ease-in-out infinite' : 'none',
      }} />
      {cfg.label}
    </span>
  )
}

// ─── Equity chart ─────────────────────────────────────────────────────────────

function EquityChart({ curve, height = 100 }: { curve: BotEquityPoint[]; height?: number }) {
  if (!curve || curve.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontSize: 12 }}>
        No equity data yet
      </div>
    )
  }
  const W    = 800
  const pnls = curve.map(p => p.pnl)
  const rawMin = Math.min(...pnls), rawMax = Math.max(...pnls)
  const pad    = (rawMax - rawMin) * 0.12 || 1
  const min    = rawMin - pad, max = rawMax + pad, range = max - min
  const toY    = (v: number) => height - ((v - min) / range) * height
  const zeroY  = Math.max(0, Math.min(height, toY(0)))
  const pts    = curve.map((p, i) => ({ x: (i / (curve.length - 1)) * W, y: toY(p.pnl) }))
  const line   = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fill   =
    `M ${pts[0].x},${zeroY} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[pts.length - 1].x},${zeroY} Z`
  const last  = pnls[pnls.length - 1]
  const color = last >= 0 ? C.green : C.red
  const uid   = Math.random().toString(36).slice(2, 6)
  return (
    <div style={{ position: 'relative', height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {zeroY > 0 && zeroY < height && (
          <line x1="0" y1={zeroY} x2={W} y2={zeroY}
                stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="6 4"/>
        )}
        <path d={fill} fill={`url(#g-${uid})`}/>
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={line}/>
        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="4"
                fill={color} stroke={C.bg} strokeWidth="2.5"/>
      </svg>
    </div>
  )
}

function Sparkline({ curve }: { curve: BotEquityPoint[] }) {
  if (!curve || curve.length < 2) return <div style={{ width: 56, height: 20 }}/>
  const W = 56, H = 20
  const pnls = curve.map(p => p.pnl)
  const min  = Math.min(...pnls), max = Math.max(...pnls)
  const range = max - min || 1
  const pts   = curve.map((p, i) =>
    `${((i / (curve.length - 1)) * W).toFixed(1)},${(H - ((p.pnl - min) / range) * H).toFixed(1)}`
  ).join(' ')
  const color = pnls[pnls.length - 1] >= 0 ? C.green : C.red
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts}/>
    </svg>
  )
}

// ─── Log line ─────────────────────────────────────────────────────────────────

function LogLine({ log }: { log: BotLog }) {
  const cfg = LOG_CFG[log.level] ?? LOG_CFG.info
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '6px 14px 6px 0',
      borderBottom: `1px solid rgba(255,255,255,0.03)`,
      borderLeft: `3px solid ${cfg.border}`,
      paddingLeft: 10,
    }}>
      <span style={{ fontSize: 10, color: C.text3, fontFamily: 'monospace', flexShrink: 0, minWidth: 68, paddingTop: 1 }}>
        {fmtTime(log.ts)}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
        color: cfg.color, flexShrink: 0, minWidth: 46,
        padding: '2px 5px', borderRadius: 4, background: `${cfg.border}44`,
        paddingTop: 2,
      }}>
        {cfg.label}
      </span>
      <span style={{ fontSize: 11, color: cfg.color, fontFamily: 'monospace', lineHeight: 1.5, wordBreak: 'break-all', opacity: 0.9 }}>
        {log.message}
      </span>
    </div>
  )
}

// ─── Bot card ─────────────────────────────────────────────────────────────────

function BotCard({ bot, selected, onClick }: { bot: Bot; selected: boolean; onClick: () => void }) {
  const meta    = STRAT[bot.strategy]
  const pnlPos  = bot.pnl >= 0
  const winRate = bot.trades > 0 ? Math.round((bot.wins / bot.trades) * 100) : null
  const warmPct = bot.warmupBarsNeeded > 0
    ? Math.min(100, Math.round((bot.warmupBarsCurrent / bot.warmupBarsNeeded) * 100))
    : 0
  const alive = bot.status === 'running' || bot.status === 'warming_up'

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 12, cursor: 'pointer',
        background: selected ? `linear-gradient(135deg, ${meta.glow}, ${C.surface})` : C.surface,
        border: `1px solid ${selected ? meta.color + '40' : C.border}`,
        transition: 'all 0.18s',
        boxShadow: selected ? `0 0 20px ${meta.glow}` : 'none',
      }}
    >
      {/* Strategy accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '12px 0 0 12px',
        background: alive
          ? `linear-gradient(to bottom, ${meta.color}, ${meta.color}66)`
          : `${meta.color}44`,
      }}/>

      <div style={{ padding: '12px 12px 10px 14px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bot.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: C.text2 }}>{bot.symbol}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.text3 }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, letterSpacing: '0.04em',
                background: bot.mode === 'real' ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.08)',
                color: bot.mode === 'real' ? C.red : C.blue,
                border: `1px solid ${bot.mode === 'real' ? 'rgba(239,68,68,0.2)' : 'rgba(14,165,233,0.2)'}`,
              }}>
                {bot.mode === 'real' ? 'REAL' : 'DEMO'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <StatusBadge status={bot.status} compact/>
            <Sparkline curve={bot.equityCurve}/>
          </div>
        </div>

        {/* Warmup bar */}
        {bot.status === 'warming_up' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.blue, marginBottom: 3 }}>
              <span>Warming up</span><span>{bot.warmupBarsCurrent}/{bot.warmupBarsNeeded}</span>
            </div>
            <div style={{ height: 2, borderRadius: 2, background: 'rgba(14,165,233,0.12)' }}>
              <div style={{ height: 2, borderRadius: 2, width: `${warmPct}%`, background: C.blue, transition: 'width 0.5s' }}/>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: pnlPos ? C.green : C.red }}>
              {fmtPnl(bot.pnl)}
            </span>
          </div>
          <div style={{ width: 1, height: 12, background: C.text3 }}/>
          <span style={{ fontSize: 11, color: C.text2 }}>
            <span style={{ color: C.text1, fontWeight: 700 }}>{bot.trades}</span> trades
          </span>
          {winRate !== null && (
            <>
              <div style={{ width: 1, height: 12, background: C.text3 }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: winRate >= 50 ? C.green : C.red }}>
                {winRate}% win
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: C.bg, padding: '10px 14px' }}>
      <p style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px', fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: C.text3, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ─── News sentiment ───────────────────────────────────────────────────────────

const SENT_COLOR = { bullish: C.green, bearish: C.red, neutral: C.amber }

function NewsSentimentPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<SymbolSentiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setData(await getNewsSentiment(symbol)); setErr(null) }
    catch (e: unknown) { setErr((e as { message?: string }).message ?? 'Failed') }
    finally { setLoading(false) }
  }, [symbol])
  useEffect(() => { setLoading(true); setData(null); load(); const id = setInterval(load, 300_000); return () => clearInterval(id) }, [load])

  const label = data?.label ?? 'neutral'
  const score = data?.score ?? 0

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.blue }}>News Sentiment</span>
          {data && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: `${SENT_COLOR[label]}15`, color: SENT_COLOR[label], border: `1px solid ${SENT_COLOR[label]}30` }}>
              {label.charAt(0).toUpperCase() + label.slice(1)} {score !== 0 ? `(${score >= 0 ? '+' : ''}${score.toFixed(2)})` : ''}
            </span>
          )}
        </div>
        <button onClick={load} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, color: C.blue, background: `${C.blue}10`, border: `1px solid ${C.blue}20`, cursor: 'pointer' }}>↻</button>
      </div>
      <div style={{ padding: '10px 12px' }}>
        {loading && <p style={{ fontSize: 11, color: C.text3, margin: 0 }}>Loading…</p>}
        {err     && <p style={{ fontSize: 11, color: C.red,   margin: 0 }}>{err}</p>}
        {data && !loading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: C.red }}>Bear</span>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.surface2, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', height: '100%', borderRadius: 2,
                  background: SENT_COLOR[label],
                  width: `${Math.abs(score) * 100}%`,
                  left: score >= 0 ? '50%' : `${50 - Math.abs(score) * 100}%`,
                  transition: 'all 0.5s',
                }}/>
                <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: C.text3 }}/>
              </div>
              <span style={{ fontSize: 10, color: C.green }}>Bull</span>
            </div>
            {data.headlines.slice(0, 3).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                <span style={{ color: SENT_COLOR[h.label], fontSize: 9, flexShrink: 0, paddingTop: 2 }}>●</span>
                <a href={h.url} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: 10, color: C.text2, textDecoration: 'none', lineHeight: 1.4 }}>
                  {h.title}
                </a>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Risk Disclosure Modal ────────────────────────────────────────────────────

function RiskDisclosureModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const [checked, setChecked] = useState(false)
  const risks = [
    { icon: '⚠', color: C.amber, title: 'Automated trading carries significant financial risk', body: 'Bots execute trades autonomously. Market conditions change instantly and unpredictably.' },
    { icon: '📉', color: C.red,   title: 'You may lose all capital allocated to this bot',    body: 'Past performance does not guarantee future results. Losses can exceed expectations.' },
    { icon: '⚖',  color: C.violet, title: 'You are solely responsible for all losses',        body: 'TradePilot accepts no liability for any trading losses incurred by automated bots.' },
    { icon: '💹', color: C.green, title: 'Real funds are at risk on live accounts',           body: 'Only deploy capital you can afford to lose. Use demo mode to validate strategies first.' },
  ]
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}>
      <div style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', borderRadius: 20, background: C.surface, border: `1px solid rgba(239,68,68,0.25)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={C.red} strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text1, margin: 0 }}>Risk Disclosure</h2>
            <p style={{ fontSize: 11, color: C.red, margin: 0 }}>Read carefully before activating</p>
          </div>
        </div>
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {risks.map(r => (
              <div key={r.title} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: r.color, margin: '0 0 2px' }}>{r.title}</p>
                  <p style={{ fontSize: 10, color: C.text2, margin: 0, lineHeight: 1.5 }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: checked ? 'rgba(16,185,129,0.07)' : C.bg, border: `1px solid ${checked ? 'rgba(16,185,129,0.25)' : C.border}`, marginBottom: 14, transition: 'all 0.15s' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }}/>
            <span style={{ fontSize: 11, color: checked ? C.green : C.text2, lineHeight: 1.5 }}>
              I have read and fully understood the risks. I accept sole responsibility for any losses.
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={onAccept} disabled={!checked} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: checked ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
              background: checked ? 'rgba(16,185,129,0.15)' : C.surface2,
              border: `1px solid ${checked ? 'rgba(16,185,129,0.35)' : C.border}`,
              color: checked ? C.green : C.text3,
            }}>Accept &amp; Start</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Create Bot Modal ─────────────────────────────────────────────────────────

type TabKey = 'strategy' | 'risk'

const STRAT_ICONS: Record<BotStrategy, React.ReactNode> = {
  ma_crossover: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="17 7 21 7 21 11"/></svg>,
  rsi:          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M2 12 Q6 4 10 12 Q14 20 18 12 Q20 8 22 12"/></svg>,
  macd:         <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="12" width="3" height="8" rx="1"/><rect x="9" y="8" width="3" height="12" rx="1"/><rect x="15" y="4" width="3" height="16" rx="1"/></svg>,
  momentum:     <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 19 L12 5 L19 19"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
}

const STRAT_DESC: Record<BotStrategy, string> = {
  ma_crossover: 'Golden/death cross of fast & slow SMAs with RSI + trend filter',
  rsi:          'Oversold/overbought entries confirmed by MACD histogram direction',
  macd:         'Signal-line crossover filtered by 50 SMA trend bias + RSI guard',
  momentum:     'ATR-gated breakout above/below N-period lookback range',
}

function CreateBotModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: Bot) => void }) {
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

  const inSty: React.CSSProperties = {
    width: '100%', background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 10,
    color: C.text1, fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'monospace',
    boxSizing: 'border-box',
  }
  const labelSty: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }

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
      const accountMode = (localStorage.getItem('account_mode') ?? 'demo') as 'demo' | 'real'
      const bot = await createBot({ name: name.trim(), symbol, strategy, params, mode: accountMode })
      onCreate(bot); onClose()
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (e as { message?: string }).message ?? 'Failed')
    } finally { setLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', background: C.surface, border: `1px solid ${C.border}`, height: '92dvh', maxHeight: '92dvh' }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2 }}/>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.blue}15`, border: `1px solid ${C.blue}30` }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text1, margin: 0 }}>Deploy New Bot</h2>
              <p style={{ fontSize: 10, color: C.text2, margin: 0 }}>Configure strategy &amp; risk controls</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={C.text2} strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {(['strategy', 'risk'] as TabKey[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: tab === t ? C.blue : C.text3,
              borderBottom: `2px solid ${tab === t ? C.blue : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              {t === 'strategy' ? '⚙ Strategy' : '🛡 Risk'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {tab === 'strategy' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelSty}>Bot Name</label>
                    <input style={inSty} value={name} onChange={e => setName(e.target.value)} placeholder="Alpha Bot"/>
                  </div>
                  <div>
                    <label style={labelSty}>Market</label>
                    <select style={{ ...inSty, appearance: 'none' }} value={symbol} onChange={e => setSymbol(e.target.value)}>
                      {SYMBOL_GROUPS.map(g => (
                        <optgroup key={g.label} label={g.label} style={{ background: C.bg, color: C.text2 }}>
                          {g.symbols.map(s => <option key={s} value={s} style={{ background: C.surface }}>{s}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelSty}>Algorithm</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(Object.entries(STRAT) as [BotStrategy, typeof STRAT[BotStrategy]][]).map(([key, m]) => (
                      <button key={key} type="button" onClick={() => setStrategy(key)} style={{
                        padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                        background: strategy === key ? `${m.color}12` : C.bg,
                        border: `1px solid ${strategy === key ? m.color + '45' : C.border}`,
                        boxShadow: strategy === key ? `0 0 12px ${m.glow}` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: strategy === key ? m.color : C.text2 }}>
                          {STRAT_ICONS[key]}
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <p style={{ fontSize: 10, color: C.text2, margin: 0, lineHeight: 1.4 }}>{STRAT_DESC[key]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {strategy === 'ma_crossover' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={labelSty}>Fast Period</label><input style={inSty} type="number" min={2} max={50} value={fastP} onChange={e => setFastP(+e.target.value)}/></div>
                    <div><label style={labelSty}>Slow Period</label><input style={inSty} type="number" min={5} max={200} value={slowP} onChange={e => setSlowP(+e.target.value)}/></div>
                  </div>
                )}
                {strategy === 'rsi' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><label style={labelSty}>Period</label><input style={inSty} type="number" min={2} max={50} value={rsiP} onChange={e => setRsiP(+e.target.value)}/></div>
                    <div><label style={labelSty}>Overbought</label><input style={inSty} type="number" min={55} max={90} value={rsiOb} onChange={e => setRsiOb(+e.target.value)}/></div>
                    <div><label style={labelSty}>Oversold</label><input style={inSty} type="number" min={10} max={45} value={rsiOs} onChange={e => setRsiOs(+e.target.value)}/></div>
                  </div>
                )}
                {strategy === 'macd' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><label style={labelSty}>Fast EMA</label><input style={inSty} type="number" min={2} max={50} value={macdFast} onChange={e => setMacdFast(+e.target.value)}/></div>
                    <div><label style={labelSty}>Slow EMA</label><input style={inSty} type="number" min={5} max={200} value={macdSlow} onChange={e => setMacdSlow(+e.target.value)}/></div>
                    <div><label style={labelSty}>Signal</label><input style={inSty} type="number" min={2} max={50} value={macdSig} onChange={e => setMacdSig(+e.target.value)}/></div>
                  </div>
                )}
                {strategy === 'momentum' && (
                  <div><label style={labelSty}>Lookback Bars</label><input style={inSty} type="number" min={5} max={100} value={lookback} onChange={e => setLookback(+e.target.value)}/></div>
                )}

                <div>
                  <label style={labelSty}>Trade Size <span style={{ textTransform: 'none', color: C.text3, fontWeight: 400 }}>(units per order)</span></label>
                  <input style={inSty} type="number" min={0.001} step={0.001} value={tradeSize} onChange={e => setTradeSize(+e.target.value)}/>
                </div>
              </>
            )}

            {tab === 'risk' && (
              <>
                <p style={{ fontSize: 11, color: C.text2, padding: '8px 10px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, margin: 0 }}>
                  Leave blank to disable a limit. All guards are checked on every price tick.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelSty}>Stop Loss %</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inSty, paddingRight: 28 }} type="number" min={0.1} step={0.1} placeholder="2.0" value={slPct} onChange={e => setSlPct(e.target.value)}/>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.text2 }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelSty}>Take Profit %</label>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inSty, paddingRight: 28 }} type="number" min={0.1} step={0.1} placeholder="4.0" value={tpPct} onChange={e => setTpPct(e.target.value)}/>
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.text2 }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelSty}>Max Daily Loss ($)</label>
                    <input style={inSty} type="number" min={0} step={1} placeholder="500" value={maxDL} onChange={e => setMaxDL(e.target.value)}/>
                  </div>
                  <div>
                    <label style={labelSty}>Max Daily Trades</label>
                    <input style={inSty} type="number" min={1} step={1} placeholder="10" value={maxDT} onChange={e => setMaxDT(e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={labelSty}>Confirm Bars <span style={{ textTransform: 'none', color: C.text3, fontWeight: 400 }}>(consecutive signals required)</span></label>
                  <input style={inSty} type="number" min={1} max={10} value={confirmB} onChange={e => setConfirmB(+e.target.value)}/>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: useNews ? `${C.blue}08` : C.bg, border: `1px solid ${useNews ? C.blue + '30' : C.border}`, transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={useNews} onChange={e => setUseNews(e.target.checked)} style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }}/>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: useNews ? C.blue : C.text2, margin: '0 0 2px' }}>News Sentiment Filter</p>
                    <p style={{ fontSize: 10, color: C.text3, margin: 0, lineHeight: 1.4 }}>Block buy signals when {symbol} news sentiment is bearish. Refreshed every 15 min.</p>
                  </div>
                </label>
                {(slPct || tpPct || maxDL || maxDT || confirmB > 1 || useNews) && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: `${C.blue}08`, border: `1px solid ${C.blue}18` }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: C.blue, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active guards</p>
                    {slPct && <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>🔴 SL at <b style={{ color: C.text1 }}>{slPct}%</b> below entry (ATR-adjusted)</p>}
                    {tpPct && <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>🟡 TP at <b style={{ color: C.text1 }}>{tpPct}%</b> above entry (ATR-adjusted)</p>}
                    {maxDL && <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>🛡 Halt after <b style={{ color: C.text1 }}>${maxDL}</b> daily loss</p>}
                    {maxDT && <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>⏱ Cap at <b style={{ color: C.text1 }}>{maxDT}</b> trades/day</p>}
                    {confirmB > 1 && <p style={{ fontSize: 11, color: C.text2, margin: '0 0 3px' }}>⚡ Require <b style={{ color: C.text1 }}>{confirmB}</b> consecutive signals</p>}
                    {useNews && <p style={{ fontSize: 11, color: C.blue, margin: 0 }}>📰 News sentiment filter active</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ flexShrink: 0, padding: '12px 18px 20px', borderTop: `1px solid ${C.border}`, background: C.surface }}>
            {err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 10 }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={C.red} strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={{ fontSize: 11, color: '#fca5a5', margin: 0 }}>{err}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={loading} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                background: loading ? C.surface2 : `${C.blue}18`,
                border: `1px solid ${C.blue}40`, color: C.blue,
              }}>
                {loading ? 'Deploying…' : 'Deploy Bot →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BotsPage() {
  const [bots,          setBots]          = useState<Bot[]>([])
  const [selected,      setSelected]      = useState<Bot | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [actionId,      setActionId]      = useState<string | null>(null)
  const [showRisk,      setShowRisk]      = useState(false)
  const [pendingStart,  setPendingStart]  = useState<Bot | null>(null)
  const [mobileView,    setMobileView]    = useState<'list' | 'detail'>('list')
  const [showNews,      setShowNews]      = useState(false)
  const [logFilter,     setLogFilter]     = useState<string>('all')
  const selectedIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await getBots()
      setBots(list)
      if (selectedIdRef.current) {
        const updated = await getBotById(selectedIdRef.current).catch(() => null)
        if (updated) setSelected(updated)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh(); const id = setInterval(refresh, 3000); return () => clearInterval(id) }, [refresh])

  async function handleStart(bot: Bot) {
    if (!localStorage.getItem('tradepilot_risk_v1')) {
      setPendingStart(bot); setShowRisk(true); return
    }
    await doStart(bot)
  }
  async function doStart(bot: Bot) {
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

  const activeCount = bots.filter(b => b.status === 'running' || b.status === 'warming_up').length
  const totalTrades = bots.reduce((a, b) => a + b.trades, 0)
  const totalPnl    = bots.reduce((a, b) => a + b.pnl, 0)
  const allWins     = bots.reduce((a, b) => a + b.wins, 0)
  const winRate     = totalTrades > 0 ? (allWins / totalTrades * 100).toFixed(1) : null
  const canStart    = selected && ['idle', 'stopped', 'error', 'paused'].includes(selected.status)
  const filteredLogs = selected
    ? (logFilter === 'all' ? selected.logs : selected.logs.filter(l => l.level === logFilter))
    : []

  // ── Sidebar ─────────────────────────────────────────────────────────────────

  const Sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.surface }}>

      {/* Sidebar header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: C.text1, margin: 0 }}>My Bots</p>
          <p style={{ fontSize: 10, color: C.text3, margin: '2px 0 0' }}>{bots.length} deployed · {activeCount} active</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: `${C.blue}12`, border: `1px solid ${C.blue}30`, color: C.blue,
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          New
        </button>
      </div>

      {/* Bot list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.blue}30`, borderTopColor: C.blue, animation: 'spin 0.7s linear infinite' }}/>
          </div>
        )}
        {!loading && bots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', background: `${C.blue}08`, border: `1px solid ${C.blue}18` }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth={1.5}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: '0 0 4px' }}>No bots deployed</p>
            <p style={{ fontSize: 11, color: C.text3, margin: '0 0 14px' }}>Deploy your first automated strategy</p>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 18px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: `${C.blue}12`, border: `1px solid ${C.blue}30`, color: C.blue }}>
              + Deploy Bot
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bots.map(bot => (
            <BotCard key={bot.id} bot={bot} selected={selected?.id === bot.id} onClick={() => selectBot(bot)}/>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Detail panel ─────────────────────────────────────────────────────────────

  const Detail = selected ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: C.bg }}>

      {/* Header */}
      <div style={{
        padding: '14px 18px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        background: `linear-gradient(135deg, ${STRAT[selected.strategy].glow}, transparent)`,
      }}>
        {/* Mobile back */}
        <button onClick={() => setMobileView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, fontSize: 11, fontWeight: 700, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="md:hidden">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          All bots
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text1, margin: 0 }}>{selected.name}</h2>
              <StatusBadge status={selected.status}/>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.06em',
                background: selected.mode === 'real' ? 'rgba(239,68,68,0.12)' : `${C.blue}10`,
                color: selected.mode === 'real' ? C.red : C.blue,
                border: `1px solid ${selected.mode === 'real' ? 'rgba(239,68,68,0.2)' : C.blue + '25'}`,
              }}>
                {selected.mode === 'real' ? '🔴 REAL' : '🔵 DEMO'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: C.text2 }}>{selected.symbol}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.text3 }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: STRAT[selected.strategy].color }}>{STRAT[selected.strategy].label}</span>
              {selected.startedAt && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.text3 }}/>
                  <span style={{ fontSize: 10, color: C.text3 }}>Started {fmtDate(selected.startedAt)}</span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {canStart ? (
              <button onClick={() => handleStart(selected)} disabled={!!actionId} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: actionId ? 'not-allowed' : 'pointer',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)', color: C.green,
              }}>
                <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                {actionId === selected.id ? '…' : 'Start'}
              </button>
            ) : (
              <button onClick={() => handleStop(selected)} disabled={!!actionId} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: actionId ? 'not-allowed' : 'pointer',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)', color: C.amber,
              }}>
                <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                {actionId === selected.id ? '…' : 'Stop'}
              </button>
            )}
            <button onClick={() => handleDelete(selected)} disabled={!!actionId} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: actionId ? 'not-allowed' : 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: C.red,
            }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warmup bar */}
      {selected.status === 'warming_up' && (
        <div style={{ padding: '8px 18px', borderBottom: `1px solid ${C.border}`, background: `${C.blue}06`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.blue, marginBottom: 4 }}>
            <span>Collecting price bars for indicator warmup…</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selected.warmupBarsCurrent}/{selected.warmupBarsNeeded}</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: `${C.blue}15` }}>
            <div style={{
              height: 3, borderRadius: 2, transition: 'width 0.4s',
              width: `${Math.min(100, (selected.warmupBarsCurrent / Math.max(1, selected.warmupBarsNeeded)) * 100)}%`,
              background: `linear-gradient(to right, ${C.blue}, ${C.cyan})`,
            }}/>
          </div>
        </div>
      )}

      {/* Active position strip */}
      {selected.position !== 'none' && (
        <div style={{ padding: '8px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, background: selected.position === 'long' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected.position === 'long' ? C.green : C.red, boxShadow: `0 0 8px ${selected.position === 'long' ? C.green : C.red}`, animation: 'pulse 1.8s ease-in-out infinite' }}/>
            <span style={{ fontSize: 11, fontWeight: 800, color: selected.position === 'long' ? C.green : C.red }}>
              {selected.position === 'long' ? '▲ LONG' : '▼ SHORT'}
            </span>
          </div>
          {selected.currentEntryPrice && (
            <span style={{ fontSize: 11, color: C.text2 }}>Entry <span style={{ color: C.text1, fontFamily: 'monospace', fontWeight: 700 }}>{selected.currentEntryPrice.toFixed(4)}</span></span>
          )}
          {selected.currentSL && (
            <span style={{ fontSize: 11, color: C.red }}>SL <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selected.currentSL.toFixed(4)}</span></span>
          )}
          {selected.currentTP && (
            <span style={{ fontSize: 11, color: C.amber }}>TP <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selected.currentTP.toFixed(4)}</span></span>
          )}
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) repeat(3, 1fr)', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <MetricCard label="Total P&L"    value={fmtPnl(selected.pnl)} color={selected.pnl >= 0 ? C.green : C.red}/>
        <MetricCard label="Win Rate"     value={selected.trades > 0 ? `${((selected.wins/selected.trades)*100).toFixed(1)}%` : '—'} color={C.blue}/>
        <MetricCard label="Trades"       value={String(selected.trades)} color={C.amber} sub={`${selected.wins}W · ${selected.losses}L`}/>
        <MetricCard label="Max Drawdown" value={selected.maxDrawdown > 0 ? `$${selected.maxDrawdown.toFixed(2)}` : '—'} color={C.red}/>
        <MetricCard label="Today"        value={String(selected.dailyTrades)} color={C.text2} sub="trades"/>
        <MetricCard label="Daily Loss"   value={selected.dailyLoss > 0 ? `$${selected.dailyLoss.toFixed(2)}` : '—'} color={selected.dailyLoss > 0 ? C.red : C.text3}/>
      </div>

      {/* Equity chart */}
      <div style={{ padding: '12px 18px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Equity Curve</span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: selected.pnl >= 0 ? C.green : C.red }}>{fmtPnl(selected.pnl)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {selected.params.stopLossPercent && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.18)' }}>SL {selected.params.stopLossPercent}% (ATR-adj)</span>}
            {selected.params.takeProfitPercent && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', color: C.amber, border: '1px solid rgba(245,158,11,0.18)' }}>TP {selected.params.takeProfitPercent}% (ATR-adj)</span>}
            {selected.params.tradeSize && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: C.surface2, color: C.text2, border: `1px solid ${C.border}` }}>Size {selected.params.tradeSize}</span>}
          </div>
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
          <EquityChart curve={selected.equityCurve} height={100}/>
        </div>
      </div>

      {/* News sentiment */}
      <div style={{ padding: '8px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setShowNews(n => !n)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text2, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <span>News Sentiment · {selected.symbol}</span>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ transform: showNews ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showNews && <div style={{ marginTop: 10 }}><NewsSentimentPanel symbol={selected.symbol}/></div>}
      </div>

      {/* Activity log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Activity Log</span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 4, background: C.surface, color: C.text3, border: `1px solid ${C.border}` }}>
              {filteredLogs.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'trade', 'signal', 'risk', 'error'].map(lvl => (
              <button key={lvl} onClick={() => setLogFilter(lvl)} style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.12s',
                background: logFilter === lvl ? `${C.blue}15` : 'transparent',
                color: logFilter === lvl ? C.blue : C.text3,
                border: `1px solid ${logFilter === lvl ? C.blue + '35' : 'transparent'}`,
              }}>{lvl}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLogs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: C.text3 }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><path d="M8 9h8M8 13h6M20 21H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2z"/></svg>
              <p style={{ fontSize: 11, margin: 0 }}>No log entries yet</p>
            </div>
          )}
          {[...filteredLogs].reverse().map((log, i) => <LogLine key={i} log={log}/>)}
        </div>
      </div>
    </div>
  ) : (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.text3 }} className="hidden md:flex">
      <div style={{ width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.blue}06`, border: `1px solid ${C.blue}12` }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth={1.4} style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text2, margin: 0 }}>Select a bot to inspect</p>
      <p style={{ fontSize: 11, margin: 0 }}>Equity, logs &amp; controls</p>
    </div>
  )

  // ── Portfolio summary ─────────────────────────────────────────────────────────

  const summaryItems = [
    { label: 'Active',  value: String(activeCount),          color: C.green },
    { label: 'Trades',  value: String(totalTrades),          color: C.amber },
    { label: 'Net P&L', value: fmtPnl(totalPnl),            color: totalPnl >= 0 ? C.green : C.red },
    { label: 'Win',     value: winRate ? winRate + '%' : '—', color: C.blue  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: C.bg }}>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .md\\:hidden { display:none } @media(max-width:767px){.md\\:hidden{display:flex}}
        .md\\:flex   { display:none } @media(min-width:768px){.md\\:flex{display:flex}}
        .hidden.md\\:flex { display:none } @media(min-width:768px){.hidden.md\\:flex{display:flex}}
        .hidden.sm\\:inline { display:none } @media(min-width:640px){.hidden.sm\\:inline{display:inline}}
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.blue}25, ${C.cyan}15)`,
            border: `1px solid ${C.blue}30`,
            boxShadow: `0 0 20px ${C.blueGlow}`,
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: 0, lineHeight: 1.2 }}>TradePilot</h1>
            <p style={{ fontSize: 10, color: C.text3, margin: 0 }}>MA · RSI · MACD · Momentum · ATR SL/TP · Long &amp; Short</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Summary pills — desktop */}
          <div style={{ display: 'flex', gap: 6 }}>
            {summaryItems.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: C.surface2, border: `1px solid ${C.border}` }}
                   className="hidden md:flex">
                <span style={{ fontSize: 10, color: C.text3 }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: `${C.blue}12`, border: `1px solid ${C.blue}35`, color: C.blue,
          }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            Deploy Bot
          </button>
        </div>
      </div>

      {/* Mobile stats strip */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }} className="md:hidden">
        {summaryItems.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: i < summaryItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <p style={{ fontSize: 9, color: C.text3, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ display: mobileView === 'list' ? 'flex' : 'none', flexDirection: 'column', width: '100%', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}
             className="md:flex md:w-72">
          {Sidebar}
        </div>

        {/* Detail */}
        <div style={{ display: mobileView === 'detail' ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
             className="md:flex">
          {Detail}
        </div>
      </div>

      {/* Modals */}
      {showModal && <CreateBotModal onClose={() => setShowModal(false)} onCreate={b => setBots(p => [b, ...p])}/>}
      {showRisk && pendingStart && (
        <RiskDisclosureModal
          onAccept={() => { localStorage.setItem('tradepilot_risk_v1', Date.now().toString()); setShowRisk(false); doStart(pendingStart); setPendingStart(null) }}
          onClose={() => { setShowRisk(false); setPendingStart(null) }}
        />
      )}
    </div>
  )
}
