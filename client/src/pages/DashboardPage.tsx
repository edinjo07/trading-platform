import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { useAlertsStore } from '../store/alertsStore'
import { useTheme } from '../context/ThemeContext'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { getAccountsList, createAccountApi, depositDemo, type AccountRow } from '../api/accounts'
import type { Position, AccountMode, Currency, AccountType } from '../types'
import AssetIcon from '../components/ui/AssetIcon'

// ─── Seeded sparkline ─────────────────────────────────────────────────────────
function seedSparkline(symbol: string, up: boolean, pts = 16): string {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = ((h * 31) + symbol.charCodeAt(i)) >>> 0
  const rng = () => { h = ((h * 1664525) + 1013904223) >>> 0; return h / 4294967295 }
  const W = 56, H = 24; let y = H / 2
  const points: string[] = []
  for (let i = 0; i < pts; i++) {
    const x = (i / (pts - 1)) * W
    y = y + (rng() - 0.47) * 4 + (up ? -0.25 : 0.25)
    y = Math.max(2, Math.min(H - 2, y))
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return points.join(' ')
}


// ─── Position card (Capital.com portfolio style) ───────────────────────────────
function PositionCard({ pos, onClose }: { pos: Position; onClose: () => void }) {
  const isLong = pos.side === 'long'
  const pnlColor = pos.unrealizedPnl >= 0 ? '#00c878' : '#ff3047'
  return (
    <div style={{
      background: 'rgba(var(--ink),0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'rgb(var(--ink))' }}>{pos.symbol}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: isLong ? 'rgba(0,200,120,0.15)' : 'rgba(255,48,71,0.15)',
            color: isLong ? '#00c878' : '#ff3047',
          }}>{isLong ? 'BUY' : 'SELL'}</span>
          {pos.leverage > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(var(--ink),0.08)', color: 'rgba(var(--ink),0.6)' }}>
              {pos.leverage}x
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: pnlColor, fontFamily: 'monospace' }}>
          {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {[
          { l: 'Units', v: pos.quantity.toFixed(pos.quantity < 1 ? 4 : 2) },
          { l: 'Open', v: formatPrice(pos.avg_price, pos.symbol) },
          { l: 'Current', v: formatPrice(pos.currentPrice, pos.symbol) },
        ].map(({ l, v }) => (
          <div key={l}>
            <p style={{ fontSize: 10, color: 'rgba(var(--ink),0.4)', marginBottom: 2 }}>{l}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--ink))', fontFamily: 'monospace' }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(var(--ink),0.4)' }}>P&L %</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: pnlColor, fontFamily: 'monospace' }}>
              {pos.unrealizedPnlPct >= 0 ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(var(--ink),0.4)' }}>Margin</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(var(--ink),0.7)', fontFamily: 'monospace' }}>{formatCurrency(pos.margin)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '7px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: 'rgba(255,48,71,0.12)', color: '#ff3047',
            border: '1px solid rgba(255,48,71,0.3)', cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Market ticker row (movers list) ──────────────────────────────────────────
function MoverRow({ symbol, name, assetClass, onClick }: { symbol: string; name: string; assetClass?: string; onClick: () => void }) {
  const { tickers } = useTradingStore()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  const pts = useMemo(() => seedSparkline(symbol, up), [symbol, up])
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <AssetIcon symbol={symbol} assetClass={assetClass ?? 'stock'} size={40} />
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 10, color: 'rgba(var(--ink),0.4)', margin: 0 }}>{symbol}</p>
      </div>
      <svg width="56" height="24" viewBox="0 0 56 24">
        <polyline points={pts} fill="none" stroke={up ? '#00c878' : '#ff3047'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign: 'right', minWidth: 70 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0, fontFamily: 'monospace' }}>
          {t ? formatPrice(t.price, symbol) : '—'}
        </p>
        <p style={{ fontSize: 11, fontWeight: 600, color: up ? '#00c878' : '#ff3047', margin: 0 }}>
          {t ? (up ? '+' : '') + t.changePercent.toFixed(2) + '%' : '—'}
        </p>
      </div>
    </button>
  )
}

// ─── Most traded icon tile ─────────────────────────────────────────────────────
function TradedTile({ symbol, name, assetClass, onClick }: { symbol: string; name: string; assetClass?: string; onClick: () => void }) {
  const { tickers } = useTradingStore()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 8px', borderRadius: 14, background: 'rgba(var(--ink),0.03)',
        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
      }}
    >
      <AssetIcon symbol={symbol} assetClass={assetClass ?? 'stock'} size={44} />
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
        {name.split('/')[0]}
      </p>
      <p style={{ fontSize: 10, fontWeight: 700, color: up ? '#00c878' : '#ff3047', margin: 0 }}>
        {t ? (up ? '+' : '') + t.changePercent.toFixed(2) + '%' : '—'}
      </p>
    </button>
  )
}

