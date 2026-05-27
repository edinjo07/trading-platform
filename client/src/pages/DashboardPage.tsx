import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import type { Position } from '../types'

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

// ─── Asset class icon ─────────────────────────────────────────────────────────
const ICON_STYLES: Record<string, { bg: string; fg: string }> = {
  crypto:    { bg: '#f59e0b20', fg: '#f59e0b' },
  forex:     { bg: '#3b82f620', fg: '#60a5fa' },
  stock:     { bg: '#8b5cf620', fg: '#a78bfa' },
  commodity: { bg: '#f9731620', fg: '#fb923c' },
  index:     { bg: '#0ea5e920', fg: '#38bdf8' },
  bond:      { bg: '#10b98120', fg: '#34d399' },
}
function AssetDot({ symbol, assetClass }: { symbol: string; assetClass?: string }) {
  const s = ICON_STYLES[assetClass ?? 'crypto'] ?? ICON_STYLES.crypto
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: s.bg, color: s.fg, border: `1.5px solid ${s.fg}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
    }}>
      {symbol.slice(0, 2)}
    </div>
  )
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
      <AssetDot symbol={symbol} assetClass={assetClass} />
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
  const s = ICON_STYLES[assetClass ?? 'crypto'] ?? ICON_STYLES.crypto
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 8px', borderRadius: 14, background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: s.bg,
        color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800,
      }}>
        {symbol.slice(0, 2)}
      </div>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { tickers, portfolio, orders, loadPortfolio, loadOrders, closePosition, setSelectedSymbol } = useTradingStore()

  const [closingId, setClosingId] = useState<string | null>(null)
  const [moversTab, setMoversTab] = useState<'risers' | 'fallers'>('risers')

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

  // ─── BG gradient (Capital.com gold/amber at top) ──────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#000' }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
            {formatCurrency(equity)}
          </span>
        </div>
        <button
          onClick={() => navigate('/dashboard/portfolio')}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
        </button>
        <button
          onClick={() => navigate('/dashboard/profile')}
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* ── Gold gradient banner ── */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(180,120,0,0.18) 0%, transparent 100%)',
          padding: '20px 16px 0',
        }}>
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

          {/* ── Curated watchlists ── */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Curated watchlists" onMore={() => navigate('/dashboard/watchlists')} />
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
