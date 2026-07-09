import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice } from '../utils/formatters'
import { fetchMacroNews, MacroNews } from '../api/news'

// ─── Design tokens (match TradePilot / Analytics) ─────────────────────────────
// Backgrounds / borders / text map to theme tokens (calm slate). Accent/bull/
// bear/warn stay hex (alpha-concat safe). Root is wrapped in .theme-dark-scope
// so these resolve to the calm-dark palette consistently.
const C = {
  bg:        'var(--t-bg)',
  surface:   'var(--t-surface)',
  surface2:  'var(--t-surface-2)',
  border:    'var(--t-border)',
  border2:   'var(--t-border-hover)',
  text1:     'var(--t-text-1)',
  text2:     'var(--t-text-2)',
  text3:     'var(--t-text-3)',
  blue:      '#4f8cff',
  blueText:  '#7aa7ff',
  blueGlow:  'rgba(79,140,255,0.18)',
  green:     '#18c98a',
  red:       '#ff5a72',
  amber:     '#f6b24a',
  violet:    '#8b5cf6',
}
const SENT: Record<string, string> = { bullish: '#10b981', bearish: '#ef4444', neutral: '#f59e0b' }

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetFilter = 'all' | 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'bond'
type SortKey     = 'symbol' | 'price' | 'changePercent' | 'high24h' | 'low24h' | 'volume24h'
type SignalTag   = 'RSI_OB' | 'RSI_OS' | 'NEAR_HIGH' | 'NEAR_LOW' | 'SURGE' | 'DUMP' | 'VOL_SPIKE'
type ViewMode    = 'cards' | 'table'

interface Signal { type: SignalTag; label: string; color: string; bg: string }
interface Row {
  symbol: string; name: string; assetClass: string
  price: number; change: number; changePercent: number
  high24h: number; low24h: number; volume24h: number; timestamp: number
}

interface ScreenerFilters {
  changeMode:  'any' | 'gainers' | 'losers' | 'gt1' | 'gt3' | 'gt5' | 'lt1' | 'lt3' | 'lt5'
  volumeMode:  'any' | 'gt1m' | 'gt10m' | 'gt100m' | 'gt1b'
  signal:      'any' | SignalTag
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ASSET_COLOR: Record<string, { color: string; bg: string }> = {
  crypto:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)'  },
  forex:     { color: '#7dd3fc', bg: 'rgba(56,189,248,0.12)'  },
  stock:     { color: '#38bdf8', bg: 'rgba(14,165,233,0.12)'  },
  commodity: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)'   },
  index:     { color: '#c084fc', bg: 'rgba(168,85,247,0.12)'  },
  bond:      { color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
}

const ASSET_TABS: { key: AssetFilter; label: string }[] = [
  { key:'all', label:'All' }, { key:'stock', label:'Stocks' }, { key:'crypto', label:'Crypto' },
  { key:'forex', label:'Forex' }, { key:'commodity', label:'Commodities' },
  { key:'index', label:'Indices' }, { key:'bond', label:'Bonds' },
]

