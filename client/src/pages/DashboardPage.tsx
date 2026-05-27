import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { getKYCStatus } from './KYCPage'
import type { Position, Order } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function fmtChange(val: number, prefix = '') {
  return (val >= 0 ? '+' : '') + prefix + formatCurrency(Math.abs(val))
}

function shortDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--t-surface-2)',
      border: '1px solid var(--t-border)',
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 0,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: color ?? 'var(--t-text-1)' }}>{value}</p>
    </div>
  )
}

// ─── Position Card (live prices) ──────────────────────────────────────────────

function PositionCard({ pos, onClose }: { pos: Position; onClose: () => void }) {
  const isLong    = pos.side === 'long'
  const pnlColor  = pos.unrealizedPnl >= 0 ? 'var(--t-bull)' : 'var(--t-bear)'
  const pnlBg     = pos.unrealizedPnl >= 0 ? 'var(--t-bull-s)' : 'var(--t-bear-s)'
  const sideBg    = isLong ? 'var(--t-bull-s)' : 'var(--t-bear-s)'
  const sideColor = isLong ? 'var(--t-bull)' : 'var(--t-bear)'
  const liqPrice  = pos.liquidationPrice

  return (
    <div style={{
      background: 'var(--t-surface)',
      border: '1px solid var(--t-border)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--t-border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--t-border)')}
    >
      {/* Row 1: symbol + side + leverage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--t-text-1)' }}>{pos.symbol}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: sideBg, color: sideColor }}>
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          {(pos.leverage ?? 1) > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--t-accent-s)', color: 'var(--t-accent)' }}>
              {pos.leverage}x
            </span>
          )}
        </div>
        {/* P&L badge */}
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', padding: '3px 8px', borderRadius: 8, background: pnlBg, color: pnlColor }}>
          {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
        </span>
      </div>

      {/* Row 2: qty / entry / mark */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { l: 'Quantity', v: pos.quantity.toFixed(pos.quantity < 1 ? 6 : 4) },
          { l: 'Entry',    v: formatPrice(pos.avg_price, pos.symbol) },
          { l: 'Mark',     v: pos.currentPrice > 0 ? formatPrice(pos.currentPrice, pos.symbol) : '—' },
        ].map(item => (
          <div key={item.l}>
            <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 2 }}>{item.l}</p>
            <p style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-1)' }}>{item.v}</p>
          </div>
        ))}
      </div>

      {/* Row 3: notional / margin / liq + close button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 1 }}>Notional</p>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-2)' }}>{formatCurrency(pos.notionalValue)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 1 }}>Margin</p>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-2)' }}>{formatCurrency(pos.margin)}</p>
          </div>
          {liqPrice && (
            <div>
              <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 1 }}>Liq.</p>
              <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-bear)' }}>{formatPrice(liqPrice, pos.symbol)}</p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--t-bear)', color: 'var(--t-bear)', background: 'var(--t-bear-s)',
            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--t-bear)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--t-bear-s)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t-bear)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Market Ticker Card (horizontal scroll) ───────────────────────────────────

function TickerCard({ symbol, name, onClick }: { symbol: string; name: string; onClick: () => void }) {
  const { tickers } = useTradingStore()
  const t = tickers[symbol]
  const isUp = (t?.changePercent ?? 0) >= 0

  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 120, background: 'var(--t-surface)', border: '1px solid var(--t-border)',
        borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--t-border-hover)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--t-border)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-1)' }}>{symbol}</span>
        {t && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
            background: isUp ? 'var(--t-bull-s)' : 'var(--t-bear-s)',
            color: isUp ? 'var(--t-bull)' : 'var(--t-bear)',
          }}>
            {isUp ? '+' : ''}{t.changePercent.toFixed(2)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--t-text-1)' }}>
        {t ? formatPrice(t.price, symbol) : '—'}
      </p>
      <p style={{ fontSize: 10, color: 'var(--t-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{name}</p>
    </button>
  )
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: Order }) {
  const isBuy   = order.side === 'buy'
  const statColor = order.status === 'filled' ? 'var(--t-bull)' : 'var(--t-text-3)'
  const statBg    = order.status === 'filled' ? 'var(--t-bull-s)' : 'var(--t-surface-2)'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '44px 1fr auto auto',
      gap: '0 12px', alignItems: 'center',
      padding: '11px 16px',
      borderBottom: '1px solid var(--t-border)',
    }}>
      <span style={{
        display: 'inline-block', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '3px 0',
        borderRadius: 6, background: isBuy ? 'var(--t-bull-s)' : 'var(--t-bear-s)',
        color: isBuy ? 'var(--t-bull)' : 'var(--t-bear)',
      }}>
        {order.side.toUpperCase()}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-1)' }}>{order.symbol}</p>
        <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginTop: 1 }}>
          {order.quantity} · {order.fill_price ? formatPrice(order.fill_price, order.symbol) : 'Market'}
        </p>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: statBg, color: statColor }}>{order.status}</span>
      <p style={{ fontSize: 10, color: 'var(--t-text-3)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

// ─── Tool Button ─────────────────────────────────────────────────────────────

function ToolButton({ label, sub, icon, accent, path }: { label: string; sub: string; icon: React.ReactNode; accent: string; path: string }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => navigate(path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '14px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
        background: hov ? `${accent}18` : `${accent}0c`,
        border: `1px solid ${hov ? accent + '44' : accent + '1a'}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}1c`, color: accent }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text-1)', lineHeight: 1.3 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginTop: 2 }}>{sub}</p>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const WATCHLIST = [
  { symbol: 'BTCUSD',  name: 'Bitcoin' },
  { symbol: 'ETHUSD',  name: 'Ethereum' },
  { symbol: 'XAUUSD',  name: 'Gold' },
  { symbol: 'EURUSD',  name: 'EUR/USD' },
  { symbol: 'GBPUSD',  name: 'GBP/USD' },
  { symbol: 'US500',   name: 'S&P 500' },
  { symbol: 'USTEC',   name: 'Nasdaq 100' },
  { symbol: 'WTI',     name: 'Crude Oil' },
]

const TOOLS = [
  { label: 'WebTrader', sub: 'Live charts',    accent: '#3b82f6', path: '/dashboard/trade',            icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { label: 'TradePilot',sub: 'AI bots',        accent: '#8b5cf6', path: '/dashboard/bots',             icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M9 11V7a3 3 0 016 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/></svg> },
  { label: 'Scanner',   sub: 'Market scan',    accent: '#f59e0b', path: '/dashboard/scanner',          icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
  { label: 'Analytics', sub: 'Performance',    accent: '#06b6d4', path: '/dashboard/analytics',        icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { label: 'Calendar',  sub: 'Eco events',     accent: '#10b981', path: '/dashboard/economic-calendar',icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label: 'Leaderboard',sub:'Rankings',       accent: '#f472b6', path: '/dashboard/leaderboard',      icon: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    tickers, symbols, portfolio, orders,
    loadPortfolio, loadOrders, loadAnalytics,
    performanceStats, closePosition, setSelectedSymbol,
  } = useTradingStore()

  const [kycStatus]   = useState(() => getKYCStatus())
  const [closingPos, setClosingPos] = useState<string | null>(null)

  useEffect(() => {
    loadPortfolio()
    loadOrders()
    loadAnalytics()
    const id = setInterval(loadPortfolio, 6000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders, loadAnalytics])

  const equity   = portfolio?.totalEquity  ?? user?.balance ?? 0
  const cash     = portfolio?.cashBalance  ?? user?.balance ?? 0
  const upnl     = portfolio?.unrealizedPnl ?? 0
  const rpnl     = portfolio?.realizedPnl   ?? 0
  const todayPnl = 0
  const positions = portfolio?.positions ?? []
  const totalTrades = performanceStats?.totalTrades ?? 0
  const winRate     = performanceStats?.winRate ?? 0

  const recentOrders = orders.slice(0, 8)

  const handleClose = useCallback(async (id: string) => {
    setClosingPos(id)
    try { await closePosition(id) } finally { setClosingPos(null) }
  }, [closePosition])

  const goTrade = useCallback((sym: string) => {
    setSelectedSymbol(sym)
    navigate('/dashboard/trade')
  }, [setSelectedSymbol, navigate])

  // ─── Layout vars ────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--t-surface)',
    border: '1px solid var(--t-border)',
    borderRadius: 14,
    overflow: 'hidden',
  }
  const sectionHead: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid var(--t-border)',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--t-text-2)',
  }
  const linkBtn: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--t-accent)', cursor: 'pointer',
    background: 'none', border: 'none', padding: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto', paddingBottom: 8 }}>

      {/* ── KYC Banner ──────────────────────────────────────────────────────── */}
      {kycStatus === 'unverified' && (
        <div
          onClick={() => navigate('/dashboard/verify')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--t-warn-s)', border: '1px solid var(--t-warn)', flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-warn-s)', border: '1px solid var(--t-warn)', flexShrink: 0 }}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-warn)' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-warn)' }}>Verify your account</p>
              <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginTop: 2 }}>Submit your ID to unlock full trading access and withdrawal limits.</p>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--t-warn)', color: 'var(--t-warn)', background: 'var(--t-warn-s)', flexShrink: 0 }}>
            Verify Now →
          </span>
        </div>
      )}

      {kycStatus === 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'var(--t-accent-s)', border: '1px solid var(--t-accent)' }}>
          <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-accent)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-accent)' }}>Verification under review</p>
            <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginTop: 2 }}>Documents submitted — typically reviewed within 1–2 business days.</p>
          </div>
          <button onClick={() => navigate('/dashboard/verify')} style={{ ...linkBtn, flexShrink: 0 }}>Details →</button>
        </div>
      )}

      {/* ── Greeting ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t-text-1)', margin: 0 }}>
            {greeting()},{' '}
            <span style={{ color: 'var(--t-accent)' }}>{user?.username ?? 'Trader'}</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--t-text-3)', marginTop: 4 }}>{shortDate()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'var(--t-bull-s)', border: '1px solid var(--t-bull)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t-bull)', animation: 'pulse2 2s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-bull)' }}>MARKETS LIVE</span>
          </div>
          <button
            onClick={() => navigate('/dashboard/trade')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              background: 'var(--t-accent)', color: '#fff', fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            New Trade
          </button>
        </div>
      </div>

      {/* ── Account Hero ─────────────────────────────────────────────────────── */}
      <div style={{
        ...cardStyle, padding: 0,
        background: 'linear-gradient(160deg, var(--t-surface) 0%, var(--t-surface-2) 100%)',
      }}>
        {/* Main equity row */}
        <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid var(--t-border)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-text-3)', marginBottom: 6 }}>Total Equity</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 34, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--t-text-1)', lineHeight: 1 }}>
                {formatCurrency(equity)}
              </p>
              {todayPnl !== 0 && (
                <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: todayPnl >= 0 ? 'var(--t-bull)' : 'var(--t-bear)' }}>
                  {fmtChange(todayPnl, '$')} today
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate('/dashboard/deposit')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
                  background: 'var(--t-accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                Deposit
              </button>
              <button
                onClick={() => navigate('/dashboard/withdraw')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
                  background: 'var(--t-surface-3)', color: 'var(--t-text-1)', fontSize: 13, fontWeight: 700,
                  border: '1px solid var(--t-border)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--t-border-hover)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--t-surface-2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--t-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--t-surface-3)' }}
              >
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Stat chips grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
          {[
            { l: 'Cash Balance',   v: formatCurrency(cash),                                      c: 'var(--t-text-1)' },
            { l: 'Open Positions', v: String(positions.length),                                   c: 'var(--t-accent)' },
            { l: 'Unrealized P&L', v: (upnl >= 0 ? '+' : '') + formatCurrency(upnl),             c: upnl >= 0 ? 'var(--t-bull)' : 'var(--t-bear)' },
            { l: 'Realized P&L',   v: (rpnl >= 0 ? '+' : '') + formatCurrency(rpnl),             c: rpnl >= 0 ? 'var(--t-bull)' : 'var(--t-bear)' },
          ].map((item, i) => (
            <div key={item.l} style={{
              padding: '14px 22px',
              borderRight: i % 2 === 0 ? '1px solid var(--t-border)' : 'none',
              borderTop: i >= 2 ? '1px solid var(--t-border)' : 'none',
            }}>
              <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginBottom: 4 }}>{item.l}</p>
              <p style={{ fontSize: 17, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: item.c }}>{item.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop 2-column from here ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="dash-grid">

        {/* LEFT: Positions + Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Open Positions */}
          {positions.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={sectionTitle}>Open Positions</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--t-accent-s)', color: 'var(--t-accent)' }}>{positions.length}</span>
                </div>
                <button onClick={() => navigate('/dashboard/portfolio')} style={linkBtn}>View all →</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {positions.map((pos: Position) => (
                  <div key={pos.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--t-border)' }}>
                    <PositionCard
                      pos={pos}
                      onClose={() => { if (!closingPos) handleClose(pos.id) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance summary */}
          <div style={cardStyle}>
            <div style={sectionHead}>
              <span style={sectionTitle}>Performance</span>
              <button onClick={() => navigate('/dashboard/analytics')} style={linkBtn}>Analytics →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 16 }}>
              <StatChip label="Win Rate"     value={totalTrades > 0 ? `${(winRate * 100).toFixed(1)}%` : '—'} color={winRate >= 0.5 ? 'var(--t-bull)' : 'var(--t-bear)'} />
              <StatChip label="Total Trades" value={String(totalTrades)} />
              <StatChip label="Realized P&L" value={(rpnl >= 0 ? '+' : '') + formatCurrency(rpnl)} color={rpnl >= 0 ? 'var(--t-bull)' : 'var(--t-bear)'} />
              <StatChip label="Open Pos."    value={String(positions.length)} color="var(--t-accent)" />
            </div>
          </div>

          {/* Recent Orders */}
          <div style={cardStyle}>
            <div style={sectionHead}>
              <span style={sectionTitle}>Recent Orders</span>
              <button onClick={() => navigate('/dashboard/orders')} style={linkBtn}>All orders →</button>
            </div>
            {recentOrders.length === 0 ? (
              <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--t-accent-s)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--t-accent)' }}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-text-2)' }}>No orders yet</p>
                <p style={{ fontSize: 12, color: 'var(--t-text-3)' }}>Place your first trade to get started</p>
                <button
                  onClick={() => navigate('/dashboard/trade')}
                  style={{ marginTop: 4, padding: '9px 20px', borderRadius: 10, background: 'var(--t-accent)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Open Trade
                </button>
              </div>
            ) : (
              <div>
                {recentOrders.map((o: Order) => <OrderRow key={o.id} order={o} />)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Watchlist + Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }} className="dash-right">

          {/* Live Markets */}
          <div style={cardStyle}>
            <div style={sectionHead}>
              <span style={sectionTitle}>Markets</span>
              <button onClick={() => navigate('/dashboard/trade')} style={linkBtn}>Full terminal →</button>
            </div>
            {/* Mobile: horizontal scroll; Desktop: grid */}
            <div style={{ overflowX: 'auto', scrollbarWidth: 'none', padding: '14px 16px', display: 'flex', gap: 10 }} className="hide-scrollbar">
              {WATCHLIST.map(w => (
                <TickerCard key={w.symbol} symbol={w.symbol} name={w.name} onClick={() => goTrade(w.symbol)} />
              ))}
            </div>

            {/* Also show all symbols as a compact table on wider screens */}
            <div style={{ borderTop: '1px solid var(--t-border)' }} className="mkt-table">
              {symbols.slice(0, 12).map(sym => {
                const t = tickers[sym.symbol]
                const up = (t?.changePercent ?? 0) >= 0
                return (
                  <button
                    key={sym.symbol}
                    onClick={() => goTrade(sym.symbol)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid var(--t-border)', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--t-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: sym.assetClass === 'crypto' ? 'rgba(245,158,11,0.12)' : sym.assetClass === 'forex' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                        color: sym.assetClass === 'crypto' ? '#f59e0b' : sym.assetClass === 'forex' ? '#3b82f6' : '#8b5cf6',
                        fontSize: 11, fontWeight: 800,
                      }}>
                        {sym.symbol.charAt(0)}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-1)' }}>{sym.symbol}</p>
                        <p style={{ fontSize: 10, color: 'var(--t-text-3)' }}>{sym.name}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t-text-1)' }}>
                        {t ? formatPrice(t.price, sym.symbol) : '—'}
                      </p>
                      <p style={{ fontSize: 10, fontWeight: 600, color: up ? 'var(--t-bull)' : 'var(--t-bear)' }}>
                        {t ? (up ? '+' : '') + t.changePercent.toFixed(2) + '%' : '—'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tools */}
          <div style={cardStyle}>
            <div style={sectionHead}>
              <span style={sectionTitle}>Platform Tools</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: 16 }}>
              {TOOLS.map(t => <ToolButton key={t.label} {...t} />)}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
