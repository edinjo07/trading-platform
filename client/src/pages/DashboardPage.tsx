import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { useAlertsStore } from '../store/alertsStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { getAccountsList, createAccountApi, depositDemo, type AccountRow } from '../api/accounts'
import type { Position, AccountMode, Currency, AccountType } from '../types'
import AssetIcon from '../components/ui/AssetIcon'

// ── Theme palette (flips with light/dark) ─────────────────────────────────────
const S = {
  surface:  'var(--t-surface)',
  surface2: 'var(--t-surface-2)',
  border:   'var(--t-border)',
  text1:    'var(--t-text-1)',
  text2:    'var(--t-text-2)',
  text3:    'var(--t-text-3)',
  bull:     'var(--t-bull)',
  bear:     'var(--t-bear)',
  warn:     'var(--t-warn)',
  accent:   'var(--t-accent)',
}
const pnlCol = (v: number) => (v >= 0 ? S.bull : S.bear)
const sign   = (v: number) => (v >= 0 ? '+' : '')

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

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children, pad = 20, style }: { children: React.ReactNode; pad?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: pad, ...style }}>
      {children}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onMore, moreLabel }: { title: string; onMore?: () => void; moreLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {onMore && (
        <button onClick={onMore}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: S.accent, fontSize: 12, fontWeight: 700 }}>
          {moreLabel ?? 'See all'}
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  )
}

// ─── Position card ─────────────────────────────────────────────────────────────
function PositionCard({ pos, onClose, closing }: { pos: Position; onClose: () => void; closing: boolean }) {
  const isLong = pos.side === 'long'
  return (
    <div style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 3, height: 22, borderRadius: 99, background: isLong ? S.bull : S.bear }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: S.text1 }}>{pos.symbol}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: isLong ? S.bull : S.bear }}>{isLong ? 'BUY' : 'SELL'}</span>
          {pos.leverage > 1 && <span style={{ fontSize: 10.5, fontWeight: 700, color: S.text3 }}>· {pos.leverage}x</span>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: pnlCol(pos.unrealizedPnl), fontFamily: 'ui-monospace,monospace' }}>
          {sign(pos.unrealizedPnl)}{formatCurrency(pos.unrealizedPnl)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { l: 'Units',   v: pos.quantity.toFixed(pos.quantity < 1 ? 4 : 2) },
          { l: 'Open',    v: formatPrice(pos.avg_price, pos.symbol) },
          { l: 'Current', v: formatPrice(pos.currentPrice, pos.symbol) },
          { l: 'P&L %',   v: `${sign(pos.unrealizedPnlPct)}${pos.unrealizedPnlPct.toFixed(2)}%` },
        ].map(({ l, v }, i) => (
          <div key={l}>
            <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 2px' }}>{l}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: i === 3 ? pnlCol(pos.unrealizedPnl) : S.text1, margin: 0, fontFamily: 'ui-monospace,monospace' }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 1px' }}>Margin</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: S.text2, margin: 0, fontFamily: 'ui-monospace,monospace' }}>{formatCurrency(pos.margin)}</p>
        </div>
        <button onClick={onClose} disabled={closing}
          style={{ padding: '7px 18px', borderRadius: 9, fontSize: 12, fontWeight: 700, background: 'var(--t-bear-s)', color: S.bear, border: `1px solid ${S.bear}`, cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.5 : 1 }}>
          {closing ? '…' : 'Close'}
        </button>
      </div>
    </div>
  )
}

// ─── Market row (movers / watchlist) ──────────────────────────────────────────
function MoverRow({ symbol, name, assetClass, onClick, last }: { symbol: string; name: string; assetClass?: string; onClick: () => void; last?: boolean }) {
  const { tickers } = useTradingStore()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  const pts = useMemo(() => seedSparkline(symbol, up), [symbol, up])
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%', borderBottom: last ? 'none' : '1px solid rgba(214,196,170,0.08)' }}>
      <AssetIcon symbol={symbol} assetClass={assetClass ?? 'stock'} size={38} />
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 10.5, color: S.text3, margin: 0 }}>{symbol}</p>
      </div>
      <svg width="56" height="24" viewBox="0 0 56 24" style={{ opacity: 0.9 }}>
        <polyline points={pts} fill="none" stroke={up ? S.bull : S.bear} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign: 'right', minWidth: 70 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0, fontFamily: 'ui-monospace,monospace' }}>{t ? formatPrice(t.price, symbol) : '—'}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: up ? S.bull : S.bear, margin: 0, fontFamily: 'ui-monospace,monospace' }}>
          {t ? (up ? '+' : '') + t.changePercent.toFixed(2) + '%' : '—'}
        </p>
      </div>
    </button>
  )
}