function fmtVol(v: number): string {
  if (v >= 1e9) return `$${(v/1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

// ─── Signal engine ────────────────────────────────────────────────────────────

function computeSignals(row: Row, avgVolume: number): Signal[] {
  const sigs: Signal[] = []
  const range = row.high24h - row.low24h
  const pos   = range > 0 ? (row.price - row.low24h) / range : 0.5
  const rsi   = Math.round(pos * 100)
  const chg   = row.changePercent

  if (rsi >= 70) sigs.push({ type:'RSI_OB',   label:`RSI ~${rsi} OB`, color:'#ef4444', bg:'rgba(239,68,68,0.12)'   })
  if (rsi <= 30) sigs.push({ type:'RSI_OS',   label:`RSI ~${rsi} OS`, color:'#10b981', bg:'rgba(16,185,129,0.12)'  })
  if (pos >= 0.94) sigs.push({ type:'NEAR_HIGH', label:'Near 24H High', color:'#f59e0b', bg:'rgba(245,158,11,0.12)'  })
  if (pos <= 0.06) sigs.push({ type:'NEAR_LOW',  label:'Near 24H Low',  color:'#0ea5e9', bg:'rgba(14,165,233,0.12)'  })
  if (chg >= 5)    sigs.push({ type:'SURGE',     label:`+${chg.toFixed(1)}% Surge`,  color:'#10b981', bg:'rgba(16,185,129,0.12)'  })
  if (chg <= -5)   sigs.push({ type:'DUMP',      label:`${chg.toFixed(1)}% Drop`,    color:'#ef4444', bg:'rgba(239,68,68,0.12)'   })
  if (avgVolume > 0 && row.volume24h > avgVolume * 2.5)
                   sigs.push({ type:'VOL_SPIKE',  label:'Vol Spike',      color:'#8b5cf6', bg:'rgba(139,92,246,0.12)'  })
  return sigs
}

// ─── Mini sparkline (price position in 24h range) ────────────────────────────

function MiniBar({ row }: { row: Row }) {
  const range = row.high24h - row.low24h
  const pos   = range > 0 ? Math.min(Math.max((row.price - row.low24h) / range, 0), 1) : 0.5
  const color = row.changePercent >= 0 ? '#10b981' : '#ef4444'
  const W = 40, H = 16
  // 7 synthetic bars across the 24h range
  const bars = [0.3, 0.45, 0.38, 0.55, 0.62, 0.7, pos]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
      {bars.map((v, i) => {
        const bh = Math.max(2, v * H)
        return <rect key={i} x={i * 6} y={H - bh} width={4} height={bh} rx={1}
                     fill={i === bars.length - 1 ? color : `${color}50`}/>
      })}
    </svg>
  )
}

// ─── Mover card (horizontal scroll hero) ─────────────────────────────────────

function MoverCard({ row, rank, onClick }: { row: Row; rank: number; onClick: () => void }) {
  const isUp  = row.changePercent >= 0
  const color = isUp ? '#10b981' : '#ef4444'
  const ac    = ASSET_COLOR[row.assetClass]
  return (
    <button onClick={onClick} style={{
      flexShrink:0, width:'calc(52vw - 16px)', maxWidth:220, minWidth:160,
      borderRadius:14, background:'var(--t-surface)', border:`1px solid rgba(255,255,255,0.06)`,
      borderLeft:`4px solid ${color}`, padding:'13px 12px',
      textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:8,
    }}>
      {/* Rank + symbol + type */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:9, fontWeight:900, color:'#334155' }}>#{rank}</span>
            <span style={{ fontSize:13, fontWeight:900, color:'#e2e8f0', fontFamily:'monospace' }}>{row.symbol}</span>
          </div>
          <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:ac?.bg, color:ac?.color }}>{row.assetClass.toUpperCase()}</span>
        </div>
        <MiniBar row={row}/>
      </div>
      {/* Price */}
      <div>
        <div style={{ fontSize:14, fontFamily:'monospace', fontWeight:900, color:'#e2e8f0', lineHeight:1 }}>{formatPrice(row.price, row.symbol)}</div>
        <div style={{ fontSize:13, fontWeight:800, color, marginTop:3 }}>{isUp?'+':''}{row.changePercent.toFixed(2)}%</div>
      </div>
      {/* Vol */}
      <div style={{ fontSize:10, color:'#334155' }}>Vol: {fmtVol(row.volume24h)}</div>
    </button>
  )
}

// ─── Instrument card (mobile list) ───────────────────────────────────────────

function InstrumentCard({ row, signals, onClick }: { row: Row; signals: Signal[]; onClick: () => void }) {
  const isUp  = row.changePercent >= 0
  const color = isUp ? '#10b981' : '#ef4444'
  const ac    = ASSET_COLOR[row.assetClass]
  const range = row.high24h - row.low24h
  const pos   = range > 0 ? Math.min(Math.max((row.price - row.low24h) / range, 0), 1) : 0.5

  return (
    <button onClick={onClick} style={{
      width:'100%', borderRadius:14, background:'var(--t-surface)', border:`1px solid rgba(255,255,255,0.06)`,
      borderLeft:`4px solid ${color}`, padding:'13px 14px', textAlign:'left', cursor:'pointer', marginBottom:5,
      display:'flex', alignItems:'center', gap:12, transition:'background 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--t-surface)')}
    >
      {/* Left: symbol */}
      <div style={{ flex:'0 0 auto', minWidth:100 }}>
        <div style={{ fontSize:13, fontFamily:'monospace', fontWeight:900, color:'#e2e8f0' }}>{row.symbol}</div>
        <div style={{ fontSize:9, color:'#334155', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{row.name}</div>
        <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:ac?.bg, color:ac?.color, marginTop:3, display:'inline-block' }}>{row.assetClass.toUpperCase()}</span>
      </div>

      {/* Center: price + change */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontFamily:'monospace', fontWeight:900, color:'#e2e8f0', lineHeight:1 }}>{formatPrice(row.price, row.symbol)}</div>
        <div style={{ fontSize:12, fontWeight:800, color, marginTop:3 }}>{isUp?'+':''}{row.changePercent.toFixed(2)}%</div>
        {/* 24h range bar */}
        <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:8, color:'#334155', fontFamily:'monospace' }}>{formatPrice(row.low24h, row.symbol)}</span>
          <div style={{ flex:1, height:3, borderRadius:2, background:'var(--t-surface-2)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pos * 100}%`, background:color, borderRadius:2, transition:'width 0.3s' }}/>
          </div>
          <span style={{ fontSize:8, color:'#334155', fontFamily:'monospace' }}>{formatPrice(row.high24h, row.symbol)}</span>
        </div>
      </div>

      {/* Right: volume + signals + chevron */}
      <div style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
        <div style={{ fontSize:10, color:'#334155' }}>{fmtVol(row.volume24h)}</div>
        {signals.slice(0, 2).map(s => (
          <span key={s.type} style={{ fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:4, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>
        ))}
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#334155" strokeWidth={2.5} style={{ marginTop:2 }}><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </button>
  )
}

