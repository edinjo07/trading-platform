import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/formatters'

// ─── Seeded sparkline (stable across renders) ─────────────────────────────────
function seedSparkline(symbol: string, up: boolean, pts = 18): string {
  let h = 0
  for (let i = 0; i < symbol.length; i++) h = ((h * 31) + symbol.charCodeAt(i)) >>> 0
  const rng = () => { h = ((h * 1664525) + 1013904223) >>> 0; return h / 4294967295 }
  const W = 64, H = 26
  let y = H / 2
  const points: string[] = []
  for (let i = 0; i < pts; i++) {
    const x = (i / (pts - 1)) * W
    y = y + (rng() - 0.48) * 5 + (up ? -0.3 : 0.3)
    y = Math.max(3, Math.min(H - 3, y))
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return points.join(' ')
}

// ─── Asset icon ───────────────────────────────────────────────────────────────
const ASSET_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  crypto:    { bg: '#f59e0b22', fg: '#f59e0b', label: '₿' },
  forex:     { bg: '#3b82f622', fg: '#60a5fa', label: 'FX' },
  stock:     { bg: '#8b5cf622', fg: '#a78bfa', label: 'S'  },
  commodity: { bg: '#f97316 22', fg: '#fb923c', label: 'C' },
  index:     { bg: '#0ea5e922', fg: '#38bdf8', label: 'I'  },
  bond:      { bg: '#10b98122', fg: '#34d399', label: 'B'  },
}

function AssetIcon({ symbol, assetClass }: { symbol: string; assetClass?: string }) {
  const cls = assetClass ?? 'crypto'
  const style = ASSET_COLORS[cls] ?? ASSET_COLORS.crypto
  const letter = symbol.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: style.bg, color: style.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, flexShrink: 0,
      border: `1px solid ${style.fg}33`,
    }}>
      {letter}
    </div>
  )
}

