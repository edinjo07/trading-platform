import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice } from '../utils/formatters'
import AssetIconComponent from '../components/ui/AssetIcon'
import MarketsPanel from '../components/trading/MarketsPanel'

// ─── Seeded sparkline ─────────────────────────────────────────────────────────
function seedSparkline(symbol: string, up: boolean, pts = 18): string {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = ((h * 31) + symbol.charCodeAt(i)) >>> 0
  const rng = () => { h = ((h * 1664525) + 1013904223) >>> 0; return h / 4294967295 }
  const W = 64, H = 26; let y = H / 2
  const points: string[] = []
  for (let i = 0; i < pts; i++) {
    const x = (i / (pts - 1)) * W
    y = y + (rng() - 0.48) * 5 + (up ? -0.3 : 0.3)
    y = Math.max(3, Math.min(H - 3, y))
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return points.join(' ')
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({ symbol, name, assetClass, baseAsset, quoteAsset }: {
  symbol: string; name: string; assetClass: string; baseAsset?: string; quoteAsset?: string
}) {
  const { tickers, setSelectedSymbol } = useTradingStore()
  const navigate = useNavigate()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  const price = t?.price ?? 0
  const spread = price * 0.0002
  const bid = price > 0 ? price - spread / 2 : 0
  const ask = price > 0 ? price + spread / 2 : 0
  const pts = useMemo(() => seedSparkline(symbol, up), [symbol, up])

  const fmt = (v: number) => {
    if (!v) return '—'
    if (v >= 10000) return v.toFixed(1)
    if (v >= 100)   return v.toFixed(2)
    if (v >= 1)     return v.toFixed(4)
    return v.toFixed(5)
  }

  const go = () => { setSelectedSymbol(symbol); navigate('/dashboard/trade') }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 6px' }}>
        <div style={{ flexShrink: 0 }}>
          <AssetIconComponent symbol={symbol} assetClass={assetClass} baseAsset={baseAsset} quoteAsset={quoteAsset} size={36} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{symbol}</p>
        </div>
        {t ? (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: up ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
            color: up ? '#00c878' : '#ff3047', flexShrink: 0,
          }}>
            {up ? '+' : ''}{t.changePercent.toFixed(2)}%
          </span>
        ) : (
          <div style={{ width: 48, height: 18, borderRadius: 20, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
        <button onClick={go} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 14px 10px', background: 'rgba(255,48,71,0.08)', border: 'none', cursor: 'pointer', borderTop: '1px solid rgba(255,48,71,0.15)', borderBottomLeftRadius: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff3047', marginBottom: 2 }}>SELL</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#ff3047' }}>{fmt(bid)}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <svg width="64" height="26" viewBox="0 0 64 26">
            <polyline points={pts} fill="none" stroke={up ? '#00c878' : '#ff3047'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <button onClick={go} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '6px 14px 10px', background: 'rgba(14,165,233,0.08)', border: 'none', cursor: 'pointer', borderTop: '1px solid rgba(14,165,233,0.15)', borderBottomRightRadius: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', marginBottom: 2 }}>BUY</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>{fmt(ask)}</span>
        </button>
      </div>
    </div>
  )
}

// ─── Tab config ───────────────────────────────────────────────────────────────
type TabId = 'favourites' | 'popular' | 'crypto' | 'forex' | 'indices' | 'commodities' | 'stocks' | 'bonds'
type SortKey = 'default' | 'gainers' | 'losers' | 'az' | 'za'

const TABS: { id: TabId; label: string; assetClass: string | null }[] = [
  { id: 'favourites',  label: 'Favourites',  assetClass: null },
  { id: 'popular',     label: 'Popular',     assetClass: null },
  { id: 'crypto',      label: 'Crypto',      assetClass: 'crypto' },
  { id: 'forex',       label: 'Forex',       assetClass: 'forex' },
  { id: 'indices',     label: 'Indices',     assetClass: 'index' },
  { id: 'commodities', label: 'Commodities', assetClass: 'commodity' },
  { id: 'stocks',      label: 'Stocks',      assetClass: 'stock' },
  { id: 'bonds',       label: 'Bonds',       assetClass: 'bond' },
]

// Fixed curated lists using the actual server symbol names
const FAVOURITES_LIST = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'US500', 'AAPL', 'NVDA', 'SOLUSD']
const POPULAR_LIST    = ['BTCUSD', 'XAUUSD', 'ETHUSD', 'US500', 'EURUSD', 'SOLUSD', 'NVDA', 'TSLA', 'WTI', 'GBPUSD', 'BNBUSD', 'USDJPY']

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default order' },
  { key: 'gainers', label: 'Top gainers' },
  { key: 'losers',  label: 'Top losers' },
  { key: 'az',      label: 'Name A–Z' },
  { key: 'za',      label: 'Name Z–A' },
]