// ─── Desktop table row ────────────────────────────────────────────────────────

function TableRow({ row, signals, rank, onClick }: { row: Row; signals: Signal[]; rank: number; onClick: () => void }) {
  const isUp  = row.changePercent >= 0
  const color = isUp ? '#10b981' : '#ef4444'
  const ac    = ASSET_COLOR[row.assetClass]
  const range = row.high24h - row.low24h
  const pos   = range > 0 ? Math.min(Math.max((row.price - row.low24h) / range, 0), 1) : 0.5

  return (
    <tr onClick={onClick} style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', transition:'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-bg)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {/* Rank */}
      <td style={{ padding:'10px 10px 10px 14px', fontSize:10, color:'#334155', fontFamily:'monospace', width:32 }}>#{rank}</td>
      {/* Symbol */}
      <td style={{ padding:'10px 8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:3, height:32, borderRadius:2, background:color, flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:12, fontFamily:'monospace', fontWeight:900, color:'#e2e8f0' }}>{row.symbol}</div>
            <div style={{ fontSize:9, color:'#334155', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.name}</div>
          </div>
        </div>
      </td>
      {/* Type */}
      <td style={{ padding:'10px 8px' }}>
        <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:ac?.bg, color:ac?.color }}>{row.assetClass.toUpperCase()}</span>
      </td>
      {/* Price */}
      <td style={{ padding:'10px 8px', textAlign:'right', fontFamily:'monospace', fontSize:13, fontWeight:900, color:'#e2e8f0' }}>{formatPrice(row.price, row.symbol)}</td>
      {/* Change */}
      <td style={{ padding:'10px 8px', textAlign:'right' }}>
        <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:800, color }}>{isUp?'+':''}{row.changePercent.toFixed(2)}%</span>
      </td>
      {/* 24h range */}
      <td style={{ padding:'10px 8px', minWidth:110 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:8, color:'#334155', fontFamily:'monospace', flexShrink:0 }}>{formatPrice(row.low24h, row.symbol)}</span>
          <div style={{ flex:1, height:3, borderRadius:2, background:'var(--t-surface-2)', position:'relative', minWidth:36 }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pos*100}%`, background:color, borderRadius:2 }}/>
          </div>
          <span style={{ fontSize:8, color:'#334155', fontFamily:'monospace', flexShrink:0 }}>{formatPrice(row.high24h, row.symbol)}</span>
        </div>
      </td>
      {/* Volume */}
      <td style={{ padding:'10px 8px', textAlign:'right', fontSize:11, color:'#64748b', fontFamily:'monospace' }}>{fmtVol(row.volume24h)}</td>
      {/* Signals */}
      <td style={{ padding:'10px 8px' }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {signals.slice(0, 3).map(s => (
            <span key={s.type} style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>
          ))}
        </div>
      </td>
      {/* Action */}
      <td style={{ padding:'10px 14px 10px 8px' }}>
        <button onClick={e => { e.stopPropagation(); onClick() }}
                style={{ padding:'6px 14px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#e2e8f0', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
          Trade →
        </button>
      </td>
    </tr>
  )
}

// ─── Advanced screener sheet ──────────────────────────────────────────────────

function ScreenerSheet({ filters, onChange, onClose }: {
  filters: ScreenerFilters
  onChange: (f: ScreenerFilters) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState(filters)
  const up = (patch: Partial<ScreenerFilters>) => setLocal(p => ({ ...p, ...patch }))
  const apply = () => { onChange(local); onClose() }
  const reset = () => { const def: ScreenerFilters = { changeMode:'any', volumeMode:'any', signal:'any' }; setLocal(def); onChange(def); onClose() }

  const section = (label: string, children: React.ReactNode) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10, fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{label}</div>
      {children}
    </div>
  )
  const pills = <T extends string>(opts: { value: T; label: string }[], current: T, set: (v: T) => void) => (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {opts.map(o => (
        <button key={o.value} onClick={() => set(o.value)} style={{
          padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.12s',
          background: current === o.value ? 'rgba(14,165,233,0.15)' : 'var(--t-surface-2)',
          color:      current === o.value ? '#38bdf8' : '#64748b',
          border:     current === o.value ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
        }}>{o.label}</button>
      ))}
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', background:'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{ width:'100%', maxHeight:'85dvh', background:'var(--t-surface)', borderRadius:'20px 20px 0 0', overflow:'hidden', display:'flex', flexDirection:'column', animation:'sc-slideUp 0.25s ease-out' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#1c2433' }}/>
        </div>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:900, color:'#e2e8f0' }}>Advanced Screener</span>
          <button onClick={reset} style={{ fontSize:11, fontWeight:700, color:'#64748b', background:'none', border:'none', cursor:'pointer' }}>Reset all</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'18px 18px 0' }}>
          {section('Price Change', pills(
            [
              {value:'any', label:'Any'}, {value:'gainers', label:'Gainers ▲'},
              {value:'losers', label:'Losers ▼'}, {value:'gt1', label:'>+1%'},
              {value:'gt3', label:'>+3%'}, {value:'gt5', label:'>+5%'},
              {value:'lt1', label:'<-1%'}, {value:'lt3', label:'<-3%'}, {value:'lt5', label:'<-5%'},
            ] as {value: ScreenerFilters['changeMode'], label: string}[],
            local.changeMode, v => up({changeMode: v})
          ))}

          {section('Volume', pills(
            [
              {value:'any', label:'Any'}, {value:'gt1m', label:'>$1M'},
              {value:'gt10m', label:'>$10M'}, {value:'gt100m', label:'>$100M'},
              {value:'gt1b', label:'>$1B'},
            ] as {value: ScreenerFilters['volumeMode'], label: string}[],
            local.volumeMode, v => up({volumeMode: v})
          ))}

          {section('Signal Filter', pills(
            [
              {value:'any',       label:'Any signal'},
              {value:'RSI_OB',    label:'RSI Overbought'},
              {value:'RSI_OS',    label:'RSI Oversold'},
              {value:'NEAR_HIGH', label:'Near 24H High'},
              {value:'NEAR_LOW',  label:'Near 24H Low'},
              {value:'SURGE',     label:'Surge >5%'},
              {value:'DUMP',      label:'Drop <-5%'},
              {value:'VOL_SPIKE', label:'Volume Spike'},
            ] as {value: ScreenerFilters['signal'], label: string}[],
            local.signal, v => up({signal: v})
          ))}
        </div>

        <div style={{ padding:'14px 18px 28px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <button onClick={apply} style={{ width:'100%', padding:'14px 0', borderRadius:14, background:'rgba(14,165,233,0.9)', color:'#e2e8f0', fontSize:14, fontWeight:900, cursor:'pointer', border:'none', boxShadow:'0 4px 16px rgba(14,165,233,0.25)' }}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Live market news strip ───────────────────────────────────────────────────

function MarketNews() {
  const [news, setNews] = useState<MacroNews[]>([])
  useEffect(() => {
    let alive = true
    const load = () => fetchMacroNews().then(n => { if (alive) setNews(n.slice(0, 20)) }).catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  if (news.length === 0) return null
  return (
    <div style={{ marginBottom: 24, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.text1, letterSpacing: '-0.01em' }}>Market News</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'sc-pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text2 }}>Live feed</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {news.map(n => {
          const col = SENT[n.label] ?? C.text3
          return (
            <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{
              flexShrink: 0, width: 'calc(74vw - 16px)', maxWidth: 300, minWidth: 220,
              borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`,
              borderLeft: `4px solid ${col}`, padding: '12px 14px', textDecoration: 'none',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: `0 0 5px ${col}` }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.source}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: `${col}1f`, color: col, textTransform: 'capitalize', flexShrink: 0 }}>{n.label}</span>
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: C.text1, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const { symbols, tickers, setSelectedSymbol } = useTradingStore()
  const navigate = useNavigate()

  const [assetFilter,    setAssetFilter]    = useState<AssetFilter>('all')
  const [sortKey,        setSortKey]        = useState<SortKey>('changePercent')
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('desc')
  const [search,         setSearch]         = useState('')
  const [viewMode,       setViewMode]       = useState<ViewMode>('cards')
  const [showScreener,   setShowScreener]   = useState(false)
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilters>({ changeMode:'any', volumeMode:'any', signal:'any' })

  const goTrade = useCallback((sym: string) => { setSelectedSymbol(sym); navigate('/dashboard') }, [setSelectedSymbol, navigate])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // Build base rows
  const allRows: Row[] = useMemo(() => symbols.map(s => {
    const t = tickers[s.symbol]
    return {
      symbol:s.symbol, name:s.name, assetClass:s.assetClass,
      price:t?.price ?? 0, change:t?.change ?? 0, changePercent:t?.changePercent ?? 0,
      high24h:t?.high24h ?? 0, low24h:t?.low24h ?? 0,
      volume24h:t?.volume24h ?? 0, timestamp:t?.timestamp ?? 0,
    }
  }), [symbols, tickers])

  const avgVolume = useMemo(() => {
    const vols = allRows.map(r => r.volume24h).filter(v => v > 0)
    return vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0
  }, [allRows])

  // Compute signals for all rows
  const rowsWithSignals = useMemo(() =>
    allRows.map(r => ({ row:r, signals:computeSignals(r, avgVolume) })),
    [allRows, avgVolume]
  )

  // Apply all filters
  const filtered = useMemo(() => {
    return rowsWithSignals.filter(({ row, signals }) => {
      if (assetFilter !== 'all' && row.assetClass !== assetFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!row.symbol.toLowerCase().includes(q) && !row.name.toLowerCase().includes(q)) return false
      }
      const chg = row.changePercent, vol = row.volume24h
      const { changeMode, volumeMode, signal } = screenerFilters
      if (changeMode === 'gainers' && chg <= 0) return false
      if (changeMode === 'losers'  && chg >= 0) return false
      if (changeMode === 'gt1'  && chg < 1)  return false
      if (changeMode === 'gt3'  && chg < 3)  return false
      if (changeMode === 'gt5'  && chg < 5)  return false
      if (changeMode === 'lt1'  && chg > -1) return false
      if (changeMode === 'lt3'  && chg > -3) return false
      if (changeMode === 'lt5'  && chg > -5) return false
      if (volumeMode === 'gt1m'   && vol < 1e6)  return false
      if (volumeMode === 'gt10m'  && vol < 1e7)  return false
      if (volumeMode === 'gt100m' && vol < 1e8)  return false
      if (volumeMode === 'gt1b'   && vol < 1e9)  return false
      if (signal !== 'any' && !signals.some(s => s.type === signal)) return false
      return true
    })
  }, [rowsWithSignals, assetFilter, search, screenerFilters])

  // Sort
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sortKey === 'symbol' ? a.row.symbol : (a.row[sortKey as keyof Row] as number)
    const bv = sortKey === 'symbol' ? b.row.symbol : (b.row[sortKey as keyof Row] as number)
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortKey, sortDir])

  // Top movers (from all rows, not filtered)
  const topGainers = useMemo(() =>
    [...allRows].filter(r => r.changePercent > 0).sort((a,b) => b.changePercent - a.changePercent).slice(0, 10),
    [allRows])
  const topLosers = useMemo(() =>
    [...allRows].filter(r => r.changePercent < 0).sort((a,b) => a.changePercent - b.changePercent).slice(0, 10),
    [allRows])
  const mostActive = useMemo(() =>
    [...allRows].sort((a,b) => b.volume24h - a.volume24h).slice(0, 10),
    [allRows])

  const upCount   = allRows.filter(r => r.changePercent > 0).length
  const downCount = allRows.filter(r => r.changePercent < 0).length
  const lastTick  = useMemo(() => {
    let m = 0
    for (const k in tickers) { const ts = tickers[k]?.timestamp ?? 0; if (ts > m) m = ts }
    return m
  }, [tickers])
  const activeFilters = [
    screenerFilters.changeMode !== 'any',
    screenerFilters.volumeMode !== 'any',
    screenerFilters.signal !== 'any',
  ].filter(Boolean).length

  const SortTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => handleSort(k)} style={{ padding:'9px 8px', textAlign:'right', fontSize:9, fontWeight:800, color: sortKey===k ? '#e2e8f0' : '#334155', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap', userSelect:'none' }}>
      {label} {sortKey===k && (sortDir==='asc' ? '↑' : '↓')}
    </th>
  )

  return (
    <div className="theme-dark-scope" style={{ background:'var(--t-bg)', minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes sc-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes sc-slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes sc-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { display:none }
      `}</style>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(0,0,0,0.93)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', padding:'12px 16px 0' }}>
        {/* Title row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#e2e8f0" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span style={{ fontSize:17, fontWeight:900, color:'#e2e8f0', letterSpacing:'-0.02em' }}>Market Scanner</span>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#10b981', animation:'sc-pulse 2s infinite' }}/>
              <span style={{ fontSize:9, fontWeight:900, color:'#10b981', letterSpacing:'0.08em' }}>LIVE</span>
              {lastTick > 0 && (
                <span style={{ fontSize:9, fontWeight:700, color:'#10b981', fontFamily:'monospace', opacity:0.7 }}>
                  · {new Date(lastTick).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
              )}
            </div>
          </div>
          {/* Market breadth */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, fontWeight:800, color:'#10b981', fontFamily:'monospace' }}>▲{upCount}</span>
            <span style={{ fontSize:12, fontWeight:800, color:'#ef4444', fontFamily:'monospace' }}>▼{downCount}</span>
          </div>
        </div>

        {/* Search + view + screener */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'var(--t-surface-2)', borderRadius:12, padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search symbol or name..."
                   style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e2e8f0', fontSize:13 }}/>
            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:14, lineHeight:1 }}>✕</button>}
          </div>
          {/* View toggle */}
          <div style={{ display:'flex', background:'var(--t-surface-2)', borderRadius:10, padding:3, border:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            {(['cards','table'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, transition:'all 0.12s',
                background: viewMode===v ? 'rgba(14,165,233,0.15)' : 'transparent',
                color:      viewMode===v ? '#38bdf8' : '#64748b',
              }}>
                {v === 'cards' ? '☰' : '⊞'}
              </button>
            ))}
          </div>
          {/* Screener */}
          <button onClick={() => setShowScreener(true)} style={{
            display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:10, cursor:'pointer', transition:'all 0.12s', flexShrink:0,
            background: activeFilters > 0 ? 'rgba(14,165,233,0.15)' : 'var(--t-surface-2)',
            color:      activeFilters > 0 ? '#38bdf8' : '#64748b',
            border:     activeFilters > 0 ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
            fontSize:11, fontWeight:800,
          }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Screen{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
        </div>

        {/* Asset class pills */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:12, scrollbarWidth:'none' }}>
          {ASSET_TABS.map(tab => {
            const isActive = assetFilter === tab.key
            return (
              <button key={tab.key} onClick={() => setAssetFilter(tab.key)} style={{
                flexShrink:0, padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                background: isActive ? 'rgba(14,165,233,0.15)' : 'var(--t-surface-2)',
                color:      isActive ? '#38bdf8' : '#64748b',
                border:     isActive ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
              }}>{tab.label}</button>
            )
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, padding:'0 16px', overflowY:'auto' }}>

        {/* Live market news */}
        <MarketNews/>

        {/* Top Gainers */}
        {topGainers.length > 0 && (
          <div style={{ marginBottom:24, marginTop:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.01em' }}>Top Gainers</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#10b981' }}>▲ {upCount} rising</span>
            </div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
              {topGainers.map((r, i) => <MoverCard key={r.symbol} row={r} rank={i+1} onClick={() => goTrade(r.symbol)}/>)}
            </div>
          </div>
        )}

        {/* Top Losers */}
        {topLosers.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.01em' }}>Top Losers</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#ef4444' }}>▼ {downCount} falling</span>
            </div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
              {topLosers.map((r, i) => <MoverCard key={r.symbol} row={r} rank={i+1} onClick={() => goTrade(r.symbol)}/>)}
            </div>
          </div>
        )}

        {/* Most Active */}
        {mostActive.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.01em' }}>Most Active</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#8b5cf6' }}>by volume</span>
            </div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
              {mostActive.map((r, i) => <MoverCard key={r.symbol} row={r} rank={i+1} onClick={() => goTrade(r.symbol)}/>)}
            </div>
          </div>
        )}

        {/* All instruments */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontSize:18, fontWeight:800, color:'#e2e8f0', letterSpacing:'-0.01em' }}>
              All Instruments
              <span style={{ fontSize:13, fontWeight:700, color:'#334155', marginLeft:8 }}>{sorted.length}</span>
            </span>
            {/* Sort pill (compact, mobile) */}
            <select value={sortKey} onChange={e => { setSortKey(e.target.value as SortKey); setSortDir('desc') }}
                    style={{ background:'var(--t-surface-2)', border:'1px solid rgba(255,255,255,0.07)', color:'#64748b', fontSize:10, fontWeight:700, borderRadius:8, padding:'4px 8px', cursor:'pointer', outline:'none' }}>
              <option value="changePercent">Sort: Change %</option>
              <option value="volume24h">Sort: Volume</option>
              <option value="price">Sort: Price</option>
              <option value="high24h">Sort: 24H High</option>
              <option value="symbol">Sort: Symbol</option>
            </select>
          </div>

          {sorted.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 20px', gap:10 }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#334155" strokeWidth={1.3} style={{ display:'block' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>No instruments match your filters</p>
              <button onClick={() => { setScreenerFilters({changeMode:'any',volumeMode:'any',signal:'any'}); setSearch(''); setAssetFilter('all') }}
                      style={{ fontSize:11, fontWeight:700, color:'#64748b', background:'var(--t-surface-2)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>
                Clear filters
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            <div>
              {sorted.map(({ row, signals }, i) => (
                <InstrumentCard key={row.symbol} row={row} signals={signals} onClick={() => goTrade(row.symbol)}/>
              ))}
            </div>
          ) : (
            /* Desktop table */
            <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)', background:'var(--t-surface)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--t-bg)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <th style={{ padding:'9px 10px 9px 14px', textAlign:'left', fontSize:9, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', width:32 }}>#</th>
                    <th style={{ padding:'9px 8px', textAlign:'left', fontSize:9, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>Symbol</th>
                    <th style={{ padding:'9px 8px', textAlign:'left', fontSize:9, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>Type</th>
                    <SortTh k="price"         label="Price"/>
                    <SortTh k="changePercent" label="Change"/>
                    <th style={{ padding:'9px 8px', textAlign:'left', fontSize:9, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', minWidth:130 }}>24H Range</th>
                    <SortTh k="volume24h"     label="Volume"/>
                    <th style={{ padding:'9px 8px', textAlign:'left', fontSize:9, color:'#334155', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em' }}>Signals</th>
                    <th style={{ padding:'9px 14px 9px 8px' }}/>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ row, signals }, i) => (
                    <TableRow key={row.symbol} row={row} signals={signals} rank={i+1} onClick={() => goTrade(row.symbol)}/>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:16, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:10 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'sc-pulse 2s infinite' }}/>
          <span style={{ fontSize:10, color:'#334155' }}>{allRows.length} instruments · Streaming live from WebSocket · Signal engine: RSI, Volume Spike, Range Position</span>
        </div>
      </div>

      {/* ── Screener sheet ───────────────────────────────────────────────── */}
      {showScreener && (
        <ScreenerSheet filters={screenerFilters} onChange={setScreenerFilters} onClose={() => setShowScreener(false)}/>
      )}
    </div>
  )
}