// ─── Curated watchlist card ───────────────────────────────────────────────────
const CATEGORIES = [
  {
    label: 'Energy',
    gradient: 'linear-gradient(145deg, #0f2318 0%, #071a0e 100%)',
    accent: '#22c55e',
    img: (
      <svg width="52" height="52" fill="none" viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#22c55e" fillOpacity=".15" stroke="#22c55e" strokeWidth={1.5} strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Gas & Oil',
    gradient: 'linear-gradient(145deg, #0e1829 0%, #070f1d 100%)',
    accent: '#38bdf8',
    img: (
      <svg width="52" height="52" fill="none" viewBox="0 0 24 24">
        <ellipse cx="12" cy="16" rx="6" ry="4" fill="#38bdf8" fillOpacity=".12" stroke="#38bdf8" strokeWidth={1.4}/>
        <path d="M6 16V9a6 6 0 0112 0v7" stroke="#38bdf8" strokeWidth={1.4} strokeLinecap="round"/>
        <path d="M16 6.5c1 .5 2 1.5 2 3" stroke="#38bdf8" strokeWidth={1.2} strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },
  {
    label: 'Big Tech',
    gradient: 'linear-gradient(145deg, #1a0f2e 0%, #110820 100%)',
    accent: '#a78bfa',
    img: (
      <svg width="52" height="52" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="13" rx="2" fill="#a78bfa" fillOpacity=".1" stroke="#a78bfa" strokeWidth={1.4}/>
        <path d="M8 21h8M12 16v5" stroke="#a78bfa" strokeWidth={1.4} strokeLinecap="round"/>
        <path d="M7 8h2M11 8h6M7 11h4" stroke="#a78bfa" strokeWidth={1.2} strokeLinecap="round" opacity=".6"/>
      </svg>
    ),
  },
  {
    label: 'Crypto',
    gradient: 'linear-gradient(145deg, #1f1208 0%, #150c04 100%)',
    accent: '#f59e0b',
    img: (
      <svg width="52" height="52" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="#f59e0b" fillOpacity=".1" stroke="#f59e0b" strokeWidth={1.4}/>
        <path d="M9 8h4.5a2 2 0 010 4H9m0-4v4m0 0h5a2 2 0 010 4H9m0-4v4" stroke="#f59e0b" strokeWidth={1.3} strokeLinecap="round"/>
        <line x1="11" y1="7" x2="11" y2="8" stroke="#f59e0b" strokeWidth={1.3} strokeLinecap="round"/>
        <line x1="11" y1="16" x2="11" y2="17" stroke="#f59e0b" strokeWidth={1.3} strokeLinecap="round"/>
      </svg>
    ),
  },
]

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onMore }: { title: string; onMore?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0 }}>{title}</h2>
      {onMore && (
        <button
          onClick={onMore}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(var(--ink),0.4)' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ─── Discover markets grid ────────────────────────────────────────────────────
const DISCOVER = [
  {
    label: 'Shares', path: '/dashboard/watchlists',
    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="4" height="8" rx="1" fill="#60a5fa" fillOpacity=".2"/>
        <rect x="10" y="6" width="4" height="12" rx="1" fill="#60a5fa" fillOpacity=".2"/>
        <rect x="18" y="4" width="4" height="14" rx="1" fill="#60a5fa" fillOpacity=".2"/>
        <polyline points="2 18 8 10 14 14 22 6" stroke="#60a5fa" strokeWidth={1.8}/>
      </svg>
    ),
  },
  {
    label: 'Indices', path: '/dashboard/watchlists',
    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={1.6} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" stroke="#a78bfa" strokeWidth={1.5}/>
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="#a78bfa" strokeWidth={1.2} opacity=".5"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="#a78bfa" strokeWidth={1.2} opacity=".5"/>
        <line x1="12" y1="3" x2="12" y2="21" stroke="#a78bfa" strokeWidth={1.2} opacity=".5"/>
      </svg>
    ),
  },
  {
    label: 'Commodities', path: '/dashboard/watchlists',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.6} strokeLinecap="round">
        <ellipse cx="12" cy="17" rx="7" ry="3.5" fill="#f59e0b" fillOpacity=".12"/>
        <path d="M5 17V9a7 7 0 0114 0v8" stroke="#f59e0b" strokeWidth={1.5}/>
        <path d="M17 8c.8.7 1.5 1.8 1.5 3" stroke="#f59e0b" strokeWidth={1.2} opacity=".6"/>
      </svg>
    ),
  },
  {
    label: 'Forex', path: '/dashboard/watchlists',
    color: '#34d399', bg: 'rgba(52,211,153,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={1.6} strokeLinecap="round">
        <circle cx="8" cy="12" r="5.5" stroke="#34d399" strokeWidth={1.5}/>
        <circle cx="16" cy="12" r="5.5" stroke="#34d399" strokeWidth={1.5} opacity=".5"/>
        <path d="M6.5 9.5h3m-3 3h3" stroke="#34d399" strokeWidth={1.3}/>
        <path d="M15 9.5c.5-.3 1-.5 1.5-.5a2 2 0 010 4 2 2 0 000 4" stroke="#34d399" strokeWidth={1.3}/>
      </svg>
    ),
  },
  {
    label: 'ETF', path: '/dashboard/watchlists',
    color: '#fb923c', bg: 'rgba(251,146,60,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fb923c" strokeWidth={1.6} strokeLinecap="round">
        <path d="M12 3L12 21M3 12l9-9 9 9" stroke="#fb923c" strokeWidth={0} />
        <path d="M12 2a10 10 0 010 20" stroke="#fb923c" strokeWidth={1.5} strokeDasharray="4 2"/>
        <circle cx="12" cy="12" r="3.5" fill="#fb923c" fillOpacity=".15" stroke="#fb923c" strokeWidth={1.5}/>
        <path d="M12 2a10 10 0 000 20" stroke="#fb923c" strokeWidth={1.5} opacity=".4"/>
        <line x1="12" y1="8.5" x2="12" y2="2" stroke="#fb923c" strokeWidth={1.4}/>
        <line x1="15.5" y1="15.5" x2="20" y2="20" stroke="#fb923c" strokeWidth={1.4}/>
        <line x1="8.5" y1="15.5" x2="4" y2="20" stroke="#fb923c" strokeWidth={1.4}/>
      </svg>
    ),
  },
  {
    label: 'Cryptos', path: '/dashboard/watchlists',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" fill="#f59e0b" fillOpacity=".1" stroke="#f59e0b" strokeWidth={1.5}/>
        <path d="M9.5 8.5H13a2 2 0 010 4H9.5v-4zm0 4H14a2 2 0 010 4H9.5v-4z" stroke="#f59e0b" strokeWidth={1.3} strokeLinejoin="round"/>
        <line x1="11" y1="7" x2="11" y2="8.5" stroke="#f59e0b" strokeWidth={1.3}/>
        <line x1="11" y1="16.5" x2="11" y2="18" stroke="#f59e0b" strokeWidth={1.3}/>
        <line x1="13" y1="7" x2="13" y2="8.5" stroke="#f59e0b" strokeWidth={1.3}/>
        <line x1="13" y1="16.5" x2="13" y2="18" stroke="#f59e0b" strokeWidth={1.3}/>
      </svg>
    ),
  },
]

