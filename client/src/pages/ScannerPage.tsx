import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice, formatCurrency } from '../utils/formatters'
import { Ticker } from '../types'

type SortKey = 'symbol' | 'price' | 'changePercent' | 'high24h' | 'low24h' | 'volume24h'
type AssetFilter = 'all' | 'stock' | 'crypto' | 'forex'

const ASSET_STYLE: Record<string, { bg: string; text: string }> = {
  crypto: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  forex:  { bg: 'rgba(56,189,248,0.12)', text: '#7dd3fc' },
  stock:  { bg: 'rgba(14,165,233,0.12)', text: '#38bdf8' },
}

const FILTER_TABS: { key: AssetFilter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'stock',  label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'forex',  label: 'Forex' },
]

export default function ScannerPage() {
  const { symbols, tickers, setSelectedSymbol } = useTradingStore()
  const navigate = useNavigate()
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('volume24h')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  type Row = Ticker & { name: string; assetClass: string }

  const rows: Row[] = useMemo(() => {
    const filtered = symbols.filter(s => {
      if (assetFilter !== 'all' && s.assetClass !== assetFilter) return false
      if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) &&
          !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    const data: Row[] = filtered.map(s => {
      const t = tickers[s.symbol]
      return {
        symbol: s.symbol, name: s.name, assetClass: s.assetClass,
        price: t?.price ?? 0, change: t?.change ?? 0,
        changePercent: t?.changePercent ?? 0,
        high24h: t?.high24h ?? 0, low24h: t?.low24h ?? 0,
        volume24h: t?.volume24h ?? 0, timestamp: t?.timestamp ?? 0,
      }
    })

    return data.sort((a, b) => {
      const av = sortKey === 'symbol' ? a.symbol : a[sortKey as keyof Row]
      const bv = sortKey === 'symbol' ? b.symbol : b[sortKey as keyof Row]
      const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [symbols, tickers, assetFilter, sortKey, sortDir, search])

  const maxVol = Math.max(...rows.map(r => r.volume24h), 1)

  const SortTh = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: string }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 whitespace-nowrap"
      style={{ textAlign: align as React.CSSProperties['textAlign'] }}
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors">
        {label}
        {sortKey === k && (
          <span className="text-brand-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  )

  const goTrade = (sym: string) => { setSelectedSymbol(sym); navigate('/trade') }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-text-primary font-bold text-xl">Market Scanner</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {rows.length} instrument{rows.length !== 1 ? 's' : ''} · Streaming live
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse2" />
          <span className="text-2xs font-semibold text-bull">LIVE</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        {/* Asset tabs */}
        <div className="flex gap-0.5 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setAssetFilter(tab.key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={assetFilter === tab.key
                ? { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff' }
                : { color: '#6b8099' }
              }>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol or name..."
            className="pl-9 pr-4 py-2 text-sm w-56 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#d4dde8' }}
          />
        </div>

        {/* Summary chips */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-bull font-mono font-semibold">
            ▲ {rows.filter(r => r.changePercent > 0).length} up
          </span>
          <span className="text-bear font-mono font-semibold">
            ▼ {rows.filter(r => r.changePercent < 0).length} down
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto rounded-xl" style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full">
          <thead className="sticky top-0 z-10" style={{ background: '#0c1220', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <tr>
              <SortTh k="symbol" label="Symbol" />
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-text-secondary">Type</th>
              <SortTh k="price"         label="Price"    align="right" />
              <SortTh k="changePercent" label="24H Chg"  align="right" />
              <SortTh k="high24h"       label="24H High" align="right" />
              <SortTh k="low24h"        label="24H Low"  align="right" />
              <SortTh k="volume24h"     label="Volume"   align="right" />
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-text-secondary">Volume Bar</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isUp = row.changePercent >= 0
              const volPct = Math.min((row.volume24h / maxVol) * 100, 100)
              const ac = ASSET_STYLE[row.assetClass]
              return (
                <tr key={row.symbol}
                  className="border-b transition-colors cursor-pointer"
                  style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  onClick={() => goTrade(row.symbol)}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-sm text-text-primary">{row.symbol}</div>
                    <div className="text-2xs text-text-muted mt-0.5">{row.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-2xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: ac?.bg, color: ac?.text }}>
                      {row.assetClass.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-text-primary tabular">
                    {formatPrice(row.price, row.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono text-sm font-semibold tabular ${isUp ? 'text-bull' : 'text-bear'}`}>
                      {isUp ? '+' : ''}{row.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary tabular">
                    {formatPrice(row.high24h, row.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary tabular">
                    {formatPrice(row.low24h, row.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary tabular">
                    {row.volume24h >= 1e9 ? `$${(row.volume24h / 1e9).toFixed(2)}B`
                      : row.volume24h >= 1e6 ? `$${(row.volume24h / 1e6).toFixed(2)}M`
                      : `$${(row.volume24h / 1e3).toFixed(0)}K`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${volPct}%`, background: 'rgba(14,165,233,0.6)' }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); goTrade(row.symbol) }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #0ea5e9, #0369a1)'
                        ;(e.currentTarget as HTMLElement).style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.12)'
                        ;(e.currentTarget as HTMLElement).style.color = '#38bdf8'
                      }}
                    >
                      Trade
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm">No instruments match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
