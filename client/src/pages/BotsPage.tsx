import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  getBots, getBotById, createBot, startBot, stopBot, deleteBot,
  Bot, BotStrategy, BotLog, BotEquityPoint, SymbolSentiment, getNewsSentiment,
} from '../api/bots'

// ---------------------------------------------------------------------------
// Risk Disclosure Modal
// ---------------------------------------------------------------------------
function RiskDisclosureModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const [checked, setChecked] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
      <div className="rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
           style={{ background: '#0a1623', border: '1px solid rgba(239,68,68,0.25)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Risk Disclosure &amp; Terms of Service</h2>
            <p className="text-xs" style={{ color: '#ef4444' }}>Please read carefully before activating your bot</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Risk points */}
          {[
            {
              title: 'Automated trading involves real financial risk',
              body:  'TradePilot bots execute trades autonomously based on mathematical signals. Market conditions can change instantly, and the bot may not react appropriately to all scenarios.',
              icon:  '⚠',
              color: '#f59e0b',
            },
            {
              title: 'You may lose all capital allocated to this bot',
              body:  'Past performance of a strategy does not guarantee future results. Leverage, volatility, and gaps between candles can cause losses exceeding your configured stop-loss.',
              icon:  '📉',
              color: '#ef4444',
            },
            {
              title: 'You are solely responsible for all trading decisions',
              body:  'By starting a bot you delegate execution authority to TradePilot. TradePilot, its developers, and data providers accept no liability for losses incurred.',
              icon:  '⚖',
              color: '#a78bfa',
            },
            {
              title: 'News sentiment analysis is informational only',
              body:  'The optional news filter uses public RSS feeds and keyword heuristics. It does not constitute financial advice and may contain inaccurate or delayed information.',
              icon:  '📰',
              color: '#38bdf8',
            },
            {
              title: 'Paper trading environment — mirrors real risk',
              body:  'Simulated results may differ from live trading due to slippage, liquidity constraints, and execution delays that paper trading does not replicate.',
              icon:  '🧪',
              color: '#00c878',
            },
          ].map(r => (
            <div key={r.title} className="flex gap-3 rounded-xl p-3.5"
                 style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-lg shrink-0 mt-0.5">{r.icon}</span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: r.color }}>{r.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{r.body}</p>
              </div>
            </div>
          ))}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mt-2"
                 style={{ padding: '14px 16px', background: checked ? 'rgba(0,200,120,0.07)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${checked ? 'rgba(0,200,120,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12 }}>
            <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0" checked={checked} onChange={e => setChecked(e.target.checked)} />
            <span className="text-sm leading-relaxed" style={{ color: checked ? '#00c878' : '#94a3b8' }}>
              I have read and understood the risks above. I accept full responsibility for any losses
              incurred by this automated bot and confirm I am not relying on TradePilot as financial advice.
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
              Cancel
            </button>
            <button type="button" disabled={!checked} onClick={() => { onAccept() }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background:  checked ? '#00c87820' : 'rgba(255,255,255,0.03)',
                      border:      `1px solid ${checked ? '#00c87840' : 'rgba(255,255,255,0.06)'}`,
                      color:       checked ? '#00c878'  : '#3b5070',
                      cursor:      checked ? 'pointer'  : 'not-allowed',
                    }}>
              Accept &amp; Start Bot
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// News Sentiment Panel
// ---------------------------------------------------------------------------
const SENTIMENT_COLOR = { bullish: '#00c878', bearish: '#ef4444', neutral: '#f59e0b' }
const SENTIMENT_BG    = { bullish: 'rgba(0,200,120,0.07)',  bearish: 'rgba(239,68,68,0.07)',  neutral: 'rgba(245,158,11,0.07)' }
const SENTIMENT_ICON  = { bullish: '📈', bearish: '📉', neutral: '➡' }

function NewsSentimentPanel({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<SymbolSentiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const s = await getNewsSentiment(symbol)
      setData(s); setErr(null)
    } catch (e: any) {
      setErr(e.response?.data?.error ?? e.message ?? 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    setLoading(true); setData(null)
    load()
    const id = setInterval(load, 5 * 60_000)  // refresh every 5 min
    return () => clearInterval(id)
  }, [load])

  const score = data?.score ?? 0
  const barW  = Math.round(Math.abs(score) * 100)
  const label = data?.label ?? 'neutral'

  return (
    <div className="px-6 py-3 border-b"
         style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.008)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b6280' }}>📰 News Sentiment</span>
          {data && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: SENTIMENT_BG[label], color: SENTIMENT_COLOR[label], border: `1px solid ${SENTIMENT_COLOR[label]}30` }}>
              {SENTIMENT_ICON[label]} {label.charAt(0).toUpperCase() + label.slice(1)}
              {data.score !== 0 && ` (${data.score >= 0 ? '+' : ''}${data.score.toFixed(2)})`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && <span className="text-xs" style={{ color: '#2d4460' }}>via {data.source}</span>}
          <button onClick={load} title="Refresh news"
                  className="text-xs px-2 py-0.5 rounded-lg transition-colors"
                  style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)' }}>
            ↻
          </button>
        </div>
      </div>

      {loading && <p className="text-xs" style={{ color: '#2d4460' }}>Loading news…</p>}
      {err    && <p className="text-xs" style={{ color: '#f43f5e' }}>{err}</p>}

      {data && !loading && (
        <>
          {/* Score bar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs w-12 shrink-0 text-right" style={{ color: '#ef4444' }}>Bear</span>
            <div className="flex-1 h-2 rounded-full relative" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="absolute top-0 h-2 rounded-full transition-all"
                   style={{
                     width:  `${barW}%`,
                     left:   score >= 0 ? '50%' : `${50 - barW}%`,
                     background: SENTIMENT_COLOR[label],
                     boxShadow: `0 0 6px ${SENTIMENT_COLOR[label]}`,
                   }} />
              <div className="absolute left-1/2 top-0 w-px h-2" style={{ background: '#3b5070' }} />
            </div>
            <span className="text-xs w-12 shrink-0" style={{ color: '#00c878' }}>Bull</span>
          </div>

          {/* Headlines */}
          {data.headlines.slice(0, 4).map((h, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b"
                 style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs shrink-0 mt-0.5" style={{ color: SENTIMENT_COLOR[h.label] }}>{SENTIMENT_ICON[h.label]}</span>
              <a href={h.url} target="_blank" rel="noopener noreferrer"
                 className="text-xs hover:underline leading-snug flex-1 line-clamp-2"
                 style={{ color: '#94a3b8' }}>
                {h.title}
              </a>
              <span className="text-xs shrink-0" style={{ color: '#2d4460' }}>
                {new Date(h.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          ))}
          {data.headlines.length === 0 && (
            <p className="text-xs" style={{ color: '#2d4460' }}>No headlines found for {symbol}</p>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Strategy meta
// ---------------------------------------------------------------------------
const STRATEGY_META: Record<BotStrategy, { label: string; color: string; desc: string; icon: string }> = {
  ma_crossover: { label: 'MA Crossover', color: '#0ea5e9', desc: 'Golden/Death cross of fast & slow moving averages', icon: '📈' },
  rsi:          { label: 'RSI',          color: '#8b5cf6', desc: 'Buy oversold, sell overbought using RSI oscillator', icon: '🔄' },
  macd:         { label: 'MACD',         color: '#06b6d4', desc: 'Signal line crossover with histogram momentum filter', icon: '📊' },
  momentum:     { label: 'Momentum',     color: '#f59e0b', desc: 'Buy breakouts above N-period high, sell breakdowns', icon: '▲' },
}

const LOG_COLORS: Record<string, string> = {
  info:   '#64748b',
  signal: '#f59e0b',
  trade:  '#00c878',
  risk:   '#f43f5e',
  warn:   '#f97316',
  error:  '#ef4444',
}
const LOG_ICONS: Record<string, string> = {
  info: 'ℹ️', signal: '⚡', trade: '💹', risk: '🛡️', warn: '⚠️', error: '✗',
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
function $pnl(n: number) {
  return `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: Bot['status'] }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    running:     { bg: '#00c87818', color: '#00c878' },
    warming_up:  { bg: '#38bdf818', color: '#38bdf8' },
    paused:      { bg: '#f59e0b18', color: '#f59e0b' },
    idle:        { bg: '#94a3b820', color: '#94a3b8' },
    stopped:     { bg: '#ef444418', color: '#ef4444' },
    error:       { bg: '#ef444418', color: '#ef4444' },
  }
  const c = cfg[status] ?? cfg.idle
  const isAlive = status === 'running' || status === 'warming_up'
  const label = status === 'warming_up' ? 'Warming up' : status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{
        background: c.color,
        boxShadow: isAlive ? `0 0 6px ${c.color}` : 'none',
      }} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Equity sparkline
// ---------------------------------------------------------------------------
function EquitySparkline({ curve }: { curve: BotEquityPoint[] }) {
  if (!curve || curve.length < 2) {
    return <div className="h-8 flex items-center text-xs" style={{ color: '#3b5070' }}>No equity data yet</div>
  }
  const w = 180, h = 32
  const pnls = curve.map(p => p.pnl)
  const min = Math.min(...pnls), max = Math.max(...pnls)
  const range = max - min || 1
  const pts = curve.map((p, i) => {
    const x = (i / (curve.length - 1)) * w
    const y = h - ((p.pnl - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastPnl = pnls[pnls.length - 1]
  const color = lastPnl >= 0 ? '#00c878' : '#ef4444'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Bot card
// ---------------------------------------------------------------------------
function BotCard({ bot, selected, onClick }: { bot: Bot; selected: boolean; onClick: () => void }) {
  const pnlPos  = bot.pnl >= 0
  const winRate = bot.trades > 0 ? ((bot.wins / bot.trades) * 100).toFixed(0) : '--'
  const warmupPct = bot.warmupBarsNeeded > 0
    ? Math.min(100, Math.round((bot.warmupBarsCurrent / bot.warmupBarsNeeded) * 100))
    : 100
  return (
    <div onClick={onClick} className="rounded-xl p-4 cursor-pointer transition-all"
         style={{
           background: selected ? 'rgba(14,165,233,0.07)' : 'rgba(255,255,255,0.025)',
           border: `1px solid ${selected ? '#0ea5e940' : 'rgba(255,255,255,0.06)'}`,
         }}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 mr-2">
          <p className="font-semibold text-white text-sm truncate">{bot.name}</p>
          <p className="text-xs text-text-secondary mt-0.5">{bot.symbol}</p>
        </div>
        <StatusBadge status={bot.status} />
      </div>

      {bot.status === 'warming_up' && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#38bdf8' }}>
            <span>Warming up…</span>
            <span>{bot.warmupBarsCurrent}/{bot.warmupBarsNeeded} bars</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(56,189,248,0.15)' }}>
            <div className="h-1 rounded-full transition-all" style={{ width: `${warmupPct}%`, background: '#38bdf8' }} />
          </div>
        </div>
      )}

      <div className="mb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: STRATEGY_META[bot.strategy].color + '20', color: STRATEGY_META[bot.strategy].color, border: `1px solid ${STRATEGY_META[bot.strategy].color}30` }}>
          {STRATEGY_META[bot.strategy].label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs text-text-muted mb-0.5">P&L</p>
          <p className="text-xs font-bold font-mono" style={{ color: pnlPos ? '#00c878' : '#ef4444' }}>
            {$pnl(bot.pnl)}
          </p>
        </div>
        <div className="rounded-lg py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs text-text-muted mb-0.5">Trades</p>
          <p className="text-xs font-bold text-white">{bot.trades}</p>
        </div>
        <div className="rounded-lg py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs text-text-muted mb-0.5">Win %</p>
          <p className="text-xs font-bold" style={{ color: '#38bdf8' }}>{winRate}{winRate !== '--' ? '%' : ''}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log line
// ---------------------------------------------------------------------------
function LogLine({ log }: { log: BotLog }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
      <span className="text-xs font-mono shrink-0" style={{ color: '#2d4460', minWidth: 76 }}>{fmtTime(log.ts)}</span>
      <span className="text-xs shrink-0 font-bold uppercase w-14" style={{ color: LOG_COLORS[log.level] ?? '#94a3b8' }}>
        {LOG_ICONS[log.level] ?? 'ℹ️'} {log.level}
      </span>
      <span className="text-xs break-words" style={{ color: LOG_COLORS[log.level] ?? '#94a3b8', opacity: 0.85 }}>{log.message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Bot Modal
// ---------------------------------------------------------------------------
type TabKey = 'strategy' | 'risk'

function CreateBotModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: Bot) => void }) {
  const [tab,       setTab]       = useState<TabKey>('strategy')
  const [name,      setName]      = useState('')
  const [symbol,    setSymbol]    = useState('BTC/USDT')
  const [strategy,  setStrategy]  = useState<BotStrategy>('ma_crossover')
  const [tradeSize, setTradeSize] = useState(0.01)
  // MA
  const [fastP,     setFastP]     = useState(9)
  const [slowP,     setSlowP]     = useState(21)
  // RSI
  const [rsiP,      setRsiP]      = useState(14)
  const [rsiOb,     setRsiOb]     = useState(70)
  const [rsiOs,     setRsiOs]     = useState(30)
  // MACD
  const [macdFast,  setMacdFast]  = useState(12)
  const [macdSlow,  setMacdSlow]  = useState(26)
  const [macdSig,   setMacdSig]   = useState(9)
  // Momentum
  const [lookback,  setLookback]  = useState(20)
  // Risk
  const [slPct,     setSlPct]     = useState('')
  const [tpPct,     setTpPct]     = useState('')
  const [maxDL,     setMaxDL]     = useState('')
  const [maxDT,     setMaxDT]     = useState('')
  const [confirmB,  setConfirmB]  = useState(1)
  const [useNewsFilter, setUseNewsFilter] = useState(false)

  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Bot name is required'); return }
    setLoading(true); setErr(null)
    try {
      let params: any = { tradeSize }
      if (strategy === 'ma_crossover') params = { ...params, fastPeriod: fastP, slowPeriod: slowP }
      if (strategy === 'rsi')          params = { ...params, rsiPeriod: rsiP, rsiOverbought: rsiOb, rsiOversold: rsiOs }
      if (strategy === 'macd')         params = { ...params, macdFast, macdSlow, macdSignal: macdSig }
      if (strategy === 'momentum')     params = { ...params, lookbackPeriod: lookback }
      if (slPct)        params.stopLossPercent   = parseFloat(slPct)
      if (tpPct)        params.takeProfitPercent = parseFloat(tpPct)
      if (maxDL)        params.maxDailyLoss      = parseFloat(maxDL)
      if (maxDT)        params.maxDailyTrades    = parseInt(maxDT)
      if (confirmB > 1) params.confirmBars       = confirmB
      if (useNewsFilter)  params.useNewsFilter     = true
      const bot = await createBot({ name: name.trim(), symbol, strategy, params })
      onCreate(bot)
      onClose()
    } catch (e: any) {
      setErr(e.response?.data?.error ?? e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
           style={{ background: '#0a1623', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={2}>
                <path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/>
                <path d="M12 16a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2z"/>
                <path d="M2 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z"/>
                <path d="M16 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-white">Deploy New TradePilot Bot</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['strategy', 'risk'] as TabKey[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
                    className="flex-1 py-2.5 text-sm font-semibold capitalize transition-colors"
                    style={{
                      color: tab === t ? '#0ea5e9' : '#4b6280',
                      borderBottom: tab === t ? '2px solid #0ea5e9' : '2px solid transparent',
                    }}>
              {t === 'strategy' ? '⚙ Strategy' : '🛡 Risk'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {tab === 'strategy' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Bot Name</label>
                  <input className="input w-full" placeholder="Alpha Bot" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Market</label>
                  <select className="input w-full" value={symbol} onChange={e => setSymbol(e.target.value)}>
                    {SYMBOL_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(STRATEGY_META) as [BotStrategy, typeof STRATEGY_META[BotStrategy]][]).map(([key, m]) => (
                    <button key={key} type="button" onClick={() => setStrategy(key)}
                            className="rounded-xl p-3 text-left transition-all"
                            style={{
                              border: `1px solid ${strategy === key ? m.color + '50' : 'rgba(255,255,255,0.06)'}`,
                              background: strategy === key ? m.color + '10' : 'rgba(255,255,255,0.02)',
                            }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: m.color, fontSize: 14 }}>{m.icon}</span>
                        <p className="text-xs font-bold" style={{ color: strategy === key ? m.color : '#94a3b8' }}>{m.label}</p>
                      </div>
                      <p style={{ color: '#4b6280', fontSize: 10 }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {strategy === 'ma_crossover' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Fast Period</label>
                    <input className="input w-full" type="number" min={2} max={50}  value={fastP} onChange={e => setFastP(+e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Slow Period</label>
                    <input className="input w-full" type="number" min={5} max={200} value={slowP} onChange={e => setSlowP(+e.target.value)} />
                  </div>
                </div>
              )}
              {strategy === 'rsi' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Period</label>
                    <input className="input w-full" type="number" min={2} max={50} value={rsiP} onChange={e => setRsiP(+e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Overbought</label>
                    <input className="input w-full" type="number" min={55} max={90} value={rsiOb} onChange={e => setRsiOb(+e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Oversold</label>
                    <input className="input w-full" type="number" min={10} max={45} value={rsiOs} onChange={e => setRsiOs(+e.target.value)} />
                  </div>
                </div>
              )}
              {strategy === 'macd' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Fast EMA</label>
                    <input className="input w-full" type="number" min={2} max={50}  value={macdFast} onChange={e => setMacdFast(+e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Slow EMA</label>
                    <input className="input w-full" type="number" min={5} max={200} value={macdSlow} onChange={e => setMacdSlow(+e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Signal</label>
                    <input className="input w-full" type="number" min={2} max={50}  value={macdSig}  onChange={e => setMacdSig(+e.target.value)} />
                  </div>
                </div>
              )}
              {strategy === 'momentum' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Lookback Bars</label>
                  <input className="input w-full" type="number" min={5} max={100} value={lookback} onChange={e => setLookback(+e.target.value)} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Trade Size (units)</label>
                <input className="input w-full" type="number" min={0.001} step={0.001} value={tradeSize} onChange={e => setTradeSize(+e.target.value)} />
              </div>
            </>
          )}

          {tab === 'risk' && (
            <div className="space-y-5">
              <p className="text-xs text-text-muted">Leave blank to disable a limit. Limits are checked every 1-minute candle close.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Stop Loss %</label>
                  <div className="relative">
                    <input className="input w-full pr-7" type="number" min={0.1} step={0.1} placeholder="e.g. 1.5" value={slPct} onChange={e => setSlPct(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Take Profit %</label>
                  <div className="relative">
                    <input className="input w-full pr-7" type="number" min={0.1} step={0.1} placeholder="e.g. 3.0" value={tpPct} onChange={e => setTpPct(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Max Daily Loss $</label>
                  <div className="relative">
                    <input className="input w-full pl-5" type="number" min={0} step={1} placeholder="e.g. 500" value={maxDL} onChange={e => setMaxDL(e.target.value)} />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Max Daily Trades</label>
                  <input className="input w-full" type="number" min={1} step={1} placeholder="e.g. 10" value={maxDT} onChange={e => setMaxDT(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                  Signal Confirmation Bars
                  <span className="ml-1 font-normal normal-case text-text-muted">(consecutive matches before acting)</span>
                </label>
                <input className="input w-full" type="number" min={1} max={10} value={confirmB} onChange={e => setConfirmB(+e.target.value)} />
              </div>

              {/* News filter */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl p-3.5 transition-all"
                     style={{ background: useNewsFilter ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${useNewsFilter ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                <input type="checkbox" className="mt-0.5 w-4 h-4 shrink-0" checked={useNewsFilter} onChange={e => setUseNewsFilter(e.target.checked)} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: useNewsFilter ? '#38bdf8' : '#94a3b8' }}>📰 News Sentiment Filter</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4b6280' }}>
                    Block buy signals when aggregated news sentiment for {symbol || 'this market'} is bearish (score &lt; −0.1).
                    Uses CryptoCompare, Yahoo Finance RSS, or Forex Factory. Cached 15 min.
                  </p>
                </div>
              </label>

              {(slPct || tpPct || maxDL || maxDT || confirmB > 1) && (
                <div className="rounded-xl p-3 text-xs space-y-1"
                     style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  <p className="font-semibold mb-1.5" style={{ color: '#38bdf8' }}>Active risk rules:</p>
                  {slPct && <p style={{ color: '#94a3b8' }}>🔴 Stop loss at <span className="text-white font-semibold">{slPct}%</span> below entry</p>}
                  {tpPct && <p style={{ color: '#94a3b8' }}>🟡 Take profit at <span className="text-white font-semibold">{tpPct}%</span> above entry</p>}
                  {maxDL && <p style={{ color: '#94a3b8' }}>🛡 Pause after <span className="text-white font-semibold">${maxDL}</span> daily loss</p>}
                  {maxDT && <p style={{ color: '#94a3b8' }}>⏱ Cap at <span className="text-white font-semibold">{maxDT}</span> trades/day</p>}
                  {confirmB > 1 && <p style={{ color: '#94a3b8' }}>⚡ Require <span className="text-white font-semibold">{confirmB}</span> consecutive signals</p>}
                  {useNewsFilter  && <p style={{ color: '#38bdf8' }}>📰 News sentiment filter enabled (blocks bearish buys)</p>}
                </div>
              )}
            </div>
          )}

          {err && <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)' }}>{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-outline py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold">
              {loading ? 'Deploying…' : 'Deploy Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function BotsPage() {
  const [bots,             setBots]             = useState<Bot[]>([])
  const [selected,         setSelected]         = useState<Bot | null>(null)
  const [showModal,        setShowModal]        = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [actionId,         setActionId]         = useState<string | null>(null)
  const [showRiskModal,    setShowRiskModal]    = useState(false)
  const [pendingStartBot,  setPendingStartBot]  = useState<Bot | null>(null)
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
    // Show risk disclosure if not yet accepted
    const accepted = localStorage.getItem('tradepilot_risk_v1')
    if (!accepted) {
      setPendingStartBot(bot)
      setShowRiskModal(true)
      return
    }
    await _doStart(bot)
  }

  async function _doStart(bot: Bot) {
    setActionId(bot.id)
    try {
      const updated = await startBot(bot.id)
      setBots(b => b.map(x => x.id === bot.id ? updated : x))
      if (selected?.id === bot.id) setSelected(updated)
    } catch (e: any) { alert(e.response?.data?.error ?? e.message) }
    finally { setActionId(null) }
  }

  async function handleStop(bot: Bot) {
    setActionId(bot.id)
    try {
      const updated = await stopBot(bot.id)
      setBots(b => b.map(x => x.id === bot.id ? updated : x))
      if (selected?.id === bot.id) setSelected(updated)
    } catch (e: any) { alert(e.response?.data?.error ?? e.message) }
    finally { setActionId(null) }
  }

  async function handleDelete(bot: Bot) {
    if (!confirm(`Delete "${bot.name}"? This cannot be undone.`)) return
    setActionId(bot.id)
    try {
      await deleteBot(bot.id)
      setBots(b => b.filter(x => x.id !== bot.id))
      if (selected?.id === bot.id) { setSelected(null); selectedIdRef.current = null }
    } catch (e: any) { alert(e.response?.data?.error ?? e.message) }
    finally { setActionId(null) }
  }

  async function selectBot(bot: Bot) {
    selectedIdRef.current = bot.id
    try { setSelected(await getBotById(bot.id)) } catch { setSelected(bot) }
  }

  const running     = bots.filter(b => b.status === 'running' || b.status === 'warming_up').length
  const totalTrades = bots.reduce((a, b) => a + b.trades, 0)
  const totalPnl    = bots.reduce((a, b) => a + b.pnl, 0)
  const allWins     = bots.reduce((a, b) => a + b.wins, 0)
  const winRate     = totalTrades > 0 ? (allWins / totalTrades * 100).toFixed(1) : '--'

  return (
    <div className="h-full flex flex-col" style={{ background: '#080f17' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.2),rgba(6,182,212,0.15))', border: '1px solid rgba(14,165,233,0.25)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.8}>
              <path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/>
              <path d="M12 16a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2z"/>
              <path d="M2 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z"/>
              <path d="M16 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">TradePilot</h1>
          <p className="text-xs text-text-secondary">4 strategies · event-driven candle execution · SL/TP · daily risk controls · news sentiment</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
          Deploy Bot
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-px border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Total Bots',    value: bots.length,              color: '#38bdf8' },
          { label: 'Active',        value: running,                  color: '#00c878' },
          { label: 'Total Trades',  value: totalTrades,              color: '#f59e0b' },
          { label: 'Portfolio P&L', value: $pnl(totalPnl),           color: totalPnl >= 0 ? '#00c878' : '#ef4444' },
          { label: 'Win Rate',      value: totalTrades ? winRate+'%' : '--', color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="flex-1 px-5 py-3"
               style={{ background: 'rgba(255,255,255,0.012)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-text-muted uppercase tracking-wider">{s.label}</p>
            <p className="text-base font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Bot list */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r p-3 space-y-2.5"
             style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {loading && <div className="text-center py-10 text-text-muted text-sm">Loading bots…</div>}
          {!loading && bots.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.5}>
                  <path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/>
                  <path d="M12 16a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2z"/>
                  <path d="M2 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z"/>
                  <path d="M16 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <p className="text-white font-semibold mb-1">No bots deployed</p>
              <p className="text-text-muted text-xs">Click "Deploy Bot" to start your first automated strategy</p>
            </div>
          )}
          {bots.map(bot => (
            <BotCard key={bot.id} bot={bot} selected={selected?.id === bot.id} onClick={() => selectBot(bot)} />
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            <div className="flex items-center justify-between px-6 py-3.5 border-b"
                 style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white">{selected.name}</h2>
                  <StatusBadge status={selected.status} />
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: STRATEGY_META[selected.strategy].color + '20', color: STRATEGY_META[selected.strategy].color, border: `1px solid ${STRATEGY_META[selected.strategy].color}30` }}>
                    {STRATEGY_META[selected.strategy].label}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {selected.symbol} · Created {fmtDate(selected.createdAt)}
                  {selected.startedAt && ` · Started ${fmtDate(selected.startedAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(selected.status === 'idle' || selected.status === 'stopped' || selected.status === 'error' || selected.status === 'paused') ? (
                  <button onClick={() => handleStart(selected)} disabled={!!actionId}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold"
                          style={{ background: '#00c87818', border: '1px solid #00c87840', color: '#00c878' }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                    {actionId === selected.id ? 'Starting…' : selected.status === 'paused' ? 'Resume' : 'Start'}
                  </button>
                ) : (
                  <button onClick={() => handleStop(selected)} disabled={!!actionId}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold"
                          style={{ background: '#f59e0b18', border: '1px solid #f59e0b40', color: '#f59e0b' }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    {actionId === selected.id ? 'Stopping…' : 'Stop'}
                  </button>
                )}
                <button onClick={() => handleDelete(selected)} disabled={!!actionId}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: '#ef444418', border: '1px solid #ef444430', color: '#ef4444' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>

            {/* Warmup progress */}
            {selected.status === 'warming_up' && (
              <div className="px-6 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(56,189,248,0.04)' }}>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: '#38bdf8' }}>
                  <span>⏳ Loading historical bars for indicator warmup…</span>
                  <span>{selected.warmupBarsCurrent}/{selected.warmupBarsNeeded}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(56,189,248,0.12)' }}>
                  <div className="h-1.5 rounded-full transition-all"
                       style={{ width: `${Math.min(100, (selected.warmupBarsCurrent / Math.max(1, selected.warmupBarsNeeded)) * 100)}%`, background: 'linear-gradient(to right, #38bdf8, #0ea5e9)' }} />
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-7 gap-px border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Position',     value: selected.position === 'long' ? '● LONG' : '○ FLAT', color: selected.position === 'long' ? '#00c878' : '#64748b' },
                { label: 'Total P&L',    value: $pnl(selected.pnl),          color: selected.pnl >= 0 ? '#00c878' : '#ef4444' },
                { label: 'Max DD',       value: selected.maxDrawdown > 0 ? `-${selected.maxDrawdown.toFixed(1)}%` : '--', color: '#ef4444' },
                { label: 'Trades',       value: selected.trades,              color: '#f59e0b' },
                { label: 'Win Rate',     value: selected.trades > 0 ? ((selected.wins/selected.trades)*100).toFixed(1)+'%' : '--', color: '#38bdf8' },
                { label: 'Today Trades', value: selected.dailyTrades,         color: '#94a3b8' },
                { label: 'Today Loss',   value: selected.dailyLoss > 0 ? `-$${selected.dailyLoss.toFixed(2)}` : '$0', color: selected.dailyLoss > 0 ? '#f43f5e' : '#64748b' },
              ].map(s => (
                <div key={s.label} className="px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <p className="text-xs text-text-muted uppercase tracking-wider leading-tight">{s.label}</p>
                  <p className="text-sm font-bold font-mono mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Active position context */}
            {selected.position === 'long' && (selected.currentEntryPrice || selected.currentSL || selected.currentTP) && (
              <div className="px-6 py-2.5 border-b flex items-center gap-6 text-xs"
                   style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,200,120,0.04)' }}>
                <span style={{ color: '#64748b' }}>Active trade:</span>
                {selected.currentEntryPrice && <span>Entry: <span className="font-bold text-white">{selected.currentEntryPrice.toFixed(5)}</span></span>}
                {selected.currentSL && <span style={{ color: '#f43f5e' }}>🔴 SL: <span className="font-bold">{selected.currentSL.toFixed(5)}</span></span>}
                {selected.currentTP && <span style={{ color: '#fbbf24' }}>🟡 TP: <span className="font-bold">{selected.currentTP.toFixed(5)}</span></span>}
              </div>
            )}

            {/* News Sentiment Panel */}
            <NewsSentimentPanel symbol={selected.symbol} />

            {/* Config + equity sparkline */}
            <div className="px-6 py-3 border-b flex items-center justify-between gap-4"
                 style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>Size: <span className="text-text-secondary font-semibold">{selected.params.tradeSize}</span></span>
                {selected.params.stopLossPercent    && <span style={{ color: '#f43f5e' }}>SL {selected.params.stopLossPercent}%</span>}
                {selected.params.takeProfitPercent  && <span style={{ color: '#fbbf24' }}>TP {selected.params.takeProfitPercent}%</span>}
                {selected.params.maxDailyLoss       && <span>MaxDL ${selected.params.maxDailyLoss}</span>}
                {selected.params.maxDailyTrades     && <span>MaxDT {selected.params.maxDailyTrades}</span>}
                {selected.params.confirmBars && selected.params.confirmBars > 1 && <span>Confirm {selected.params.confirmBars}b</span>}
                {selected.params.useNewsFilter && <span style={{ color: '#38bdf8' }}>📰 News filter ON</span>}
                {selected.strategy === 'ma_crossover' && <span>MA {selected.params.fastPeriod ?? 9}/{selected.params.slowPeriod ?? 21}</span>}
                {selected.strategy === 'rsi' && <span>RSI {selected.params.rsiPeriod ?? 14} [{selected.params.rsiOversold ?? 30}/{selected.params.rsiOverbought ?? 70}]</span>}
                {selected.strategy === 'macd' && <span>MACD {selected.params.macdFast ?? 12}/{selected.params.macdSlow ?? 26}/{selected.params.macdSignal ?? 9}</span>}
                {selected.strategy === 'momentum' && <span>LB {selected.params.lookbackPeriod ?? 20}</span>}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-text-muted">Equity:</span>
                <EquitySparkline curve={selected.equityCurve} />
              </div>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-2 flex items-center justify-between border-b"
                   style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Activity Log</p>
                <p className="text-xs text-text-muted">{selected.logs.length} entries</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-2 font-mono">
                {selected.logs.length === 0 && (
                  <p className="text-text-muted text-xs py-4">No activity yet. Start the bot to begin trading.</p>
                )}
                {[...selected.logs].reverse().map((log, i) => <LogLine key={i} log={log} />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.4}>
                <path d="M12 2a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2V4a2 2 0 012-2z"/>
                <path d="M12 16a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2z"/>
                <path d="M2 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H4a2 2 0 01-2-2z"/>
                <path d="M16 12a2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <p className="text-white font-semibold">Select a bot to view details</p>
            <p className="text-text-muted text-sm">Logs, equity curve, and real-time controls</p>
          </div>
        )}
      </div>

      {showModal && <CreateBotModal onClose={() => setShowModal(false)} onCreate={b => { setBots(prev => [b, ...prev]) }} />}

      {showRiskModal && pendingStartBot && (
        <RiskDisclosureModal
          onAccept={() => {
            localStorage.setItem('tradepilot_risk_v1', Date.now().toString())
            setShowRiskModal(false)
            _doStart(pendingStartBot)
            setPendingStartBot(null)
          }}
          onClose={() => {
            setShowRiskModal(false)
            setPendingStartBot(null)
          }}
        />
      )}
    </div>
  )
}