// ─── Account switcher options ─────────────────────────────────────────────────
const ACCOUNTS: { id: string; label: string; sub: string; mode: AccountMode; currency: Currency }[] = [
  { id: 'demo-usd', label: 'Demo Account', sub: 'USD · Practice money',  mode: 'demo', currency: 'USD' },
  { id: 'real-usd', label: 'Real Account', sub: 'USD · Live trading',    mode: 'real', currency: 'USD' },
  { id: 'demo-eur', label: 'Demo Account', sub: 'EUR · Practice money',  mode: 'demo', currency: 'EUR' },
  { id: 'real-eur', label: 'Real Account', sub: 'EUR · Live trading',    mode: 'real', currency: 'EUR' },
  { id: 'demo-gbp', label: 'Demo Account', sub: 'GBP · Practice money',  mode: 'demo', currency: 'GBP' },
  { id: 'real-gbp', label: 'Real Account', sub: 'GBP · Live trading',    mode: 'real', currency: 'GBP' },
]

// ─── Symbols lists ────────────────────────────────────────────────────────────
const MOST_TRADED = [
  { symbol: 'XAUUSD', name: 'Gold',        assetClass: 'commodity' },
  { symbol: 'US100',  name: 'US Tech 100', assetClass: 'index'     },
  { symbol: 'WTI',    name: 'Oil–Crude',   assetClass: 'commodity' },
  { symbol: 'XAGUSD', name: 'Silver',      assetClass: 'commodity' },
  { symbol: 'ETHUSD', name: 'ETH/USD',     assetClass: 'crypto'    },
  { symbol: 'US30',   name: 'US Wall St',  assetClass: 'index'     },
  { symbol: 'BTCUSD', name: 'BTC/USD',     assetClass: 'crypto'    },
  { symbol: 'EURUSD', name: 'EUR/USD',     assetClass: 'forex'     },
]

const MOVERS = [
  { symbol: 'BTCUSD', name: 'Bitcoin/USD',  assetClass: 'crypto'    },
  { symbol: 'XAUUSD', name: 'Gold',         assetClass: 'commodity' },
  { symbol: 'US500',  name: 'US 500',       assetClass: 'index'     },
  { symbol: 'ETHUSD', name: 'Ethereum/USD', assetClass: 'crypto'    },
  { symbol: 'EURUSD', name: 'EUR/USD',      assetClass: 'forex'     },
]

