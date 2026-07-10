import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../../store/tradingStore'
import { formatPrice } from '../../utils/formatters'
import AssetIcon from '../ui/AssetIcon'

type TabId = 'all' | 'crypto' | 'stock' | 'forex' | 'commodity' | 'index' | 'bond'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',       label: 'All'         },
  { id: 'crypto',    label: 'Crypto'      },
  { id: 'stock',     label: 'Stocks'      },
  { id: 'forex',     label: 'Forex'       },
  { id: 'commodity', label: 'Commodities' },
  { id: 'index',     label: 'Indices'     },
  { id: 'bond',      label: 'Bonds'       },
]


interface MarketsPanelProps {
  open: boolean
  onClose: () => void
}

export default function MarketsPanel({ open, onClose }: MarketsPanelProps) {
  const { symbols, tickers, selectedSymbol, setSelectedSymbol } = useTradingStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')

  useEffect(() => {
    if (!open) {
      setSearch('')
      setActiveTab('all')
    }
  }, [open])

  const filteredSymbols = symbols.filter(s => {
    const matchSearch = !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === 'all' || s.assetClass === activeTab
    return matchSearch && matchTab
  })

  const handleSelect = (sym: string) => {
    setSelectedSymbol(sym)
    onClose()
    navigate('/dashboard/trade')
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(10,7,14,0.72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid rgba(176,168,190,0.12)',
          borderBottom: 'none',
          maxHeight: '90dvh',
          boxShadow: '0 -24px 72px rgba(10,7,14,0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(var(--ink),0.18)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <span className="text-text-primary font-semibold text-base">Markets</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'rgba(var(--ink),0.45)', background: 'rgba(var(--ink),0.05)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 pb-3 shrink-0">
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(var(--ink),0.05)', border: '1px solid rgba(176,168,190,0.12)' }}
          >
            <svg className="w-4 h-4 shrink-0" style={{ color: 'rgba(var(--ink),0.35)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--t-text-1)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'rgba(var(--ink),0.35)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 px-4 pb-3 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const count = tab.id === 'all'
              ? symbols.length
              : symbols.filter(s => s.assetClass === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                style={activeTab === tab.id
                  ? { background: 'rgba(79,140,255,0.15)', color: '#4f8cff', border: '1px solid rgba(79,140,255,0.25)' }
                  : { background: 'rgba(var(--ink),0.04)', color: 'rgba(var(--ink),0.45)', border: '1px solid rgba(176,168,190,0.10)' }
                }
              >
                {tab.label}
                <span className="ml-1 text-2xs" style={{ opacity: 0.5 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(var(--ink),0.05)', flexShrink: 0 }} />

        {/* Symbol list */}
        <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          {filteredSymbols.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm" style={{ color: 'rgba(var(--ink),0.35)' }}>
              No markets found
            </div>
          ) : (
            filteredSymbols.map(s => {
              const t = tickers[s.symbol]
              const isUp = (t?.changePercent ?? 0) >= 0
              const isSelected = s.symbol === selectedSymbol
              return (
                <button
                  key={s.symbol}
                  onClick={() => handleSelect(s.symbol)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                  style={{
                    background: isSelected ? 'rgba(79,140,255,0.07)' : 'transparent',
                    borderBottom: '1px solid rgba(176,168,190,0.06)',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--ink),0.03)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex items-center justify-center">
                      <AssetIcon symbol={s.symbol} assetClass={s.assetClass} baseAsset={s.baseAsset} quoteAsset={s.quoteAsset} size={36} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-sm" style={{ color: 'var(--t-text-1)' }}>{s.symbol}</span>
                        {isSelected && (
                          <span
                            className="text-2xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(79,140,255,0.18)', color: '#4f8cff' }}
                          >
                            active
                          </span>
                        )}
                      </div>
                      <span className="text-xs block truncate" style={{ color: 'rgba(var(--ink),0.35)' }}>{s.name}</span>
                    </div>
                  </div>

                  {t ? (
                    <div className="text-right shrink-0 ml-3">
                      <div className="font-mono text-sm font-semibold" style={{ color: 'var(--t-text-1)' }}>
                        {formatPrice(t.price, s.symbol)}
                      </div>
                      <div className={`text-xs font-mono font-semibold ${isUp ? 'text-bull' : 'text-bear'}`}>
                        {isUp ? '+' : ''}{t.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-16 h-9 rounded-lg animate-pulse shrink-0"
                      style={{ background: 'rgba(var(--ink),0.06)' }}
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