// ─── Asset card (Capital.com style: Sell | chart | Buy) ────────────────────────
function AssetCard({ symbol, name, assetClass }: { symbol: string; name: string; assetClass?: string }) {
  const { tickers, setSelectedSymbol } = useTradingStore()
  const navigate = useNavigate()
  const t = tickers[symbol]
  const up = (t?.changePercent ?? 0) >= 0
  const price = t?.price ?? 0
  const spread = (t?.spread ?? price * 0.0002)
  const bid = price - spread / 2
  const ask = price + spread / 2

  const sparkPts = useMemo(() => seedSparkline(symbol, up), [symbol, up])

  const fmt = (v: number) => {
    if (!v) return '—'
    if (v >= 10000) return v.toFixed(1)
    if (v >= 100)   return v.toFixed(2)
    if (v >= 1)     return v.toFixed(4)
    return v.toFixed(5)
  }

  const handleTrade = (side: 'buy' | 'sell') => {
    setSelectedSymbol(symbol)
    navigate('/dashboard/trade')
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
      marginBottom: 2,
    }}>
      {/* Top row: icon + name + change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 6px' }}>
        <AssetIcon symbol={symbol} assetClass={assetClass} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{name}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{symbol}</p>
        </div>
        {t && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: up ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
            color: up ? '#00c878' : '#ff3047',
          }}>
            {up ? '+' : ''}{t.changePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Sell | Chart | Buy row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0 }}>
        {/* Sell button */}
        <button
          onClick={() => handleTrade('sell')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            padding: '6px 14px 10px', background: 'rgba(255,48,71,0.08)',
            border: 'none', cursor: 'pointer', borderBottomLeftRadius: 14,
            borderTop: '1px solid rgba(255,48,71,0.15)',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff3047', marginBottom: 2 }}>SELL</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#ff3047' }}>
            {fmt(bid)}
          </span>
        </button>

        {/* Mini chart */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <svg width="64" height="26" viewBox="0 0 64 26" style={{ display: 'block' }}>
            <polyline
              points={sparkPts}
              fill="none"
              stroke={up ? '#00c878' : '#ff3047'}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Buy button */}
        <button
          onClick={() => handleTrade('buy')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            padding: '6px 14px 10px', background: 'rgba(14,165,233,0.08)',
            border: 'none', cursor: 'pointer', borderBottomRightRadius: 14,
            borderTop: '1px solid rgba(14,165,233,0.15)',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', marginBottom: 2 }}>BUY</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>
            {fmt(ask)}
          </span>
        </button>
      </div>
    </div>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'favourites', label: 'Favourites',
    symbols: [
      { symbol: 'XAUUSD', name: 'Gold',          assetClass: 'commodity' },
      { symbol: 'BTCUSD', name: 'Bitcoin/USD',   assetClass: 'crypto'   },
      { symbol: 'ETHUSD', name: 'Ethereum/USD',  assetClass: 'crypto'   },
      { symbol: 'EURUSD', name: 'EUR/USD',        assetClass: 'forex'    },
      { symbol: 'US500',  name: 'US 500',         assetClass: 'index'    },
    ],
  },
  {
    id: 'popular', label: 'Popular',
    symbols: [
      { symbol: 'XAUUSD', name: 'Gold',          assetClass: 'commodity' },
      { symbol: 'WTI',    name: 'Crude Oil Spot', assetClass: 'commodity' },
      { symbol: 'BTCUSD', name: 'Bitcoin/USD',   assetClass: 'crypto'   },
      { symbol: 'US100',  name: 'US Tech 100',   assetClass: 'index'    },
      { symbol: 'ETHUSD', name: 'Ethereum/USD',  assetClass: 'crypto'   },
      { symbol: 'US500',  name: 'US 500',         assetClass: 'index'    },
      { symbol: 'EURUSD', name: 'EUR/USD',        assetClass: 'forex'    },
      { symbol: 'GBPUSD', name: 'GBP/USD',        assetClass: 'forex'    },
      { symbol: 'XAGUSD', name: 'Silver',         assetClass: 'commodity' },
    ],
  },
  {
    id: 'crypto', label: 'Crypto',
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin/USD',   assetClass: 'crypto' },
      { symbol: 'ETHUSD', name: 'Ethereum/USD',  assetClass: 'crypto' },
      { symbol: 'BNBUSD', name: 'BNB/USD',       assetClass: 'crypto' },
      { symbol: 'SOLUSD', name: 'Solana/USD',    assetClass: 'crypto' },
      { symbol: 'ADAUSD', name: 'Cardano/USD',   assetClass: 'crypto' },
      { symbol: 'DOGEUSD',name: 'Dogecoin/USD',  assetClass: 'crypto' },
    ],
  },
  {
    id: 'forex', label: 'Forex',
    symbols: [
      { symbol: 'EURUSD', name: 'EUR/USD',  assetClass: 'forex' },
      { symbol: 'GBPUSD', name: 'GBP/USD',  assetClass: 'forex' },
      { symbol: 'USDJPY', name: 'USD/JPY',  assetClass: 'forex' },
      { symbol: 'AUDUSD', name: 'AUD/USD',  assetClass: 'forex' },
      { symbol: 'USDCAD', name: 'USD/CAD',  assetClass: 'forex' },
      { symbol: 'USDCHF', name: 'USD/CHF',  assetClass: 'forex' },
    ],
  },
  {
    id: 'indices', label: 'Indices',
    symbols: [
      { symbol: 'US500',  name: 'US 500',          assetClass: 'index' },
      { symbol: 'US100',  name: 'US Tech 100',     assetClass: 'index' },
      { symbol: 'US30',   name: 'US Wall St 30',   assetClass: 'index' },
      { symbol: 'UK100',  name: 'UK 100',           assetClass: 'index' },
      { symbol: 'GER40',  name: 'Germany 40',       assetClass: 'index' },
      { symbol: 'J225',   name: 'Japan 225',        assetClass: 'index' },
    ],
  },
  {
    id: 'commodities', label: 'Commodities',
    symbols: [
      { symbol: 'XAUUSD', name: 'Gold',         assetClass: 'commodity' },
      { symbol: 'XAGUSD', name: 'Silver',        assetClass: 'commodity' },
      { symbol: 'WTI',    name: 'Oil – Crude',   assetClass: 'commodity' },
      { symbol: 'BRENT',  name: 'Oil – Brent',   assetClass: 'commodity' },
      { symbol: 'NGAS',   name: 'Natural Gas',   assetClass: 'commodity' },
    ],
  },
]

export default function WatchlistsPage() {
  const { portfolio } = useTradingStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('favourites')
  const equity = portfolio?.totalEquity ?? user?.balance ?? 0

  const tab = TABS.find(t => t.id === activeTab) ?? TABS[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#000' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Balance row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px',
          }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatCurrency(equity)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={1.8}>
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
              </svg>
            </button>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={1.8}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.07)',
                color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.55)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset list */}
      <div style={{ flex: 1, padding: '10px 12px 80px' }}>
        {tab.symbols.map(({ symbol, name, assetClass }) => (
          <AssetCard key={symbol} symbol={symbol} name={name} assetClass={assetClass} />
        ))}
      </div>
    </div>
  )
}