export default function WatchlistsPage() {
  const { symbols, tickers } = useTradingStore()
  const [activeTab, setActiveTab] = useState<TabId>('favourites')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('default')
  const [showSort, setShowSort] = useState(false)
  const [marketsOpen, setMarketsOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Close sort dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const currentTab = TABS.find(t => t.id === activeTab)!

  // Build base list from store symbols
  const baseList = useMemo(() => {
    if (activeTab === 'favourites') {
      return FAVOURITES_LIST.flatMap(sym => {
        const s = symbols.find(x => x.symbol === sym)
        return s ? [s] : []
      })
    }
    if (activeTab === 'popular') {
      return POPULAR_LIST.flatMap(sym => {
        const s = symbols.find(x => x.symbol === sym)
        return s ? [s] : []
      })
    }
    return symbols.filter(s => s.assetClass === currentTab.assetClass)
  }, [activeTab, symbols, currentTab.assetClass])

  // Search filter
  const filtered = useMemo(() => {
    if (!search) return baseList
    const q = search.toLowerCase()
    return baseList.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [baseList, search])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (sort === 'gainers') arr.sort((a, b) => (tickers[b.symbol]?.changePercent ?? 0) - (tickers[a.symbol]?.changePercent ?? 0))
    if (sort === 'losers')  arr.sort((a, b) => (tickers[a.symbol]?.changePercent ?? 0) - (tickers[b.symbol]?.changePercent ?? 0))
    if (sort === 'az')      arr.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'za')      arr.sort((a, b) => b.name.localeCompare(a.name))
    return arr
  }, [filtered, sort, tickers])

  const handleTabClick = (id: TabId) => {
    setActiveTab(id)
    setSearch('')
    setSort('default')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#000' }}>
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '12px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Search + filter + add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {/* Search input */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '9px 12px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.35)" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: '#f0f0f0', fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Sort/filter button */}
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSort(s => !s)}
              style={{
                width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showSort || sort !== 'default' ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.07)',
                border: showSort || sort !== 'default' ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={showSort || sort !== 'default' ? '#38bdf8' : 'rgba(255,255,255,0.7)'} strokeWidth={1.8}>
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
              </svg>
            </button>

            {showSort && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                width: 186, background: '#141414',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', zIndex: 50,
              }}>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setShowSort(false) }}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left',
                      background: sort === key ? 'rgba(14,165,233,0.1)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer', fontSize: 13,
                      color: sort === key ? '#38bdf8' : 'rgba(255,255,255,0.75)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    {label}
                    {sort === key && (
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add / Markets button */}
          <button
            onClick={() => setMarketsOpen(true)}
            style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.07)',
                color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Instrument count ── */}
      {!search && (
        <div style={{ padding: '8px 14px 2px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {sorted.length} instrument{sorted.length !== 1 ? 's' : ''}
        </div>
      )}
      {search && (
        <div style={{ padding: '8px 14px 2px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{search}"
        </div>
      )}

      {/* ── Asset list ── */}
      <div style={{ flex: 1, padding: '6px 12px 80px' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {search ? `No results for "${search}"` : 'No instruments in this category'}
            </p>
          </div>
        ) : (
          sorted.map(s => (
            <AssetCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.name}
              assetClass={s.assetClass}
              baseAsset={s.baseAsset}
              quoteAsset={s.quoteAsset}
            />
          ))
        )}
      </div>

      <MarketsPanel open={marketsOpen} onClose={() => setMarketsOpen(false)} />
    </div>
  )
}