// ─── Most-traded tile ──────────────────────────────────────────────────────────
function TradedTile({ symbol, name, assetClass, onClick }: { symbol: string; name: string; assetClass?: string; onClick: () => void }) {
  const { tickers } = useTradingStore()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  return (
    <button onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 14, background: S.surface2, border: `1px solid ${S.border}`, cursor: 'pointer' }}>
      <AssetIcon symbol={symbol} assetClass={assetClass ?? 'stock'} size={42} />
      <p style={{ fontSize: 12, fontWeight: 700, color: S.text1, margin: 0, textAlign: 'center', lineHeight: 1.2 }}>{name.split('/')[0]}</p>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: up ? S.bull : S.bear, margin: 0, fontFamily: 'ui-monospace,monospace' }}>
        {t ? (up ? '+' : '') + t.changePercent.toFixed(2) + '%' : '—'}
      </p>
    </button>
  )
}

// ─── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ label, icon, onClick, primary }: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, minWidth: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 10px', borderRadius: 13, cursor: 'pointer',
        background: primary ? 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)' : 'rgba(var(--ink),0.05)',
        border: primary ? 'none' : `1px solid ${S.border}`,
        color: primary ? '#221503' : S.text1,
        boxShadow: primary ? '0 6px 22px rgba(242,184,75,0.28), inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
      }}>
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: primary ? 800 : 700 }}>{label}</span>
    </button>
  )
}

// ─── Category cards — each fronted by a real, premium asset logo ────────────────
const CATEGORIES = [
  { label: 'Big Tech', sym: 'NVDA',   cls: 'stock',     accent: '#a78bfa', gradient: 'linear-gradient(145deg, #1a0f2e 0%, #120a1f 100%)' },
  { label: 'Crypto',   sym: 'BTCUSD', cls: 'crypto',    accent: '#f6b24a', gradient: 'linear-gradient(145deg, #201406 0%, #150c04 100%)' },
  { label: 'Gold',     sym: 'XAUUSD', cls: 'commodity', accent: '#f2b84b', gradient: 'linear-gradient(145deg, #241a08 0%, #17100a 100%)' },
  { label: 'Oil',      sym: 'WTI',    cls: 'commodity', accent: '#22c55e', gradient: 'linear-gradient(145deg, #0f2318 0%, #0a1a10 100%)' },
]

// ─── Discover markets — real representative logos, not colour swatches ──────────
const DISCOVER = [
  { label: 'Shares',      sym: 'AAPL',   cls: 'stock'     },
  { label: 'Indices',     sym: 'US500',  cls: 'index'     },
  { label: 'Commodities', sym: 'XAUUSD', cls: 'commodity' },
  { label: 'Forex',       sym: 'EURUSD', cls: 'forex'     },
  { label: 'ETFs',        sym: 'SPY',    cls: 'stock'     },
  { label: 'Crypto',      sym: 'BTCUSD', cls: 'crypto'    },
]