const WATCHLIST_SYMBOLS = [
  { symbol: 'BTCUSD', name: 'Bitcoin',     assetClass: 'crypto'    },
  { symbol: 'ETHUSD', name: 'Ethereum',    assetClass: 'crypto'    },
  { symbol: 'SOLUSD', name: 'Solana',      assetClass: 'crypto'    },
  { symbol: 'XAUUSD', name: 'Gold',        assetClass: 'commodity' },
  { symbol: 'EURUSD', name: 'EUR/USD',     assetClass: 'forex'     },
  { symbol: 'AAPL',   name: 'Apple',       assetClass: 'stock'     },
  { symbol: 'NVDA',   name: 'Nvidia',      assetClass: 'stock'     },
  { symbol: 'TSLA',   name: 'Tesla',       assetClass: 'stock'     },
  { symbol: 'MSFT',   name: 'Microsoft',   assetClass: 'stock'     },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, setAccountMode, setCurrency } = useAuthStore()
  const { tickers, portfolio, orders, loadPortfolio, loadOrders, closePosition, setSelectedSymbol } = useTradingStore()
  const { alerts } = useAlertsStore()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [closingId,        setClosingId]        = useState<string | null>(null)
  const [moversTab,        setMoversTab]        = useState<'risers' | 'fallers'>('risers')
  const [showSwitcher,     setShowSwitcher]     = useState(false)
  const [switcherPage,     setSwitcherPage]     = useState<'list' | 'create'>('list')
  const [existingAccounts, setExistingAccounts] = useState<AccountRow[]>([])
  // Create-account form state
  const [createMode,        setCreateMode]        = useState<AccountMode>('demo')
  const [createCurrency,    setCreateCurrency]    = useState<Currency>('USD')
  const [createAccountType, setCreateAccountType] = useState<AccountType>('raw_spread')
  const [creating,          setCreating]          = useState(false)
  const [createError,       setCreateError]       = useState('')
  const [createdNumber,     setCreatedNumber]     = useState<number | null>(null)

  // Deposit sheet state
  const [showDeposit,     setShowDeposit]     = useState(false)
  const [depositCurrency, setDepositCurrency] = useState<Currency>('USD')
  const [depositing,      setDepositing]      = useState(false)
  const [depositError,    setDepositError]    = useState('')

  const currencySymbol = (c: string) => c === 'EUR' ? '€' : c === 'GBP' ? '£' : '$'

  const refreshAccounts = () => getAccountsList().then(rows => setExistingAccounts(rows)).catch(() => {})

  useEffect(() => { refreshAccounts() }, [])

  const openSwitcher = () => { setSwitcherPage('list'); setCreateError(''); setCreatedNumber(null); setShowSwitcher(true) }
  const closeSwitcher = () => { setShowSwitcher(false); setSwitcherPage('list') }

  const handleSelectAccount = async (acct: typeof ACCOUNTS[0]) => {
    closeSwitcher()
    await Promise.all([setAccountMode(acct.mode), setCurrency(acct.currency)])
    loadPortfolio()
    refreshAccounts()
  }

  const handleCreateAccount = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const result = await createAccountApi({ mode: createMode, currency: createCurrency, accountType: createAccountType })
      setCreatedNumber(result.account_number)
      await refreshAccounts()
      // Auto-switch to the new account
      await Promise.all([setAccountMode(createMode), setCurrency(createCurrency)])
      loadPortfolio()
      setTimeout(closeSwitcher, 1800)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string } } })?.response?.data
      setCreateError(d?.error ?? 'Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  const visibleAccounts = useMemo(() => {
    if (existingAccounts.length === 0) return ACCOUNTS  // fallback while loading
    return ACCOUNTS.filter(a =>
      existingAccounts.some(r => r.mode === a.mode && r.currency === a.currency)
    )
  }, [existingAccounts])

  const handleDeposit = useCallback(async (amount: number) => {
    setDepositing(true)
    setDepositError('')
    try {
      await depositDemo(depositCurrency, amount)
      await refreshAccounts()
      if (user?.accountMode === 'demo' && (user?.currency ?? 'USD') === depositCurrency) loadPortfolio()
      setShowDeposit(false)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string } } })?.response?.data
      setDepositError(d?.error ?? 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }, [depositCurrency, user, loadPortfolio])

  useEffect(() => {
    loadPortfolio(); loadOrders()
    const id = setInterval(loadPortfolio, 6000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders])

  const equity = portfolio?.totalEquity ?? user?.balance ?? 0
  const cash   = portfolio?.cashBalance ?? user?.balance ?? 0
  const positions = portfolio?.positions ?? []
  const recentOrders = orders.slice(0, 3)

  const handleClose = useCallback(async (id: string) => {
    setClosingId(id)
    try { await closePosition(id) } finally { setClosingId(null) }
  }, [closePosition])

  const goTrade = useCallback((sym: string) => {
    setSelectedSymbol(sym); navigate('/dashboard/trade')
  }, [setSelectedSymbol, navigate])

  // Sort movers by changePercent
  const sortedMovers = useMemo(() => {
    return [...MOVERS].sort((a, b) => {
      const ta = tickers[a.symbol], tb = tickers[b.symbol]
      const ca = ta?.changePercent ?? 0, cb = tb?.changePercent ?? 0
      return moversTab === 'risers' ? cb - ca : ca - cb
    })
  }, [tickers, moversTab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: isDark ? '#000' : '#f0f4f9' }}>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, paddingBottom: 100 }}>

        {/* ── Account card (Capital.com style) ── */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(160,110,0,0.22) 0%, transparent 90%)',
          padding: '20px 16px 0',
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(var(--ink),0.55)', fontWeight: 500 }}>Account (CFD)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Profile icon */}
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--ink),0.09)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Profile"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.75)' }} strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </button>
                {/* Switch account */}
                <button
                  onClick={openSwitcher}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(var(--ink),0.09)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(var(--ink),0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>
                  </svg>
                  Switch
                </button>
              </div>
            </div>

            {/* ── Account mode badge + account number ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12, background: user?.accountMode === 'real' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${user?.accountMode === 'real' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: user?.accountMode === 'real' ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: user?.accountMode === 'real' ? '#10b981' : '#f59e0b' }}>
                  {user?.accountMode === 'real' ? 'Live' : 'Demo'} · {user?.currency ?? 'USD'}
                </span>
              </div>
              {portfolio?.accountNumber ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(var(--ink),0.35)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  #{portfolio.accountNumber}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'rgb(var(--ink))', fontFamily: 'monospace', letterSpacing: '-1px', marginBottom: 16 }}>
              {formatCurrency(equity, 2, user?.currency ?? 'USD')}
            </div>
            <div style={{ background: 'rgba(var(--ink),0.06)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(var(--ink),0.5)' }}>Available to trade</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', fontFamily: 'monospace' }}>{formatCurrency(cash, 2, user?.currency ?? 'USD')}</span>
            </div>
          </div>

          {/* ── Account switcher / creator bottom sheet ── */}
          {showSwitcher && (
            <div
              onClick={closeSwitcher}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', background: 'var(--sheet)', borderRadius: '22px 22px 0 0', padding: '16px 16px 40px', maxHeight: '85vh', overflowY: 'auto' }}
              >
                {/* Handle */}
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.18)', margin: '0 auto 20px' }} />

                {/* ── List page ── */}
                {switcherPage === 'list' && (<>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 4, textAlign: 'center' }}>Switch Account</h3>
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', textAlign: 'center', marginBottom: 20 }}>Select the account you want to trade with</p>

                  {visibleAccounts.map(acct => {
                    const isActive = user?.accountMode === acct.mode && (user?.currency ?? 'USD') === acct.currency
                    const isLive   = acct.mode === 'real'
                    const row      = existingAccounts.find(r => r.mode === acct.mode && r.currency === acct.currency)
                    return (
                      <button
                        key={acct.id}
                        onClick={() => handleSelectAccount(acct)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                          background: isActive ? 'rgba(14,165,233,0.08)' : 'rgba(var(--ink),0.04)',
                          border: `1px solid ${isActive ? 'rgba(14,165,233,0.3)' : 'rgba(var(--ink),0.08)'}`,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {/* Icon */}
                        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: isLive ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isLive
                            ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                            : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          }
                        </div>
                        {/* Labels */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 2 }}>{acct.label}</div>
                          <div style={{ fontSize: 12, color: 'rgba(var(--ink),0.45)' }}>{acct.sub}</div>
                          {row?.account_number ? (
                            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(var(--ink),0.28)', marginTop: 2 }}>
                              #{row.account_number}
                            </div>
                          ) : null}
                        </div>
                        {/* Active checkmark */}
                        {isActive && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* Create Account button */}
                  <button
                    onClick={() => { setSwitcherPage('create'); setCreateError(''); setCreatedNumber(null) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: 'rgba(14,165,233,0.07)', border: '1px dashed rgba(14,165,233,0.3)', color: '#38bdf8', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4, marginBottom: 8 }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Account
                  </button>

                  <button
                    onClick={closeSwitcher}
                    style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(var(--ink),0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(var(--ink),0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </>)}

                {/* ── Create page ── */}
                {switcherPage === 'create' && (<>
                  {/* Header with back */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <button
                      onClick={() => setSwitcherPage('list')}
                      style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.7)' }} strokeWidth={2.2}><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'rgb(var(--ink))' }}>Create Account</div>
                      <div style={{ fontSize: 11, color: 'rgba(var(--ink),0.4)' }}>Each account has a unique account number</div>
                    </div>
                  </div>

                  {/* Success state */}
                  {createdNumber ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,200,120,0.12)', border: '1px solid rgba(0,200,120,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00c878" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 6 }}>Account Created</div>
                      <div style={{ fontSize: 13, color: 'rgba(var(--ink),0.5)', marginBottom: 12 }}>Your account number is</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: 'rgb(var(--ink))', fontFamily: 'monospace', letterSpacing: 1 }}>#{createdNumber}</div>
                      <div style={{ fontSize: 11, color: 'rgba(var(--ink),0.35)', marginTop: 8 }}>Keep this number for support enquiries</div>
                    </div>
                  ) : (<>
                    {/* Demo / Real toggle */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Account Type</div>
                      <div style={{ display: 'flex', gap: 8, background: 'rgba(var(--ink),0.04)', borderRadius: 12, padding: 4 }}>
                        {(['demo', 'real'] as AccountMode[]).map(m => (
                          <button
                            key={m}
                            onClick={() => setCreateMode(m)}
                            style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                              background: createMode === m ? (m === 'real' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)') : 'transparent',
                              color: createMode === m ? (m === 'real' ? '#10b981' : '#f59e0b') : 'rgba(var(--ink),0.4)',
                              border: createMode === m ? `1px solid ${m === 'real' ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}` : '1px solid transparent',
                            }}
                          >
                            {m === 'real' ? 'Live' : 'Demo'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Currency */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Currency</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {([
                          { key: 'USD', symbol: '$', name: 'US Dollar' },
                          { key: 'EUR', symbol: '€', name: 'Euro' },
                          { key: 'GBP', symbol: '£', name: 'Pound' },
                        ] as { key: Currency; symbol: string; name: string }[]).map(c => (
                          <button
                            key={c.key}
                            onClick={() => setCreateCurrency(c.key)}
                            style={{ flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                              background: createCurrency === c.key ? 'rgba(14,165,233,0.1)' : 'rgba(var(--ink),0.04)',
                              border: `1px solid ${createCurrency === c.key ? 'rgba(14,165,233,0.35)' : 'rgba(var(--ink),0.08)'}`,
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 800, color: createCurrency === c.key ? '#38bdf8' : 'rgba(var(--ink),0.4)', marginBottom: 2 }}>{c.symbol}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: createCurrency === c.key ? 'rgb(var(--ink))' : 'rgba(var(--ink),0.5)' }}>{c.key}</div>
                            <div style={{ fontSize: 9, color: 'rgba(var(--ink),0.3)', marginTop: 1 }}>{c.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account type */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Account Plan</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {([
                          { key: 'raw_spread', label: 'Raw Spread', sub: '$3.50 / lot · 0.0 pip spread', popular: true },
                          { key: 'ctrader',    label: 'cTrader',    sub: '$3 / 100k · 0.0 pip spread',  popular: false },
                          { key: 'standard',   label: 'Standard',   sub: '$0 commission · 0.8 pip spread', popular: false },
                        ] as { key: AccountType; label: string; sub: string; popular: boolean }[]).map(t => (
                          <button
                            key={t.key}
                            onClick={() => setCreateAccountType(t.key)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                              background: createAccountType === t.key ? 'rgba(14,165,233,0.08)' : 'rgba(var(--ink),0.04)',
                              border: `1px solid ${createAccountType === t.key ? 'rgba(14,165,233,0.3)' : 'rgba(var(--ink),0.08)'}`,
                            }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: createAccountType === t.key ? '#0ea5e9' : 'rgba(var(--ink),0.15)', border: createAccountType === t.key ? '2px solid rgba(14,165,233,0.5)' : '2px solid rgba(255,255,255,0.15)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))' }}>{t.label}</span>
                                {t.popular && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }}>POPULAR</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(var(--ink),0.4)', marginTop: 2 }}>{t.sub}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Starting balance note */}
                    <div style={{ background: 'rgba(var(--ink),0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.4)' }} strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span style={{ fontSize: 11, color: 'rgba(var(--ink),0.4)' }}>
                        {createMode === 'demo' ? 'Demo accounts start with $100,000 practice balance' : 'Real accounts require a deposit after creation'}
                      </span>
                    </div>

                    {createError && (
                      <div style={{ background: 'rgba(220,56,38,0.1)', border: '1px solid rgba(220,56,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#ff6b6b' }}>
                        {createError}
                      </div>
                    )}

                    <button
                      onClick={handleCreateAccount}
                      disabled={creating}
                      style={{ width: '100%', padding: '14px', borderRadius: 14, background: creating ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.9)', color: 'rgb(var(--ink))', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {creating ? (
                        <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.3)' }} strokeWidth="3"/><path fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>Creating…</>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </>)}
                </>)}
              </div>
            </div>
          )}

          {/* ── Deposit bottom sheet ── */}
          {showDeposit && (
            <div
              onClick={() => setShowDeposit(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', background: 'var(--sheet)', borderRadius: '22px 22px 0 0', padding: '16px 16px 48px', maxHeight: '75vh', overflowY: 'auto' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.18)', margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 4, textAlign: 'center' }}>Deposit Funds</h3>
                <p style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', textAlign: 'center', marginBottom: 24 }}>
                  Demo account · {depositCurrency}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                  {[5000, 10000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => handleDeposit(amt)}
                      disabled={depositing}
                      style={{ padding: '16px 12px', borderRadius: 14, background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)', cursor: depositing ? 'not-allowed' : 'pointer', textAlign: 'center' }}
                    >
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#00c878', fontFamily: 'monospace' }}>
                        {currencySymbol(depositCurrency)}{amt.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(var(--ink),0.35)', marginTop: 3 }}>+{amt.toLocaleString()} {depositCurrency}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleDeposit(100000)}
                  disabled={depositing}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(0,200,120,0.12)', border: '1px solid rgba(0,200,120,0.3)', color: '#00c878', fontSize: 14, fontWeight: 700, cursor: depositing ? 'not-allowed' : 'pointer', marginBottom: 12 }}
                >
                  {currencySymbol(depositCurrency)}100,000 — Top up to max
                </button>
                {depositError && (
                  <div style={{ background: 'rgba(220,56,38,0.1)', border: '1px solid rgba(220,56,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#ff6b6b' }}>
                    {depositError}
                  </div>
                )}
                <button
                  onClick={() => setShowDeposit(false)}
                  style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(var(--ink),0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(var(--ink),0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Portfolio section */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader title="Portfolio" onMore={() => navigate('/dashboard/portfolio')} />

            {positions.length === 0 ? (
              <div style={{
                background: 'rgba(var(--ink),0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '32px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                {/* Radar icon */}
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="26" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.1)' }} strokeWidth="1.5"/>
                  <circle cx="28" cy="28" r="18" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.08)' }} strokeWidth="1.5"/>
                  <circle cx="28" cy="28" r="10" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.06)' }} strokeWidth="1.5"/>
                  <circle cx="28" cy="20" r="2.5" fill="#c8a84b"/>
                  <circle cx="36" cy="32" r="2.5" fill="currentColor" style={{ color: 'rgba(var(--ink),0.2)' }}/>
                  <line x1="28" y1="28" x2="28" y2="4" stroke="rgba(200,168,75,0.5)" strokeWidth="1.5"/>
                  <line x1="28" y1="28" x2="48" y2="38" stroke="rgba(200,168,75,0.3)" strokeWidth="1"/>
                </svg>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0 }}>No open trades</p>
                <p style={{ fontSize: 13, color: 'rgba(var(--ink),0.45)', margin: 0, textAlign: 'center' }}>
                  Explore our markets for trading ideas
                </p>
                <button
                  onClick={() => navigate('/dashboard/watchlists')}
                  style={{
                    marginTop: 4, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 24, background: 'rgba(var(--ink),0.1)',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'rgb(var(--ink))',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  Explore
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {positions.map((pos: Position) => (
                  <PositionCard
                    key={pos.id} pos={pos}
                    onClose={() => { if (!closingId) handleClose(pos.id) }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* ── My Accounts ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="My Accounts" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACCOUNTS.map(acct => {
                const row       = existingAccounts.find(r => r.mode === acct.mode && r.currency === acct.currency)
                const isActive  = user?.accountMode === acct.mode && (user?.currency ?? 'USD') === acct.currency
                const isLive    = acct.mode === 'real'
                const balance   = row?.cash_balance ?? (isLive ? 0 : 100_000)
                const canDeposit = !isLive && !!row && row.cash_balance < 10_000
                return (
                  <div
                    key={acct.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 16,
                      background: isActive ? 'rgba(14,165,233,0.06)' : 'rgba(var(--ink),0.03)',
                      border: `1px solid ${isActive ? 'rgba(14,165,233,0.25)' : 'rgba(var(--ink),0.07)'}`,
                    }}
                  >
                    {/* Currency icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 800,
                      color: isLive ? '#10b981' : '#f59e0b',
                    }}>
                      {currencySymbol(acct.currency)}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))' }}>
                          {isLive ? 'Live' : 'Demo'} · {acct.currency}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'rgb(var(--ink))', fontFamily: 'monospace' }}>
                        {formatCurrency(balance, 2, acct.currency)}
                      </div>
                    </div>
                    {/* Action button */}
                    {canDeposit ? (
                      <button
                        onClick={() => { setDepositCurrency(acct.currency); setDepositError(''); setShowDeposit(true) }}
                        style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(0,200,120,0.12)', color: '#00c878', border: '1px solid rgba(0,200,120,0.25)', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Deposit
                      </button>
                    ) : isLive ? (
                      <button
                        style={{ padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'default', flexShrink: 0, opacity: 0.7 }}
                      >
                        Fund
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Watchlist ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Watchlist" />
            <div style={{ background: 'rgba(var(--ink),0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', padding: '4px 14px' }}>
              {WATCHLIST_SYMBOLS.map(({ symbol, name, assetClass }) => (
                <MoverRow key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} />
              ))}
            </div>
          </div>

          {/* ── Market categories ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Market categories" />
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => navigate('/dashboard/watchlists')}
                  style={{
                    flexShrink: 0, width: 148, height: 96, borderRadius: 18,
                    background: cat.gradient, border: `1px solid ${cat.accent}28`,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '12px 14px', overflow: 'hidden', position: 'relative',
                  }}
                >
                  {/* Glow blob */}
                  <div style={{
                    position: 'absolute', right: -10, bottom: -10,
                    width: 72, height: 72, borderRadius: '50%',
                    background: cat.accent, opacity: 0.12, filter: 'blur(16px)',
                    pointerEvents: 'none',
                  }}/>
                  {/* Icon top-right */}
                  <div style={{ position: 'absolute', right: 10, top: 10, opacity: 0.9 }}>
                    {cat.img}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'rgb(var(--ink))', textAlign: 'left', lineHeight: 1.3, zIndex: 1 }}>
                    {cat.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 1 }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={cat.accent} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: cat.accent }}>Explore</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Most traded ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Most traded" onMore={() => navigate('/dashboard/watchlists')} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {MOST_TRADED.map(({ symbol, name, assetClass }) => (
                <TradedTile
                  key={symbol} symbol={symbol} name={name} assetClass={assetClass}
                  onClick={() => goTrade(symbol)}
                />
              ))}
            </div>
            <button
              onClick={() => navigate('/dashboard/watchlists')}
              style={{
                width: '100%', padding: '10px', borderRadius: 12,
                background: 'rgba(var(--ink),0.04)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(var(--ink),0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Show all
            </button>
          </div>

          {/* ── Biggest movers ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Biggest movers" onMore={() => navigate('/dashboard/watchlists')} />
            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['risers', 'fallers'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMoversTab(t)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: moversTab === t ? 'rgb(var(--ink))' : 'rgba(var(--ink),0.07)',
                    color: moversTab === t ? '#000' : 'rgba(var(--ink),0.5)',
                  }}
                >
                  {t === 'risers' ? '↑ Top risers' : '↓ Top fallers'}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(var(--ink),0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '4px 14px' }}>
              {sortedMovers.slice(0, 4).map(({ symbol, name, assetClass }) => (
                <MoverRow key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} />
              ))}
              <button
                onClick={() => navigate('/dashboard/watchlists')}
                style={{ width: '100%', textAlign: 'center', padding: '10px 0 6px', background: 'none', border: 'none', color: 'rgba(var(--ink),0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Show all
              </button>
            </div>
          </div>

          {/* ── News ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="News" onMore={() => navigate('/dashboard/blog')} />
            <div style={{ background: 'rgba(var(--ink),0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {recentOrders.length > 0 ? (
                recentOrders.map((o, i) => (
                  <div key={o.id} style={{ padding: '14px 16px', borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>
                      {o.side.toUpperCase()} {o.symbol} — {o.quantity} units @ {formatPrice(o.fill_price, o.symbol)}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(var(--ink),0.4)', margin: 0 }}>
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(var(--ink),0.4)', margin: 0 }}>No recent activity</p>
                </div>
              )}
              <button
                onClick={() => navigate('/dashboard/blog')}
                style={{ width: '100%', padding: '12px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(var(--ink),0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                View all news →
              </button>
            </div>
          </div>

          {/* ── Discover markets ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Discover markets" onMore={() => navigate('/dashboard/watchlists')} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {DISCOVER.map(({ label, icon, path, color, bg }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 16,
                    background: 'rgba(var(--ink),0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: bg, border: `1px solid ${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', flex: 1 }}>{label}</span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.25)' }} strokeWidth={2.5}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* ── Price alerts ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Price alerts" onMore={() => navigate('/dashboard/alerts')} />
            {alerts.length === 0 ? (
              <div style={{
                background: 'rgba(var(--ink),0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '32px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="rgba(14,165,233,0.6)" strokeWidth={1.8}>
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', margin: 0 }}>No price alerts yet</p>
                <p style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', margin: 0, textAlign: 'center' }}>
                  Get notified the moment a price level is reached
                </p>
                <button
                  onClick={() => navigate('/dashboard/alerts')}
                  style={{
                    marginTop: 4, padding: '9px 22px', borderRadius: 22,
                    background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
                    color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Set an alert
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.slice(0, 3).map(a => {
                  const isAbove = a.condition === 'above'
                  const statusColor = a.status === 'triggered' ? '#00c878' : a.status === 'dismissed' ? '#6b7280' : '#0ea5e9'
                  const statusLabel = a.status === 'triggered' ? 'Triggered' : a.status === 'dismissed' ? 'Done' : 'Active'
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate('/dashboard/alerts')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 14, width: '100%',
                        background: a.status === 'triggered' ? 'rgba(0,200,120,0.04)' : 'rgba(var(--ink),0.03)',
                        border: `1px solid ${a.status === 'triggered' ? 'rgba(0,200,120,0.15)' : 'rgba(var(--ink),0.07)'}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: isAbove ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={isAbove ? '#00c878' : '#ff3047'} strokeWidth={2.5}>
                          {isAbove ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))' }}>{a.symbol}</div>
                        <div style={{ fontSize: 11, color: 'rgba(var(--ink),0.4)' }}>
                          {isAbove ? '↑ Above' : '↓ Below'} {formatPrice(a.targetPrice, a.symbol)}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${statusColor}18`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </button>
                  )
                })}
                {alerts.length > 3 && (
                  <button
                    onClick={() => navigate('/dashboard/alerts')}
                    style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'rgba(var(--ink),0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(var(--ink),0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View all {alerts.length} alerts →
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
