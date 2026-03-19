import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../../store/tradingStore'
import { useAuthStore } from '../../store/authStore'
import { formatPrice, formatCurrency } from '../../utils/formatters'

const TICKER_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SPX500', 'XAU/USD', 'CRUDE/USD', 'LMT', 'RTX', 'NOC', 'BRENT/USD', 'EUR/USD', 'USD/ILS', 'NAS100']

type TabId = 'all' | 'crypto' | 'stock' | 'forex' | 'commodity' | 'index'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',       label: 'All'         },
  { id: 'crypto',    label: 'Crypto'      },
  { id: 'stock',     label: 'Stocks'      },
  { id: 'forex',     label: 'Forex'       },
  { id: 'commodity', label: 'Commodities' },
  { id: 'index',     label: 'Indices'     },
]

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { selectedSymbol, tickers, setSelectedSymbol, symbols, portfolio } = useTradingStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const ticker = tickers[selectedSymbol]
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const searchRef = useRef<HTMLDivElement>(null)

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearch('')
        setActiveTab('all')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredSymbols = symbols.filter(s => {
    const matchSearch = !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === 'all' || s.assetClass === activeTab
    return matchSearch && matchTab
  })

  const handleSelect = (sym: string) => {
    setSelectedSymbol(sym)
    setShowSearch(false)
    setSearch('')
    setActiveTab('all')
    navigate('/dashboard/trade')
  }

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0"
      style={{
        background: '#080e1a',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        height: '56px',
      }}
    >
      {/* ── Hamburger (mobile/tablet only) ── */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg shrink-0 text-text-secondary hover:text-white hover:bg-white/[0.06] transition-all"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* ── Symbol search ── */}
      <div ref={searchRef} className="relative">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          onClick={() => setShowSearch(s => !s)}
        >
          <svg className="w-3.5 h-3.5 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M8 11h6" />
          </svg>
          <span className="text-text-primary font-mono font-semibold text-sm">{selectedSymbol}</span>
          <svg className="w-3 h-3 text-text-muted ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {showSearch && (
          <div className="absolute top-full left-0 mt-1.5 w-80 rounded-xl overflow-hidden z-50 animate-fadeUp flex flex-col"
               style={{ background: '#0c1420', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', maxHeight: '520px' }}>
            {/* Search input */}
            <div className="p-2.5 border-b border-white/[0.05] shrink-0">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <svg className="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search symbols or names..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-text-muted hover:text-text-primary transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 px-2 py-2 border-b border-white/[0.05] shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(tab => {
                const count = tab.id === 'all' ? symbols.length : symbols.filter(s => s.assetClass === tab.id).length
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                    style={activeTab === tab.id
                      ? { background: 'rgba(14,165,233,0.15)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
                    }
                  >
                    {tab.label}
                    <span className="ml-1 text-2xs opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Symbol list */}
            <div className="overflow-y-auto flex-1">
              {filteredSymbols.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-muted text-sm">No symbols found</div>
              ) : (
                filteredSymbols.map(s => {
                  const t = tickers[s.symbol]
                  const isUp = (t?.changePercent ?? 0) >= 0
                  const isSelected = s.symbol === selectedSymbol
                  const assetIcon: Record<string, string> = {
                    crypto: '₿', stock: '📈', forex: '💱', commodity: '🪙', index: '📊'
                  }
                  return (
                    <button key={s.symbol} onClick={() => handleSelect(s.symbol)}
                      className="w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left"
                      style={isSelected
                        ? { background: 'rgba(14,165,233,0.08)' }
                        : undefined
                      }
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base leading-none shrink-0">{assetIcon[s.assetClass] ?? '·'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-primary font-mono font-semibold text-sm">{s.symbol}</span>
                            {isSelected && (
                              <span className="text-2xs px-1 rounded" style={{ background: 'rgba(14,165,233,0.2)', color: '#0ea5e9' }}>active</span>
                            )}
                          </div>
                          <span className="text-text-muted text-xs truncate block">{s.name}</span>
                        </div>
                      </div>
                      {t ? (
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-text-primary font-mono text-xs">{formatPrice(t.price, s.symbol)}</div>
                          <div className={`text-xs font-mono font-semibold ${isUp ? 'text-bull' : 'text-bear'}`}>
                            {isUp ? '+' : ''}{t.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-4 rounded animate-pulse shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Ticker info strip ── */}
      {ticker ? (
        <div className="flex items-center gap-4 text-xs font-mono overflow-hidden">
          <span className="text-text-primary font-semibold text-base shrink-0">
            {formatPrice(ticker.price, selectedSymbol)}
          </span>
          <span className={`font-semibold text-sm shrink-0 ${ticker.changePercent >= 0 ? 'text-bull' : 'text-bear'}`}>
            {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
          </span>
          {[
            { label: '24H High', value: formatPrice(ticker.high24h, selectedSymbol) },
            { label: '24H Low',  value: formatPrice(ticker.low24h, selectedSymbol) },
            { label: 'Volume',   value: ticker.volume24h >= 1e9
                ? `${(ticker.volume24h / 1e9).toFixed(2)}B`
                : ticker.volume24h >= 1e6 ? `${(ticker.volume24h / 1e6).toFixed(2)}M`
                : `${(ticker.volume24h / 1e3).toFixed(0)}K`
            },
          ].map(item => (
            <div key={item.label} className="hidden md:flex items-center gap-1 shrink-0">
              <span className="text-text-muted">{item.label}</span>
              <span className="text-text-secondary">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          {[48, 32, 32, 28, 28].map((w, i) => (
            <div key={i} className="h-4 rounded animate-pulse" style={{ width: `${w}px`, background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      )}

      {/* ── Scrolling ticker tape (desktop) ── */}
      <div className="hidden xl:flex flex-1 overflow-hidden mx-4">
        <div className="flex items-center gap-6 text-xs font-mono animate-none overflow-hidden">
          {TICKER_SYMBOLS.map(sym => {
            const t = tickers[sym]
            if (!t) return null
            const up = t.changePercent >= 0
            return (
              <button key={sym} onClick={() => handleSelect(sym)}
                className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
                <span className="text-text-secondary">{sym}</span>
                <span className="text-text-primary">{formatPrice(t.price, sym)}</span>
                <span className={`${up ? 'text-bull' : 'text-bear'}`}>
                  {up ? '▲' : '▼'} {Math.abs(t.changePercent).toFixed(2)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
             style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse2" />
          <span className="text-2xs font-semibold text-bull">LIVE</span>
        </div>

        {/* Balance chip */}
        <div className="hidden sm:block px-3 py-1.5 rounded-lg text-xs"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-text-secondary">Balance </span>
          <span className="text-text-primary font-mono font-semibold">{formatCurrency(portfolio?.cashBalance ?? user?.balance ?? 0)}</span>
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            {user?.username?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>

        {/* Logout */}
        <button onClick={logout}
          className="text-text-muted hover:text-bear transition-colors p-1.5 rounded hover:bg-bear-dim">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  )
}