const ACCOUNTS: { id: string; label: string; sub: string; mode: AccountMode; currency: Currency }[] = [
  { id: 'demo-usd', label: 'Demo Account', sub: 'USD · Practice money', mode: 'demo', currency: 'USD' },
  { id: 'real-usd', label: 'Real Account', sub: 'USD · Live trading',   mode: 'real', currency: 'USD' },
  { id: 'demo-eur', label: 'Demo Account', sub: 'EUR · Practice money', mode: 'demo', currency: 'EUR' },
  { id: 'real-eur', label: 'Real Account', sub: 'EUR · Live trading',   mode: 'real', currency: 'EUR' },
  { id: 'demo-gbp', label: 'Demo Account', sub: 'GBP · Practice money', mode: 'demo', currency: 'GBP' },
  { id: 'real-gbp', label: 'Real Account', sub: 'GBP · Live trading',   mode: 'real', currency: 'GBP' },
]

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
  { symbol: 'BTCUSD', name: 'Bitcoin',   assetClass: 'crypto'    },
  { symbol: 'ETHUSD', name: 'Ethereum',  assetClass: 'crypto'    },
  { symbol: 'XAUUSD', name: 'Gold',      assetClass: 'commodity' },
  { symbol: 'EURUSD', name: 'EUR/USD',   assetClass: 'forex'     },
  { symbol: 'AAPL',   name: 'Apple',     assetClass: 'stock'     },
  { symbol: 'NVDA',   name: 'Nvidia',    assetClass: 'stock'     },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, setAccountMode, setCurrency } = useAuthStore()
  const { tickers, portfolio, orders, loadPortfolio, loadOrders, closePosition, setSelectedSymbol } = useTradingStore()
  const { alerts } = useAlertsStore()
  const currency = user?.currency ?? 'USD'

  const [closingId,        setClosingId]        = useState<string | null>(null)
  const [moversTab,        setMoversTab]        = useState<'risers' | 'fallers'>('risers')
  const [showSwitcher,     setShowSwitcher]     = useState(false)
  const [switcherPage,     setSwitcherPage]     = useState<'list' | 'create'>('list')
  const [existingAccounts, setExistingAccounts] = useState<AccountRow[]>([])
  const [createMode,        setCreateMode]        = useState<AccountMode>('demo')
  const [createCurrency,    setCreateCurrency]    = useState<Currency>('USD')
  const [createAccountType, setCreateAccountType] = useState<AccountType>('raw_spread')
  const [creating,          setCreating]          = useState(false)
  const [createError,       setCreateError]       = useState('')
  const [createdNumber,     setCreatedNumber]     = useState<number | null>(null)

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
    loadPortfolio(); refreshAccounts()
  }

  const handleCreateAccount = async () => {
    setCreating(true); setCreateError('')
    try {
      const result = await createAccountApi({ mode: createMode, currency: createCurrency, accountType: createAccountType })
      setCreatedNumber(result.account_number)
      await refreshAccounts()
      await Promise.all([setAccountMode(createMode), setCurrency(createCurrency)])
      loadPortfolio()
      setTimeout(closeSwitcher, 1800)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string } } })?.response?.data
      setCreateError(d?.error ?? 'Failed to create account')
    } finally { setCreating(false) }
  }

  const visibleAccounts = useMemo(() => {
    if (existingAccounts.length === 0) return ACCOUNTS
    return ACCOUNTS.filter(a => existingAccounts.some(r => r.mode === a.mode && r.currency === a.currency))
  }, [existingAccounts])

  const handleDeposit = useCallback(async (amount: number) => {
    setDepositing(true); setDepositError('')
    try {
      await depositDemo(depositCurrency, amount)
      await refreshAccounts()
      if (user?.accountMode === 'demo' && (user?.currency ?? 'USD') === depositCurrency) loadPortfolio()
      setShowDeposit(false)
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { error?: string } } })?.response?.data
      setDepositError(d?.error ?? 'Deposit failed')
    } finally { setDepositing(false) }
  }, [depositCurrency, user, loadPortfolio])

  useEffect(() => {
    loadPortfolio(); loadOrders()
    const id = setInterval(loadPortfolio, 6000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders])

  const equity     = portfolio?.totalEquity  ?? user?.balance ?? 0
  const cash       = portfolio?.cashBalance  ?? user?.balance ?? 0
  const upnl       = portfolio?.unrealizedPnl ?? 0
  const positions  = portfolio?.positions ?? []
  const recentOrders = orders.slice(0, 4)
  const isLive     = user?.accountMode === 'real'

  const handleClose = useCallback(async (id: string) => {
    setClosingId(id)
    try { await closePosition(id) } finally { setClosingId(null) }
  }, [closePosition])

  const goTrade = useCallback((sym: string) => { setSelectedSymbol(sym); navigate('/dashboard/trade') }, [setSelectedSymbol, navigate])

  const sortedMovers = useMemo(() => {
    return [...MOVERS].sort((a, b) => {
      const ca = tickers[a.symbol]?.changePercent ?? 0, cb = tickers[b.symbol]?.changePercent ?? 0
      return moversTab === 'risers' ? cb - ca : ca - cb
    })
  }, [tickers, moversTab])

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px clamp(14px, 4vw, 20px) 120px' }}>

        {/* ── Greeting ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>
            Welcome back{user?.username ? `, ${user.username}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: S.text3, margin: '3px 0 0' }}>Here's your account at a glance.</p>
        </div>

        {/* ── Responsive layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 20, alignItems: 'start' }}>

          {/* ===== MAIN COLUMN ===== */}
          <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* Equity hero */}
            <div style={{
              background: `linear-gradient(135deg, ${isLive ? 'rgba(24,201,138,0.12)' : 'rgba(246,178,74,0.10)'} 0%, var(--t-surface) 60%)`,
              border: `1px solid ${S.border}`, borderRadius: 18, padding: 22, boxShadow: 'var(--t-shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 99, background: isLive ? 'var(--t-bull-s)' : 'var(--t-warn-s)', border: `1px solid ${isLive ? S.bull : S.warn}44` }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: isLive ? S.bull : S.warn }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isLive ? S.bull : S.warn }}>{isLive ? 'Live' : 'Demo'} · {currency}</span>
                  </div>
                  {portfolio?.accountNumber ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: S.text3, fontFamily: 'ui-monospace,monospace' }}>#{portfolio.accountNumber}</span>
                  ) : null}
                </div>
                <button onClick={openSwitcher}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 9, background: 'rgba(var(--ink),0.05)', border: `1px solid ${S.border}`, color: S.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>
                  Switch
                </button>
              </div>

              <p style={{ fontSize: 12, color: S.text3, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Account Equity</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: S.text1, fontFamily: 'ui-monospace,monospace', letterSpacing: '-0.02em' }}>
                  {formatCurrency(equity, 2, currency)}
                </span>
                {(upnl !== 0 || positions.length > 0) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: upnl >= 0 ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: pnlCol(upnl), fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: pnlCol(upnl) }} className="animate-pulse2" />
                    {sign(upnl)}{formatCurrency(upnl, 2, currency)} open
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11, background: 'rgba(var(--ink),0.04)', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: S.text2 }}>Available to trade</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: S.text1, fontFamily: 'ui-monospace,monospace' }}>{formatCurrency(cash, 2, currency)}</span>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <QuickAction label="Trade" primary onClick={() => navigate('/dashboard/trade')}
                  icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>} />
                <QuickAction label="Deposit" onClick={() => { setDepositCurrency(currency as Currency); setDepositError(''); setShowDeposit(true) }}
                  icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>} />
                <QuickAction label="Withdraw" onClick={() => navigate('/dashboard/withdraw')}
                  icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>} />
                <QuickAction label="Analytics" onClick={() => navigate('/dashboard/analytics')}
                  icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
              </div>
            </div>

            {/* Portfolio */}
            <Card>
              <SectionHeader title="Open Positions" onMore={() => navigate('/dashboard/portfolio')} />
              {positions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 16px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(var(--ink),0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.text3 }}>
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="4"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: S.text1, margin: 0 }}>No open trades</p>
                  <p style={{ fontSize: 13, color: S.text3, margin: 0, textAlign: 'center' }}>Explore the markets and place your first trade.</p>
                  <button onClick={() => navigate('/dashboard/trade')}
                    style={{ marginTop: 4, padding: '9px 22px', borderRadius: 10, background: S.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Browse markets
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {positions.map((pos: Position) => (
                    <PositionCard key={pos.id} pos={pos} closing={closingId === pos.id} onClose={() => { if (!closingId) handleClose(pos.id) }} />
                  ))}
                </div>
              )}
            </Card>

            {/* Biggest movers */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: S.text1, margin: 0 }}>Biggest movers</h2>
                <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(var(--ink),0.04)', border: `1px solid ${S.border}` }}>
                  {(['risers', 'fallers'] as const).map(t => (
                    <button key={t} onClick={() => setMoversTab(t)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                        background: moversTab === t ? S.surface : 'transparent', color: moversTab === t ? (t === 'risers' ? S.bull : S.bear) : S.text3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        {t === 'risers' ? <path d="M12 4l8 10h-6v6h-4v-6H4z"/> : <path d="M12 20l-8-10h6V4h4v6h6z"/>}
                      </svg>
                      {t === 'risers' ? 'Risers' : 'Fallers'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {sortedMovers.slice(0, 4).map(({ symbol, name, assetClass }, i, arr) => (
                  <MoverRow key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} last={i === arr.length - 1} />
                ))}
              </div>
            </Card>

            {/* Most traded */}
            <Card>
              <SectionHeader title="Most traded" onMore={() => navigate('/dashboard/watchlists')} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {MOST_TRADED.map(({ symbol, name, assetClass }) => (
                  <TradedTile key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} />
                ))}
              </div>
            </Card>

          </div>

          {/* ===== SIDE COLUMN ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* My accounts */}
            <Card>
              <SectionHeader title="My Accounts" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACCOUNTS.map(acct => {
                  const row        = existingAccounts.find(r => r.mode === acct.mode && r.currency === acct.currency)
                  if (!row && existingAccounts.length > 0) return null
                  const isActive   = user?.accountMode === acct.mode && (user?.currency ?? 'USD') === acct.currency
                  const live       = acct.mode === 'real'
                  const balance    = row?.cash_balance ?? (live ? 0 : 100_000)
                  const canDeposit = !live && !!row && row.cash_balance < 10_000
                  return (
                    <div key={acct.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 13,
                        background: isActive ? 'var(--t-accent-s)' : S.surface2,
                        border: `1px solid ${isActive ? `${S.accent}44` : S.border}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: live ? 'var(--t-bull-s)' : 'var(--t-warn-s)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: live ? S.bull : S.warn }}>
                        {currencySymbol(acct.currency)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: S.text1 }}>{live ? 'Live' : 'Demo'} · {acct.currency}</span>
                          {isActive && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: S.accent, color: '#fff' }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: S.text1, fontFamily: 'ui-monospace,monospace' }}>{formatCurrency(balance, 2, acct.currency)}</div>
                      </div>
                      {canDeposit && (
                        <button onClick={() => { setDepositCurrency(acct.currency); setDepositError(''); setShowDeposit(true) }}
                          style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, background: 'var(--t-bull-s)', color: S.bull, border: `1px solid ${S.bull}55`, cursor: 'pointer', flexShrink: 0 }}>
                          Deposit
                        </button>
                      )}
                    </div>
                  )
                })}
                <button onClick={openSwitcher}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, borderRadius: 11, background: 'var(--t-accent-s)', border: `1px dashed ${S.accent}55`, color: S.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New account
                </button>
              </div>
            </Card>

            {/* Watchlist */}
            <Card>
              <SectionHeader title="Watchlist" onMore={() => navigate('/dashboard/watchlists')} />
              <div>
                {WATCHLIST_SYMBOLS.map(({ symbol, name, assetClass }, i, arr) => (
                  <MoverRow key={symbol} symbol={symbol} name={name} assetClass={assetClass} onClick={() => goTrade(symbol)} last={i === arr.length - 1} />
                ))}
              </div>
            </Card>

            {/* Price alerts */}
            <Card>
              <SectionHeader title="Price alerts" onMore={() => navigate('/dashboard/alerts')} />
              {alerts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 12px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--t-accent-s)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.accent }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0 }}>No alerts yet</p>
                  <p style={{ fontSize: 12, color: S.text3, margin: 0, textAlign: 'center' }}>Get notified when a price level is hit.</p>
                  <button onClick={() => navigate('/dashboard/alerts')}
                    style={{ marginTop: 2, padding: '8px 18px', borderRadius: 9, background: 'var(--t-accent-s)', border: `1px solid ${S.accent}55`, color: S.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Set an alert
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.slice(0, 4).map(a => {
                    const isAbove = a.condition === 'above'
                    const statusColor = a.status === 'triggered' ? S.bull : a.status === 'dismissed' ? S.text3 : S.accent
                    const statusLabel = a.status === 'triggered' ? 'Triggered' : a.status === 'dismissed' ? 'Done' : 'Active'
                    return (
                      <button key={a.id} onClick={() => navigate('/dashboard/alerts')}
                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11, width: '100%', background: S.surface2, border: `1px solid ${S.border}`, cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: isAbove ? 'var(--t-bull-s)' : 'var(--t-bear-s)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={isAbove ? S.bull : S.bear} strokeWidth={2.5}>{isAbove ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}</svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: S.text1 }}>{a.symbol}</div>
                          <div style={{ fontSize: 12, color: S.text3, fontFamily: 'ui-monospace,monospace' }}>{isAbove ? 'Above' : 'Below'} {formatPrice(a.targetPrice, a.symbol)}</div>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `${statusColor}22`, color: statusColor }}>{statusLabel}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Recent activity (was mislabeled "News") */}
            <Card>
              <SectionHeader title="Recent activity" onMore={() => navigate('/dashboard/portfolio')} moreLabel="History" />
              {recentOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentOrders.map((o, i, arr) => {
                    const buy = o.side === 'buy'
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${S.border}` }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, background: buy ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: buy ? S.bull : S.bear }}>{o.side.toUpperCase()}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0 }}>{o.symbol}</p>
                          <p style={{ fontSize: 10.5, color: S.text3, margin: '1px 0 0', fontFamily: 'ui-monospace,monospace' }}>{o.quantity} units · {o.fill_price ? formatPrice(o.fill_price, o.symbol) : 'market'}</p>
                        </div>
                        <span style={{ fontSize: 10.5, color: S.text3, whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: S.text3, margin: 0, textAlign: 'center', padding: '16px 0' }}>No recent activity</p>
              )}
            </Card>

          </div>
        </div>

        {/* ── Market categories (full width) ───────────────────────────────── */}
        <div style={{ marginTop: 40 }}>
          <SectionHeader title="Market categories" onMore={() => navigate('/dashboard/watchlists')} />
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.label} onClick={() => navigate('/dashboard/watchlists')}
                style={{ flexShrink: 0, width: 168, height: 102, borderRadius: 16, background: cat.gradient, border: `1px solid ${cat.accent}33`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', padding: '13px 15px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', right: -10, bottom: -10, width: 72, height: 72, borderRadius: '50%', background: cat.accent, opacity: 0.12, filter: 'blur(16px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 12, top: 12, opacity: 0.98 }}>
                  <AssetIcon symbol={cat.sym} assetClass={cat.cls} size={44} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textAlign: 'left', lineHeight: 1.3, zIndex: 1 }}>{cat.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, zIndex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cat.accent }}>Explore</span>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={cat.accent} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Discover markets (full width) ────────────────────────────────── */}
        <div style={{ marginTop: 40 }}>
          <SectionHeader title="Discover markets" onMore={() => navigate('/dashboard/watchlists')} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{ gap: 10 }}>
            {DISCOVER.map(({ label, sym, cls }) => (
              <button key={label} onClick={() => navigate('/dashboard/watchlists')}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, background: S.surface, border: `1px solid ${S.border}`, cursor: 'pointer', textAlign: 'left' }}>
                <AssetIcon symbol={sym} assetClass={cls} size={32} />
                <span style={{ fontSize: 13, fontWeight: 700, color: S.text1, flex: 1 }}>{label}</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={S.text3} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ Account switcher / creator bottom sheet ════════════ */}
      {showSwitcher && (
        <div onClick={closeSwitcher} style={{ position: 'fixed', inset: 0, background: 'rgba(6,4,4,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--sheet)', borderRadius: '22px 22px 0 0', padding: '16px 16px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.18)', margin: '0 auto 20px' }} />

            {switcherPage === 'list' && (<>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 4, textAlign: 'center' }}>Switch Account</h3>
              <p style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', textAlign: 'center', marginBottom: 20 }}>Select the account you want to trade with</p>
              {visibleAccounts.map(acct => {
                const isActive = user?.accountMode === acct.mode && (user?.currency ?? 'USD') === acct.currency
                const live     = acct.mode === 'real'
                const row      = existingAccounts.find(r => r.mode === acct.mode && r.currency === acct.currency)
                return (
                  <button key={acct.id} onClick={() => handleSelectAccount(acct)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                      background: isActive ? 'rgba(79,140,255,0.08)' : 'rgba(var(--ink),0.04)', border: `1px solid ${isActive ? 'rgba(79,140,255,0.3)' : 'rgba(var(--ink),0.08)'}`, cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: live ? 'rgba(24,201,138,0.12)' : 'rgba(246,178,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {live
                        ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#18c98a" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                        : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f6b24a" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 2 }}>{acct.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(var(--ink),0.45)' }}>{acct.sub}</div>
                      {row?.account_number ? <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'rgba(var(--ink),0.28)', marginTop: 2 }}>#{row.account_number}</div> : null}
                    </div>
                    {isActive && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4f8cff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </button>
                )
              })}
              <button onClick={() => { setSwitcherPage('create'); setCreateError(''); setCreatedNumber(null) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 14, background: 'rgba(79,140,255,0.07)', border: '1px dashed rgba(79,140,255,0.3)', color: '#7aa7ff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4, marginBottom: 8 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Account
              </button>
              <button onClick={closeSwitcher} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'rgba(var(--ink),0.05)', border: '1px solid rgba(var(--ink),0.09)', color: 'rgba(var(--ink),0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </>)}

            {switcherPage === 'create' && (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => setSwitcherPage('list')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.7)' }} strokeWidth={2.2}><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--ink))' }}>Create Account</div>
                  <div style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)' }}>Each account has a unique account number</div>
                </div>
              </div>
              {createdNumber ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(24,201,138,0.12)', border: '1px solid rgba(24,201,138,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#18c98a" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 6 }}>Account Created</div>
                  <div style={{ fontSize: 13, color: 'rgba(var(--ink),0.5)', marginBottom: 12 }}>Your account number is</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'rgb(var(--ink))', fontFamily: 'monospace', letterSpacing: 1 }}>#{createdNumber}</div>
                </div>
              ) : (<>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Account Type</div>
                  <div style={{ display: 'flex', gap: 8, background: 'rgba(var(--ink),0.04)', borderRadius: 12, padding: 4 }}>
                    {(['demo', 'real'] as AccountMode[]).map(m => (
                      <button key={m} onClick={() => setCreateMode(m)}
                        style={{ flex: 1, padding: 9, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          background: createMode === m ? (m === 'real' ? 'rgba(24,201,138,0.15)' : 'rgba(246,178,74,0.15)') : 'transparent',
                          color: createMode === m ? (m === 'real' ? '#18c98a' : '#f6b24a') : 'rgba(var(--ink),0.4)',
                          border: createMode === m ? `1px solid ${m === 'real' ? 'rgba(24,201,138,0.35)' : 'rgba(246,178,74,0.35)'}` : '1px solid transparent' }}>
                        {m === 'real' ? 'Live' : 'Demo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Currency</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([{ key: 'USD', symbol: '$', name: 'US Dollar' }, { key: 'EUR', symbol: '€', name: 'Euro' }, { key: 'GBP', symbol: '£', name: 'Pound' }] as { key: Currency; symbol: string; name: string }[]).map(c => (
                      <button key={c.key} onClick={() => setCreateCurrency(c.key)}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                          background: createCurrency === c.key ? 'rgba(79,140,255,0.1)' : 'rgba(var(--ink),0.04)', border: `1px solid ${createCurrency === c.key ? 'rgba(79,140,255,0.35)' : 'rgba(var(--ink),0.08)'}` }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: createCurrency === c.key ? '#7aa7ff' : 'rgba(var(--ink),0.4)', marginBottom: 2 }}>{c.symbol}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: createCurrency === c.key ? 'rgb(var(--ink))' : 'rgba(var(--ink),0.5)' }}>{c.key}</div>
                        <div style={{ fontSize: 10.5, color: 'rgba(var(--ink),0.3)', marginTop: 1 }}>{c.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink),0.5)', marginBottom: 8 }}>Account Plan</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([{ key: 'raw_spread', label: 'Raw Spread', sub: '$3.50 / lot · 0.0 pip spread', popular: true }, { key: 'ctrader', label: 'cTrader', sub: '$3 / 100k · 0.0 pip spread', popular: false }, { key: 'standard', label: 'Standard', sub: '$0 commission · 0.8 pip spread', popular: false }] as { key: AccountType; label: string; sub: string; popular: boolean }[]).map(t => (
                      <button key={t.key} onClick={() => setCreateAccountType(t.key)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          background: createAccountType === t.key ? 'rgba(79,140,255,0.08)' : 'rgba(var(--ink),0.04)', border: `1px solid ${createAccountType === t.key ? 'rgba(79,140,255,0.3)' : 'rgba(var(--ink),0.08)'}` }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: createAccountType === t.key ? '#4f8cff' : 'rgba(var(--ink),0.15)', border: createAccountType === t.key ? '2px solid rgba(79,140,255,0.5)' : '2px solid rgba(var(--ink),0.15)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--ink))' }}>{t.label}</span>
                            {t.popular && <span style={{ fontSize: 10.5, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(79,140,255,0.18)', color: '#7aa7ff' }}>POPULAR</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', marginTop: 2 }}>{t.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(var(--ink),0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(var(--ink),0.4)' }} strokeWidth={1.8}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)' }}>{createMode === 'demo' ? 'Demo accounts start with $100,000 practice balance' : 'Real accounts require a deposit after creation'}</span>
                </div>
                {createError && <div style={{ background: 'rgba(220,56,38,0.1)', border: '1px solid rgba(220,56,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#ff7080' }}>{createError}</div>}
                <button onClick={handleCreateAccount} disabled={creating}
                  style={{ width: '100%', padding: 14, borderRadius: 14, background: creating ? 'rgba(79,140,255,0.4)' : '#4f8cff', color: '#fff', fontSize: 14, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', border: 'none' }}>
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
              </>)}
            </>)}
          </div>
        </div>
      )}

      {/* ════════════ Deposit bottom sheet ════════════ */}
      {showDeposit && (
        <div onClick={() => setShowDeposit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,4,4,0.72)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--sheet)', borderRadius: '22px 22px 0 0', padding: '16px 16px 48px', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.18)', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgb(var(--ink))', marginBottom: 4, textAlign: 'center' }}>Deposit Funds</h3>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink),0.4)', textAlign: 'center', marginBottom: 24 }}>Demo account · {depositCurrency}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
              {[5000, 10000, 25000, 50000].map(amt => (
                <button key={amt} onClick={() => handleDeposit(amt)} disabled={depositing}
                  style={{ padding: '16px 12px', borderRadius: 14, background: 'rgba(24,201,138,0.08)', border: '1px solid rgba(24,201,138,0.2)', cursor: depositing ? 'not-allowed' : 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#18c98a', fontFamily: 'monospace' }}>{currencySymbol(depositCurrency)}{amt.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: 'rgba(var(--ink),0.35)', marginTop: 3 }}>+{amt.toLocaleString()} {depositCurrency}</div>
                </button>
              ))}
            </div>
            <button onClick={() => handleDeposit(100000)} disabled={depositing}
              style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(24,201,138,0.12)', border: '1px solid rgba(24,201,138,0.3)', color: '#18c98a', fontSize: 14, fontWeight: 700, cursor: depositing ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
              {currencySymbol(depositCurrency)}100,000 · Top up to max
            </button>
            {depositError && <div style={{ background: 'rgba(220,56,38,0.1)', border: '1px solid rgba(220,56,38,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#ff7080' }}>{depositError}</div>}
            <button onClick={() => setShowDeposit(false)} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'rgba(var(--ink),0.05)', border: '1px solid rgba(var(--ink),0.09)', color: 'rgba(var(--ink),0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
