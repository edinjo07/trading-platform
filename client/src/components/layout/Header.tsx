import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../../store/tradingStore'
import { useAuthStore } from '../../store/authStore'
import { formatPrice, formatCurrency } from '../../utils/formatters'
import { useTheme } from '../../context/ThemeContext'

const MORE_LINKS = [
  {
    label: 'Blog',
    path: '/dashboard/blog',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
    description: 'Market insights & analysis',
  },
  {
    label: 'Web TV',
    path: '/dashboard/web-tv',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 3H8M12 3v4" />
      </svg>
    ),
    description: 'Daily video market commentary',
  },
  {
    label: 'Forex Calculators',
    path: '/dashboard/forex-calculators',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M13 3h8v8M13 11L21 3" />
      </svg>
    ),
    description: 'Pip, margin & position size',
  },
  {
    label: 'Trading Scams',
    path: '/dashboard/trading-scams',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    description: 'Protect yourself from scams',
  },
  {
    label: 'Economic Calendar',
    path: '/dashboard/economic-calendar',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    description: 'Upcoming economic events',
  },
]

const TICKER_SYMBOLS = ['BTCUSD', 'ETHUSD', 'US500', 'XAUUSD', 'WTI', 'LMT', 'RTX', 'NOC', 'BRENT', 'EURUSD', 'USDILS', 'USTEC']

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { selectedSymbol, tickers, setSelectedSymbol, portfolio } = useTradingStore()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const ticker = tickers[selectedSymbol]
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (sym: string) => {
    setSelectedSymbol(sym)
    navigate('/dashboard/trade')
  }

  return (
    <header
      className="chrome-dark flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0"
      style={{
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
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

      {/* ── Ticker info strip ── */}
      {ticker ? (
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono overflow-hidden">
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
        <div className="hidden sm:flex gap-2">
          {[48, 32, 32].map((w, i) => (
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

        {/* ── More dropdown (desktop/tablet only — mobile uses sidebar) ── */}
        <div ref={moreRef} className="relative hidden sm:block">
          <button
            onClick={() => setShowMore(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={showMore
              ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            More
            <svg className="w-3 h-3 transition-transform" style={{ transform: showMore ? 'rotate(180deg)' : 'none' }}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showMore && (
            <div className="absolute top-full right-0 mt-1.5 w-56 rounded-xl overflow-hidden z-50"
                 style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
              {MORE_LINKS.map(link => (
                <button
                  key={link.path}
                  onClick={() => { navigate(link.path); setShowMore(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(14,165,233,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="text-text-muted shrink-0">{link.icon}</span>
                  <div>
                    <div className="text-text-primary text-sm font-semibold">{link.label}</div>
                    <div className="text-text-muted text-xs">{link.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0"
          style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.09)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.09)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
