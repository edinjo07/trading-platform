import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { getAccountsList, createAccountApi, type AccountRow } from '../api/accounts'
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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{pos.symbol}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: isLong ? 'rgba(0,200,120,0.15)' : 'rgba(255,48,71,0.15)',
            color: isLong ? '#00c878' : '#ff3047',
          }}>{isLong ? 'BUY' : 'SELL'}</span>
          {pos.leverage > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
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
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{l}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>P&L %</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: pnlColor, fontFamily: 'monospace' }}>
              {pos.unrealizedPnlPct >= 0 ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Margin</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{formatCurrency(pos.margin)}</p>
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
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{symbol}</p>
      </div>
      <svg width="56" height="24" viewBox="0 0 56 24">
        <polyline points={pts} fill="none" stroke={up ? '#00c878' : '#ff3047'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign: 'right', minWidth: 70 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'monospace' }}>
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
        padding: '14px 8px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
      }}
    >
      <AssetIcon symbol={symbol} assetClass={assetClass ?? 'stock'} size={44} />
      <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
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
  { label: 'Energy',      gradient: 'linear-gradient(135deg, #1a2a1a 0%, #0d1f0d 100%)', accent: '#22c55e',
    icon: <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={1.2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { label: 'Gas & Oil',   gradient: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d1f 100%)', accent: '#60a5fa',
    icon: <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.2}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7h13L17 13"/></svg> },
  { label: 'Big Tech',    gradient: 'linear-gradient(135deg, #2a1a2a 0%, #1f0d1f 100%)', accent: '#a78bfa',
    icon: <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={1.2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { label: 'Crypto',      gradient: 'linear-gradient(135deg, #2a1a0a 0%, #1f100d 100%)', accent: '#f59e0b',
    icon: <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.2}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
]

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onMore }: { title: string; onMore?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
      {onMore && (
        <button
          onClick={onMore}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.4)' }}
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
  { label: 'Shares',      icon: '📈', path: '/dashboard/watchlists' },
  { label: 'Indices',     icon: '🌐', path: '/dashboard/watchlists' },
  { label: 'Commodities', icon: '🛢️',  path: '/dashboard/watchlists' },
  { label: 'Forex',       icon: '💱', path: '/dashboard/watchlists' },
  { label: 'ETF',         icon: '📊', path: '/dashboard/watchlists' },
  { label: 'Cryptos',     icon: '₿',  path: '/dashboard/watchlists' },
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#000' }}>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, paddingBottom: 100 }}>

        {/* ── Account card (Capital.com style) ── */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(160,110,0,0.22) 0%, transparent 90%)',
          padding: '20px 16px 0',
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Account (CFD)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Profile icon */}
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Profile"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </button>
                {/* Switch account */}
                <button
                  onClick={openSwitcher}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
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
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  #{portfolio.accountNumber}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '-1px', marginBottom: 16 }}>
              {formatCurrency(equity)}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Available to trade</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{formatCurrency(cash)}</span>
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
                style={{ width: '100%', background: '#141414', borderRadius: '22px 22px 0 0', padding: '16px 16px 40px', maxHeight: '85vh', overflowY: 'auto' }}
              >
                {/* Handle */}
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />

                {/* ── List page ── */}
                {switcherPage === 'list' && (<>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>Switch Account</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20 }}>Select the account you want to trade with</p>

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
                          background: isActive ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isActive ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.08)'}`,
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
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{acct.label}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{acct.sub}</div>
                          {row?.account_number ? (
                            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
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
                    style={{ width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
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
                      style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={2.2}><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Create Account</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Each account has a unique account number</div>
                    </div>
                  </div>

                  {/* Success state */}
                  {createdNumber ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,200,120,0.12)', border: '1px solid rgba(0,200,120,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00c878" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Account Created</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Your account number is</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: 1 }}>#{createdNumber}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Keep this number for support enquiries</div>
                    </div>
                  ) : (<>
                    {/* Demo / Real toggle */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Account Type</div>
                      <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
                        {(['demo', 'real'] as AccountMode[]).map(m => (
                          <button
                            key={m}
                            onClick={() => setCreateMode(m)}
                            style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                              background: createMode === m ? (m === 'real' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)') : 'transparent',
                              color: createMode === m ? (m === 'real' ? '#10b981' : '#f59e0b') : 'rgba(255,255,255,0.4)',
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Currency</div>
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
                              background: createCurrency === c.key ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${createCurrency === c.key ? 'rgba(14,165,233,0.35)' : 'rgba(255,255,255,0.08)'}`,
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 800, color: createCurrency === c.key ? '#38bdf8' : 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{c.symbol}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: createCurrency === c.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c.key}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{c.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account type */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Account Plan</div>
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
                              background: createAccountType === t.key ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${createAccountType === t.key ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            }}
                          >
                            <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: createAccountType === t.key ? '#0ea5e9' : 'rgba(255,255,255,0.15)', border: createAccountType === t.key ? '2px solid rgba(14,165,233,0.5)' : '2px solid rgba(255,255,255,0.15)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.label}</span>
                                {t.popular && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }}>POPULAR</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{t.sub}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Starting balance note */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
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
                      style={{ width: '100%', padding: '14px', borderRadius: 14, background: creating ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.9)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {creating ? (
                        <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/><path fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>Creating…</>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </>)}
                </>)}
              </div>
            </div>
          )}

          {/* Portfolio section */}
          <div style={{ marginBottom: 24 }}>
            <SectionHeader title="Portfolio" onMore={() => navigate('/dashboard/portfolio')} />

            {positions.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '32px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                {/* Radar icon */}
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="26" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
                  <circle cx="28" cy="28" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
                  <circle cx="28" cy="28" r="10" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                  <circle cx="28" cy="20" r="2.5" fill="#c8a84b"/>
                  <circle cx="36" cy="32" r="2.5" fill="rgba(255,255,255,0.2)"/>
                  <line x1="28" y1="28" x2="28" y2="4" stroke="rgba(200,168,75,0.5)" strokeWidth="1.5"/>
                  <line x1="28" y1="28" x2="48" y2="38" stroke="rgba(200,168,75,0.3)" strokeWidth="1"/>
                </svg>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>No open trades</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center' }}>
                  Explore our markets for trading ideas
                </p>
                <button
                  onClick={() => navigate('/dashboard/watchlists')}
                  style={{
                    marginTop: 4, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 24, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
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

          {/* ── Watchlist ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Watchlist" />
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', padding: '4px 14px' }}>
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
                    flexShrink: 0, width: 140, height: 90, borderRadius: 16,
                    background: cat.gradient, border: `1px solid ${cat.accent}22`,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', justifyContent: 'space-between',
                    padding: '10px 12px', overflow: 'hidden', position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', right: 8, top: 8, opacity: 0.5 }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'left', lineHeight: 1.3 }}>
                    {cat.label}
                  </span>
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
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
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
                    background: moversTab === t ? '#fff' : 'rgba(255,255,255,0.07)',
                    color: moversTab === t ? '#000' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {t === 'risers' ? '↑ Top risers' : '↓ Top fallers'}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '4px 14px' }}>
              {sortedMovers.slice(0, 4).map(({ symbol, name, assetClass }) => (
                <MoverRow key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} />
              ))}
              <button
                onClick={() => navigate('/dashboard/watchlists')}
                style={{ width: '100%', textAlign: 'center', padding: '10px 0 6px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Show all
              </button>
            </div>
          </div>

          {/* ── News ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="News" onMore={() => navigate('/dashboard/blog')} />
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {recentOrders.length > 0 ? (
                recentOrders.map((o, i) => (
                  <div key={o.id} style={{ padding: '14px 16px', borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>
                      {o.side.toUpperCase()} {o.symbol} — {o.quantity} units @ {formatPrice(o.fill_price, o.symbol)}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>No recent activity</p>
                </div>
              )}
              <button
                onClick={() => navigate('/dashboard/blog')}
                style={{ width: '100%', padding: '12px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                View all news →
              </button>
            </div>
          </div>

          {/* ── Discover markets ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Discover markets" onMore={() => navigate('/dashboard/watchlists')} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {DISCOVER.map(({ label, icon, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '16px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{label}</span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>›</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Price alerts ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Price alerts" onMore={() => navigate('/dashboard/alerts')} />
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: '32px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={1.8}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>No price alerts yet</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>
                Get instant notifications when a price level is reached
              </p>
              <button
                onClick={() => navigate('/dashboard/alerts')}
                style={{
                  marginTop: 4, padding: '9px 22px', borderRadius: 22,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Set an alert
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
