import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/ui/BrandMark'
import AssetIcon from '../components/ui/AssetIcon'
import { getTickers, getSymbols } from '../api/markets'
import { formatPrice } from '../utils/formatters'
import type { Ticker, MarketSymbol } from '../types'

/* ════════════════════════════════════════════════════════════════════════════
   TradeX homepage, IC-Markets grade.

   Structure mirrors the reference: utility bar → main nav (tagline +
   racing badge + More menu) → full-bleed photo hero with one huge
   centered headline and one CTA → light ratings band → big stats strip →
   the quote board ("Raw Spread Advantage") → TradePilot → live markets →
   platform → pricing → closer → footer.

   Ours beats the reference in one way: every quote on the board is live.
   Palette stays TradeX: near-black warm ground, Victory Gold CTAs,
   neon bull-green digits on the board.
   ════════════════════════════════════════════════════════════════════════════ */

const NIGHT   = '#121010'
const NIGHT2  = '#1c1717'
const PANEL   = '#171313'
const IVORY   = '#f7f2e6'
const BODY    = '#c9bcae'
const DIM     = '#8d7d6a'
const GOLD    = '#f2b84b'
const GOLD_G  = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const BLUE    = '#6f9dff'
const BULL    = '#18c98a'
const NEON    = '#2ee6a0'   // quote-board digits, brighter than P&L green
const BEAR    = '#ff5a72'
const PAPER   = '#f4efe4'
const INK     = '#241d16'

const SERIF = "'Fraunces', Georgia, serif"
const MONO  = "'JetBrains Mono', monospace"
const HAIR  = 'rgba(242,184,75,0.09)'

const BOARD_SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD']
const POPULAR = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'NVDA', 'AAPL', 'TSLA', 'US500']

const MARKET_TABS: { key: string; label: string }[] = [
  { key: 'popular',   label: 'Popular' },
  { key: 'crypto',    label: 'Crypto' },
  { key: 'forex',     label: 'Forex' },
  { key: 'stock',     label: 'Stocks' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'index',     label: 'Indices' },
]

const PLANS = [
  {
    name: 'Standard', popular: false,
    spread: 'From 1.0 pip', commission: '$0 commission', min: '$200 min deposit',
    line: 'Simple pricing for getting started. Everything included, nothing to calculate.',
  },
  {
    name: 'Raw Spread', popular: true,
    spread: 'From 0.0 pips', commission: '$3.50 / lot', min: '$200 min deposit',
    line: 'Raw interbank pricing. The plan most of our traders run.',
  },
  {
    name: 'cTrader Raw', popular: false,
    spread: 'From 0.0 pips', commission: '$3.00 / lot', min: '$200 min deposit',
    line: 'The lowest commission on the grid, on cTrader.',
  },
]

/* Simulated 90-day TradePilot practice run, deterministic walk. */
const EQUITY: number[] = (() => {
  const out: number[] = []
  let v = 100
  let seed = 42
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let i = 0; i < 90; i++) {
    v = Math.max(88, v + 0.55 + (rnd() - 0.47) * 3.2)
    out.push(v)
  }
  const scale = 138.4 / out[out.length - 1]
  return out.map((x, i) => 100 + (x - 100) * ((scale - 1) * (i / (out.length - 1)) + 1))
})()

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtPct(p: number) { return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%` }

/* Broker-style big-digit price: 1.14143 → ["1.14", "14", "3"] */
function splitDigits(price: number, symbol: string): [string, string, string] {
  if (symbol === 'EURUSD' || symbol === 'GBPUSD') {
    const s = price.toFixed(5)
    return [s.slice(0, 4), s.slice(4, 6), s.slice(6)]
  }
  const s = price.toFixed(2)
  const [int, dec] = s.split('.')
  const intFmt = Number(int).toLocaleString('en-US')
  return [`${intFmt}.`, dec, '']
}

function Wordmark() {
  return (
    <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: 19 }}>
      <span style={{ color: IVORY }}>Trade</span>
      <span style={{ color: GOLD }}>X</span>
    </span>
  )
}

function GoldBtn({ children, onClick, big = false, wide = false }: {
  children: React.ReactNode; onClick: () => void; big?: boolean; wide?: boolean
}) {
  return (
    <button onClick={onClick} className="lx-gold" style={{
      background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
      borderRadius: 10, fontWeight: 800, letterSpacing: '0.01em',
      fontSize: big ? 16 : 13.5, padding: big ? '16px 40px' : '10px 22px',
      width: wide ? '100%' : undefined,
      boxShadow: '0 2px 6px rgba(16,9,4,0.4), 0 10px 30px rgba(242,184,75,0.2)',
    }}>
      {children}
    </button>
  )
}

function LineBtn({ children, onClick, dark = false, big = false }: {
  children: React.ReactNode; onClick: () => void; dark?: boolean; big?: boolean
}) {
  return (
    <button onClick={onClick} className="lx-ghost" style={{
      background: 'transparent', cursor: 'pointer', borderRadius: 10,
      fontWeight: 700, fontSize: big ? 15 : 13.5, padding: big ? '15px 34px' : '10px 22px',
      color: dark ? INK : IVORY,
      border: `1.5px solid ${dark ? 'rgba(36,29,22,0.4)' : 'rgba(247,242,230,0.3)'}`,
    }}>
      {children}
    </button>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
      color: GOLD, marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.025em',
      lineHeight: 1.06, color: IVORY, margin: '0 0 14px',
    }}>
      {children}
    </h2>
  )
}

function StartLights({ lit, size = 12 }: { lit: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: size * 0.6 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < lit ? GOLD : 'rgba(141,125,106,0.25)',
          boxShadow: i < lit ? `0 0 ${size}px rgba(242,184,75,0.5)` : 'none',
        }} />
      ))}
    </div>
  )
}

function Star() {
  return (
    <span style={{
      width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: GOLD, borderRadius: 4,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#221503">
        <path d="M12 2l2.9 6.26 6.86.55-5.22 4.48 1.6 6.7L12 16.4 5.86 20l1.6-6.7L2.24 8.8l6.86-.55L12 2z" />
      </svg>
    </span>
  )
}

/* ── The quote board: live, neon, broker-grade ────────────────────────────── */

function QuoteTile({ t, symbol, go }: { t?: Ticker; symbol: string; go: () => void }) {
  const up = (t?.changePercent ?? 0) >= 0
  const bid = t?.bid ?? t?.price ?? 0
  const ask = t?.ask ?? (t ? t.price * 1.0002 : 0)
  const [bp, bb, bs] = splitDigits(bid, symbol)
  const [ap, ab, as_] = splitDigits(ask, symbol)
  const spread = t?.spread ?? (ask - bid)
  const spreadLabel = symbol === 'EURUSD' || symbol === 'GBPUSD'
    ? (spread * 10000).toFixed(1)
    : spread.toFixed(2)

  return (
    <div style={{ background: '#0e0b0b', border: '1px solid rgba(46,230,160,0.1)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid rgba(46,230,160,0.08)' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: IVORY, letterSpacing: '0.02em' }}>{symbol}</span>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke={up ? NEON : BEAR} strokeWidth="1.5" style={{ marginLeft: 'auto' }}>
          <polyline points="1,9 6,6 10,8 15,3 19,5 25,1" />
        </svg>
        <span style={{ fontSize: 11.5, fontFamily: MONO, fontWeight: 700, color: up ? NEON : BEAR }}>
          {t ? fmtPct(t.changePercent) : '--'}
        </span>
        <span style={{ color: up ? NEON : BEAR, fontSize: 9 }}>{up ? '▲' : '▼'}</span>
      </div>

      {/* Bid / Ask big digits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 12px 8px' }}>
        {[['Bid', bp, bb, bs], ['Ask', ap, ab, as_]].map(([label, pre, bigd, sup]) => (
          <div key={label as string}>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: MONO, color: NEON, textShadow: '0 0 14px rgba(46,230,160,0.35)', lineHeight: 1, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 14 }}>{pre}</span>
              <span style={{ fontSize: 27, fontWeight: 700 }}>{bigd}</span>
              {sup ? <sup style={{ fontSize: 12, top: '-0.7em', position: 'relative' }}>{sup}</sup> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Spread + Buy/Sell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px 10px' }}>
        <span style={{
          fontSize: 10.5, fontFamily: MONO, color: BODY, background: 'rgba(247,242,230,0.05)',
          border: '1px solid rgba(247,242,230,0.08)', borderRadius: 6, padding: '3px 9px',
        }}>
          Spread <span style={{ color: IVORY, fontWeight: 700 }}>{t ? spreadLabel : '--'}</span>
        </span>
        <button onClick={go} className="lx-mini" style={{ marginLeft: 'auto', width: 52, background: 'rgba(46,230,160,0.12)', color: NEON, border: '1px solid rgba(46,230,160,0.3)' }}>
          BUY
        </button>
        <button onClick={go} className="lx-mini" style={{ width: 52, background: 'rgba(255,90,114,0.1)', color: BEAR, border: '1px solid rgba(255,90,114,0.28)' }}>
          SELL
        </button>
      </div>
    </div>
  )
}

/* ── TradePilot console ───────────────────────────────────────────────────── */

function PilotConsole({ go }: { go: () => void }) {
  const min = Math.min(...EQUITY)
  const max = Math.max(...EQUITY)
  const W = 560, H = 190
  const pts = EQUITY.map((v, i) => {
    const x = (i / (EQUITY.length - 1)) * W
    const y = H - ((v - min) / (max - min)) * (H - 16) - 8
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.join(' ')
  const fill = `0,${H} ${line} ${W},${H}`

  return (
    <div style={{
      background: NIGHT2, border: '1px solid rgba(111,157,255,0.16)', borderRadius: 20,
      boxShadow: '0 1px 2px rgba(6,4,4,0.5), 0 30px 80px rgba(6,4,4,0.45)',
      padding: 'clamp(20px, 2.6vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: BLUE,
          border: '1px solid rgba(111,157,255,0.3)', borderRadius: 999, padding: '4px 12px',
        }}>TRADEPILOT</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: IVORY }}>Momentum-X</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: BULL }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: BULL, boxShadow: '0 0 8px rgba(24,201,138,0.6)', animation: 'lx-pulse 1.8s ease-in-out infinite' }} />
          RUNNING
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 180, display: 'block' }}>
          <defs>
            <linearGradient id="lx-eq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(24,201,138,0.3)" />
              <stop offset="100%" stopColor="rgba(24,201,138,0)" />
            </linearGradient>
          </defs>
          <polygon points={fill} fill="url(#lx-eq)" />
          <polyline points={line} fill="none" stroke={BULL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', top: 6, right: 8, textAlign: 'right' }}>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: BULL }}>+38.4%</div>
          <div style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM }}>90-day practice run</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[['$100k → $138.4k', 'equity'], ['64%', 'win rate'], ['7.8%', 'max drawdown'], ['1,204', 'trades']].map(([v, l]) => (
          <div key={l} style={{
            flex: '1 1 100px', padding: '10px 14px', borderRadius: 12,
            background: 'rgba(14,11,11,0.6)', border: `1px solid ${HAIR}`,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <GoldBtn onClick={go} wide big>Deploy TradePilot free</GoldBtn>
      <div style={{ fontSize: 10.5, color: DIM, textAlign: 'center', lineHeight: 1.5 }}>
        Simulated practice results on live prices. Markets carry risk and returns are never guaranteed.
      </div>
    </div>
  )
}

/* ── Live markets board ───────────────────────────────────────────────────── */

function MarketsBoard({ tickers, meta, go }: {
  tickers: Record<string, Ticker>
  meta: Record<string, MarketSymbol>
  go: () => void
}) {
  const [tab, setTab] = useState('popular')

  const rows = useMemo(() => {
    const all = Object.values(tickers)
    if (all.length === 0) return []
    let list: Ticker[]
    if (tab === 'popular') {
      list = POPULAR.map(s => tickers[s]).filter(Boolean) as Ticker[]
    } else {
      list = all
        .filter(t => meta[t.symbol]?.assetClass === tab)
        .sort((a, b) => b.volume24h - a.volume24h)
    }
    return list.slice(0, 10)
  }, [tickers, meta, tab])

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {MARKET_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: tab === t.key ? 'rgba(242,184,75,0.14)' : NIGHT2,
              color: tab === t.key ? GOLD : BODY,
              border: `1px solid ${tab === t.key ? 'rgba(242,184,75,0.4)' : HAIR}`,
              transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 16, border: `1px solid ${HAIR}`, overflow: 'hidden', background: PANEL }}>
        <div className="lx-mhead" style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 90px 172px', gap: 12,
          padding: '12px 20px', borderBottom: `1px solid ${HAIR}`,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM,
        }}>
          <span>Market</span>
          <span style={{ textAlign: 'right' }}>Price</span>
          <span style={{ textAlign: 'right' }}>24h</span>
          <span style={{ textAlign: 'center' }}>Buy / Sell</span>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: DIM }}>
            Warming up the price feed…
          </div>
        )}

        {rows.map(t => {
          const up = t.changePercent >= 0
          const m = meta[t.symbol]
          return (
            <div key={t.symbol} className="lx-mrow lx-mgrid" onClick={go} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 90px 172px', gap: 12, alignItems: 'center',
              padding: '12px 20px', borderBottom: '1px solid rgba(242,184,75,0.05)', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <AssetIcon symbol={t.symbol} assetClass={m?.assetClass ?? 'crypto'} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m?.name ?? t.symbol}
                  </div>
                  <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.04em' }}>{t.symbol}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 14, color: IVORY }}>
                {formatPrice(t.price, t.symbol)}
              </div>
              <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: up ? BULL : BEAR }}>
                {fmtPct(t.changePercent)}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="lx-mini" onClick={e => { e.stopPropagation(); go() }} style={{
                  width: 76, background: 'rgba(24,201,138,0.12)', color: BULL, border: '1px solid rgba(24,201,138,0.28)',
                }}>
                  {t.ask ? formatPrice(t.ask, t.symbol) : 'Buy'}
                </button>
                <button className="lx-mini" onClick={e => { e.stopPropagation(); go() }} style={{
                  width: 76, background: 'rgba(255,90,114,0.12)', color: BEAR, border: '1px solid rgba(255,90,114,0.28)',
                }}>
                  {t.bid ? formatPrice(t.bid, t.symbol) : 'Sell'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── The page ─────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const isAuthenticated = !!token
  const [scrolled, setScrolled] = useState(false)
  const [showBar, setShowBar] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const [tickers, setTickers] = useState<Record<string, Ticker>>({})
  const [meta, setMeta] = useState<Record<string, MarketSymbol>>({})

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 24)
      setShowBar(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    let dead = false
    getSymbols().then(list => {
      if (dead) return
      const m: Record<string, MarketSymbol> = {}
      for (const s of list) m[s.symbol] = s
      setMeta(m)
    }).catch(() => {})

    const pull = () => getTickers().then(list => {
      if (dead) return
      const t: Record<string, Ticker> = {}
      for (const x of list) t[x.symbol] = x
      setTickers(t)
    }).catch(() => {})
    pull()
    const iv = setInterval(pull, 5000)
    return () => { dead = true; clearInterval(iv) }
  }, [])

  const go = () => { setMenuOpen(false); setMoreOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login?mode=register') }
  const goTo = (path: string) => { setMenuOpen(false); setMoreOpen(false); navigate(path) }
  const jump = (id: string) => {
    setMenuOpen(false)
    setMoreOpen(false)
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  const COMPANY_LINKS: [string, () => void][] = [
    ['TradePilot in depth', () => goTo('/trading-pilot')],
    ['Account types & plans', () => goTo('/account-types')],
    ['Trading scams & safety', () => goTo('/trading-scams')],
    ['Sign in', () => goTo('/login')],
  ]
  const PLATFORM_LINKS: [string, () => void][] = [
    ['WebTrader', go],
    ['Market scanner', go],
    ['Analytics & telemetry', go],
    ['Leaderboard', go],
    ['Economic calendar', go],
    ['Forex calculators', go],
    ['Trading Web TV', go],
    ['Blog & insights', go],
  ]

  return (
    <div style={{ background: NIGHT, color: BODY, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @keyframes lx-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
        @keyframes lx-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .lx-rise { animation: lx-rise 0.7s cubic-bezier(0.2,0.7,0.3,1) both }
        .lx-gold { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease }
        .lx-gold:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16,9,4,0.45), 0 16px 44px rgba(242,184,75,0.3); filter: brightness(1.04) }
        .lx-gold:active { transform: translateY(0) }
        .lx-ghost { transition: border-color 0.18s ease, background 0.18s ease }
        .lx-ghost:hover { border-color: rgba(242,184,75,0.55); background: rgba(242,184,75,0.06) }
        .lx-navlink { color: ${BODY}; text-decoration: none; font-size: 14.5px; font-weight: 600; transition: color 0.15s;
          background: none; border: none; cursor: pointer; padding: 0 }
        .lx-navlink:hover { color: ${IVORY} }
        .lx-ulink { color: ${DIM}; font-size: 12px; font-weight: 600; background: none; border: none; cursor: pointer;
          padding: 0; transition: color 0.15s; white-space: nowrap }
        .lx-ulink:hover { color: ${IVORY} }
        .lx-mrow { transition: background 0.15s }
        .lx-mrow:hover { background: rgba(242,184,75,0.06) }
        .lx-mini { border: none; cursor: pointer; border-radius: 8px; font-weight: 800; font-size: 11px;
          font-family: ${MONO}; padding: 7px 0; transition: filter 0.15s, transform 0.15s }
        .lx-mini:hover { filter: brightness(1.3); transform: translateY(-1px) }
        .lx-qsplit { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(28px, 4.5vw, 72px); align-items: center }
        .lx-psplit { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: clamp(28px, 4.5vw, 64px); align-items: center }
        .lx-menu { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.32s ease, opacity 0.25s ease }
        .lx-menu.lx-on { max-height: 720px; opacity: 1 }
        .lx-burger { display: none; background: none; border: 1px solid rgba(242,184,75,0.25); border-radius: 10px;
          width: 42px; height: 42px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0 }
        .lx-sticky { display: none }
        .lx-sticky-spacer { display: none }
        .lx-ratingband { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap }
        @media (max-width: 960px) {
          .lx-qsplit, .lx-psplit { grid-template-columns: 1fr }
        }
        @media (max-width: 860px) {
          .lx-utility { display: none !important }
          .lx-navlinks { display: none !important }
          .lx-navlogin { display: none !important }
          .lx-burger { display: flex }
        }
        @media (max-width: 720px) {
          .lx-mgrid, .lx-mhead { grid-template-columns: 1fr 104px 74px !important }
          .lx-mgrid > :nth-child(4), .lx-mhead > :nth-child(4) { display: none }
          .lx-sticky {
            display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 120;
            padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
            background: rgba(18,16,16,0.94); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid rgba(242,184,75,0.16);
            transform: translateY(110%); transition: transform 0.3s cubic-bezier(0.2,0.7,0.3,1);
          }
          .lx-sticky.lx-on { transform: translateY(0) }
          .lx-sticky-spacer { display: block; height: 84px }
        }
        @media (max-width: 560px) {
          .lx-board { grid-template-columns: 1fr !important }
          .lx-hero-h1 { font-size: clamp(38px, 11vw, 54px) !important }
        }
      `}</style>

      {/* ══ Header block: utility bar + main nav + mobile menu ══ */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        {/* Utility bar */}
        <div className="lx-utility" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          padding: '7px clamp(18px, 4vw, 44px)',
          background: 'rgba(12,10,10,0.94)', borderBottom: '1px solid rgba(247,242,230,0.05)',
        }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <button className="lx-ulink" onClick={() => goTo('/login')}>CLIENT</button>
            <button className="lx-ulink" onClick={go}>BLOG</button>
            <button className="lx-ulink" onClick={() => goTo('/trading-scams')}>SAFETY</button>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: '#221503',
              background: GOLD_G, borderRadius: 999, padding: '2px 9px',
            }}>NEW</span>
            <button className="lx-ulink" onClick={() => goTo('/trading-pilot')}>TradePilot</button>
            <button className="lx-ulink" onClick={go}>WebTrader</button>
            <button className="lx-ulink" onClick={go}>Start Trading</button>
            <button className="lx-ulink" onClick={go}>Try a Free Demo</button>
            <span className="lx-ulink" style={{ cursor: 'default' }}>EN</span>
          </div>
        </div>

        {/* Main nav */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.5vw, 34px)',
          padding: '13px clamp(18px, 4vw, 44px)',
          background: scrolled || menuOpen ? 'rgba(18,16,16,0.95)' : 'rgba(18,16,16,0.72)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${scrolled || menuOpen ? HAIR : 'transparent'}`,
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}
               onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandMark size={32} />
            <div>
              <Wordmark />
              <div style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: DIM, marginTop: 1 }}>
                Engineered to win
              </div>
            </div>
          </div>

          {/* Racing badge, like the reference's F1 sponsorship slot */}
          <div className="lx-navlinks" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 18, borderLeft: '1px solid rgba(247,242,230,0.08)' }}>
            <StartLights lit={5} size={6} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: BODY }}>APEX RACING</span>
          </div>

          <div className="lx-navlinks" style={{ display: 'flex', gap: 'clamp(16px, 2.2vw, 30px)', alignItems: 'center', marginLeft: 'auto' }}>
            <button className="lx-navlink" onClick={() => jump('quotes')}>Trading</button>
            <button className="lx-navlink" onClick={() => jump('pilot')}>TradePilot</button>
            <button className="lx-navlink" onClick={() => jump('platform')}>Platforms</button>
            <button className="lx-navlink" onClick={() => jump('pricing')}>Pricing</button>

            {/* More dropdown */}
            <div ref={moreRef} style={{ position: 'relative' }}>
              <button className="lx-navlink" onClick={() => setMoreOpen(o => !o)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: moreOpen ? IVORY : undefined }}>
                More
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}
                  style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {moreOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 14px)', right: 0, width: 440,
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  background: 'rgba(24,19,19,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(242,184,75,0.16)', borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(6,4,4,0.5), 0 30px 80px rgba(6,4,4,0.6)',
                }}>
                  <div style={{ padding: '16px 18px', borderRight: `1px solid ${HAIR}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
                      Company
                    </div>
                    {COMPANY_LINKS.map(([label, fn]) => (
                      <button key={label} onClick={fn} className="lx-navlink"
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 0', fontSize: 13.5 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
                      Platform
                    </div>
                    {PLATFORM_LINKS.map(([label, fn]) => (
                      <button key={label} onClick={fn} className="lx-navlink"
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 0', fontSize: 13 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <span className="lx-navlinks"><GoldBtn onClick={go}>Start Trading</GoldBtn></span>
            <span className="lx-navlogin"><LineBtn onClick={() => navigate('/login')}>Client Login</LineBtn></span>
            <button className="lx-burger" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu: simple slide-down dropdown, all pages */}
        <div className={`lx-menu${menuOpen ? ' lx-on' : ''}`} style={{
          background: 'rgba(18,16,16,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: menuOpen ? `1px solid ${HAIR}` : 'none',
        }}>
          <div style={{ padding: '10px clamp(18px, 4vw, 44px) 20px', maxHeight: '72vh', overflowY: 'auto' }}>
            {[
              ['Trading', () => jump('quotes')],
              ['TradePilot', () => jump('pilot')],
              ['Platforms', () => jump('platform')],
              ['Pricing', () => jump('pricing')],
              ['Live markets', () => jump('markets')],
            ].map(([label, fn]) => (
              <button key={label as string} onClick={fn as () => void} style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', padding: '13px 0', fontSize: 17, fontWeight: 700, color: IVORY,
                borderBottom: '1px solid rgba(242,184,75,0.07)',
              }}>
                {label as string}
              </button>
            ))}

            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, margin: '16px 0 6px' }}>
              Company
            </div>
            {COMPANY_LINKS.map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', padding: '9px 0', fontSize: 15, fontWeight: 600, color: BODY,
              }}>
                {label}
              </button>
            ))}

            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, margin: '14px 0 6px' }}>
              Platform
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              {PLATFORM_LINKS.map(([label, fn]) => (
                <button key={label} onClick={fn} style={{
                  textAlign: 'left', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 0', fontSize: 14, fontWeight: 600, color: BODY,
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <LineBtn onClick={() => goTo('/login')}>Client Login</LineBtn>
              <GoldBtn onClick={go}>Start Trading</GoldBtn>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Hero: full-bleed photo, one huge headline, one CTA ══ */}
      <header style={{
        position: 'relative', minHeight: '92svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        background: `
          linear-gradient(180deg, rgba(18,16,16,0.62) 0%, rgba(18,16,16,0.4) 55%, ${NIGHT} 100%),
          url(/hero-bg.jpg) center 30% / cover no-repeat,
          ${NIGHT}
        `,
        padding: '150px clamp(18px, 4vw, 44px) 80px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 className="lx-rise lx-hero-h1" style={{
            fontSize: 'clamp(44px, 7.6vw, 100px)', lineHeight: 1.02, letterSpacing: '-0.03em',
            fontWeight: 800, color: '#ffffff', margin: 0,
            textShadow: '0 4px 40px rgba(6,4,4,0.6)',
          }}>
            React Before
            <br />
            the Market Moves
          </h1>
          <p className="lx-rise" style={{
            fontSize: 'clamp(16px, 2.2vw, 22px)', lineHeight: 1.5, color: '#e8dfd0',
            margin: '26px auto 34px', maxWidth: 620, animationDelay: '0.12s',
            textShadow: '0 2px 20px rgba(6,4,4,0.6)',
          }}>
            Trade 250+ global markets 24 hours a day with raw spreads,
            1:1000 leverage and TradePilot automation. Plan ahead and never
            miss an opportunity.
          </p>
          <div className="lx-rise" style={{ animationDelay: '0.2s' }}>
            <GoldBtn onClick={go} big>Open an Account</GoldBtn>
          </div>
          <div className="lx-rise" style={{ display: 'flex', justifyContent: 'center', marginTop: 44, animationDelay: '0.28s' }}>
            <StartLights lit={5} size={8} />
          </div>
        </div>
      </header>

      {/* ══ Ratings band (light) ══ */}
      <section style={{ background: PAPER, padding: '18px clamp(18px, 4vw, 44px)' }}>
        <div className="lx-ratingband" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: '-0.02em' }}>Excellent</span>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <Star /><Star /><Star /><Star /><Star />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(36,29,22,0.65)' }}>
              4.8 / 5 · rated by our traders
            </span>
            <img src="/le-fonti-awards-gold.svg" alt="Le Fonti Awards" width={34} height={34} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <GoldBtn onClick={go}>Open an Account</GoldBtn>
            <LineBtn onClick={() => goTo('/trading-scams')} dark>24/7 Support</LineBtn>
          </div>
        </div>
      </section>

      {/* ══ Stats strip ══ */}
      <section style={{
        background: `linear-gradient(180deg, rgba(242,184,75,0.05), transparent), #171212`,
        borderBottom: `1px solid ${HAIR}`, padding: '34px clamp(18px, 4vw, 44px)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'clamp(18px, 3vw, 40px)', textAlign: 'center',
        }}>
          {[
            ['0.0', 'PIP SPREADS*'],
            ['1:1000', 'LEVERAGE'],
            ['<40ms', 'EXECUTION'],
            ['250+', 'TRADABLE INSTRUMENTS'],
            ['24/7', 'DEDICATED SUPPORT'],
          ].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: MONO, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 700, color: IVORY, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', color: DIM, marginTop: 6, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ The Raw Spread Advantage: live quote board ══ */}
      <section id="quotes" style={{ background: NIGHT, padding: 'clamp(64px, 8vw, 110px) clamp(18px, 4vw, 44px)' }}>
        <div className="lx-qsplit" style={{ maxWidth: 1280, margin: '0 auto' }}>
          {/* Quote board */}
          <div className="lx-board" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            padding: 14, borderRadius: 16, background: '#0b0909',
            border: '1px solid rgba(46,230,160,0.12)',
            boxShadow: '0 0 80px rgba(46,230,160,0.05), 0 30px 80px rgba(6,4,4,0.5)',
          }}>
            {BOARD_SYMBOLS.map(s => (
              <QuoteTile key={s} symbol={s} t={tickers[s]} go={go} />
            ))}
          </div>

          {/* Pitch */}
          <div>
            <H2>The Raw Spread Advantage</H2>
            <p style={{ fontSize: 16.5, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 500 }}>
              Raw spreads are the difference you have been waiting for. Trade with
              spreads from 0.0 pips, no requotes, best possible prices and no
              restrictions.
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 1.75, color: BODY, margin: '0 0 28px', maxWidth: 500 }}>
              TradeX is the platform of choice for high volume traders, scalpers
              and robots. And unlike the brochures, every quote on this board is
              live right now.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <GoldBtn onClick={go} big>Start Trading</GoldBtn>
              <LineBtn onClick={go} big>Try a Free Demo</LineBtn>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TradePilot ══ */}
      <section id="pilot" style={{
        background: `radial-gradient(1000px 520px at 90% -10%, rgba(111,157,255,0.06), transparent 60%), #171212`,
        padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)',
        borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="lx-psplit">
            <div>
              <Eyebrow>Automated trading</Eyebrow>
              <H2>The engine that earns while you sleep.</H2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 480 }}>
                Markets do not keep office hours. TradePilot doesn't either. It reads
                every tick, around the clock, and trades your strategy without fear,
                without greed, without hesitation.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: BODY, margin: '0 0 28px', maxWidth: 480 }}>
                Four strategies, hard stops on every trade, a daily loss
                circuit-breaker, and full telemetry on every decision it makes.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <GoldBtn onClick={go} big>Deploy TradePilot free</GoldBtn>
                <LineBtn onClick={() => goTo('/trading-pilot')} big>Explore in depth</LineBtn>
              </div>
            </div>
            <PilotConsole go={go} />
          </div>
        </div>
      </section>

      {/* ══ Live markets ══ */}
      <section id="markets" style={{ background: NIGHT, padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Eyebrow>Global markets</Eyebrow>
          <H2>Markets move. Money moves with them.</H2>
          <p style={{ maxWidth: 540, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 32px' }}>
            Every price below is live right now, no account needed. Go long or
            short and profit from the move in either direction.
          </p>
          <MarketsBoard tickers={tickers} meta={meta} go={go} />
        </div>
      </section>

      {/* ══ Platform tools ══ */}
      <section id="platform" style={{
        background: `radial-gradient(900px 480px at 50% -10%, rgba(242,184,75,0.05), transparent 60%), #171212`,
        padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)',
        borderTop: `1px solid ${HAIR}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Eyebrow>The platform</Eyebrow>
          <H2>Everything a serious trader needs.</H2>
          <p style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 36px' }}>
            All of it included from the first demo trade. No tiers, no paywalls inside.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            {[
              {
                t: 'WebTrader', d: 'Full charting, one-tap orders, order book and depth, on any screen.',
                i: <path d="M8 6v4m0 8v-4m0 0h-2v-4h2v4zm8-10v2m0 10v4m0-14h2v6h-2m0 0h-2v-6h2" />,
              },
              {
                t: 'Market scanner', d: 'Momentum, breakouts and unusual volume, surfaced before the crowd sees them.',
                i: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></>,
              },
              {
                t: 'Analytics & telemetry', d: 'Equity curve, drawdown, win rate, attribution by bot and by strategy.',
                i: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
              },
              {
                t: 'Leaderboard', d: 'Every trader ranked by verified performance, not talk.',
                i: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v6a5 5 0 01-10 0V4z" /><path d="M17 6h3a2 2 0 01-2 4h-1M7 6H4a2 2 0 002 4h1" /></>,
              },
              {
                t: 'Economic calendar', d: 'Rate decisions, payrolls, earnings. Know the corners before you reach them.',
                i: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
              },
              {
                t: 'Trading Web TV', d: 'Live market briefings and strategy sessions, all day.',
                i: <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M10 10l5 2.5-5 2.5v-5z" /></>,
              },
            ].map(f => (
              <div key={f.t} className="lx-mrow" onClick={go} style={{
                display: 'flex', gap: 16, padding: '20px 22px', borderRadius: 16, cursor: 'pointer',
                background: PANEL, border: `1px solid ${HAIR}`,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(242,184,75,0.1)', border: '1px solid rgba(242,184,75,0.18)', color: GOLD,
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {f.i}
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 750, color: IVORY, margin: '0 0 5px', letterSpacing: '-0.01em' }}>{f.t}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: BODY, margin: 0 }}>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Pricing ══ */}
      <section id="pricing" style={{
        background: NIGHT, padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)', borderTop: `1px solid ${HAIR}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Eyebrow>Transparent pricing</Eyebrow>
          <H2>Three accounts. No surprises.</H2>
          <p style={{ maxWidth: 540, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 36px' }}>
            Zero deposit fees, zero withdrawal fees, zero inactivity games.
            You pay the spread or a fixed commission, and that's the whole story.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {PLANS.map(p => (
              <article key={p.name} style={{
                position: 'relative', borderRadius: 18, padding: 'clamp(24px, 3vw, 32px)',
                background: NIGHT2,
                border: `1px solid ${p.popular ? 'rgba(242,184,75,0.45)' : HAIR}`,
                boxShadow: p.popular
                  ? '0 1px 2px rgba(6,4,4,0.5), 0 24px 70px rgba(242,184,75,0.1)'
                  : '0 1px 2px rgba(6,4,4,0.5), 0 18px 50px rgba(6,4,4,0.35)',
              }}>
                {p.popular && (
                  <span style={{
                    position: 'absolute', top: -11, left: 24, background: GOLD_G, color: '#221503',
                    fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', borderRadius: 999, padding: '4px 12px',
                  }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ fontSize: 20, fontWeight: 800, color: IVORY, margin: '0 0 6px', letterSpacing: '-0.01em' }}>{p.name}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: BODY, margin: '0 0 20px' }}>{p.line}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                  {[p.spread, p.commission, p.min].map(row => (
                    <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span style={{ fontSize: 14, color: IVORY, fontFamily: MONO }}>{row}</span>
                    </div>
                  ))}
                </div>
                {p.popular
                  ? <GoldBtn onClick={go} wide>Open {p.name} account</GoldBtn>
                  : <button onClick={go} className="lx-ghost" style={{
                      background: 'transparent', cursor: 'pointer', borderRadius: 10, width: '100%',
                      fontWeight: 700, fontSize: 14, padding: '12px 0',
                      color: IVORY, border: '1px solid rgba(247,242,230,0.22)',
                    }}>
                      Open {p.name} account
                    </button>}
              </article>
            ))}
          </div>

          <button onClick={() => goTo('/account-types')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 22,
            fontSize: 14, fontWeight: 700, color: GOLD,
          }}>
            Compare all three plans in detail →
          </button>
        </div>
      </section>

      {/* ══ Closer ══ */}
      <section style={{
        position: 'relative',
        background: `
          linear-gradient(180deg, ${NIGHT} 0%, rgba(18,16,16,0.55) 30%, rgba(18,16,16,0.78) 100%),
          url(/hero-bg.jpg) center 45% / cover no-repeat,
          ${NIGHT}
        `,
        padding: 'clamp(90px, 12vw, 150px) clamp(18px, 4vw, 44px)', textAlign: 'center',
        borderTop: `1px solid ${HAIR}`,
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ animation: 'lx-pulse 2.4s ease-in-out infinite' }}>
            <StartLights lit={5} size={13} />
          </div>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(36px, 5.4vw, 64px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', color: IVORY, margin: '28px 0 14px',
            textShadow: '0 2px 30px rgba(6,4,4,0.6)',
          }}>
            Lights out.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: '#ddd2c2', margin: '0 0 26px', maxWidth: 480, textShadow: '0 1px 12px rgba(6,4,4,0.6)' }}>
            The markets are open. The engine is warm. Your free $100,000 demo
            takes sixty seconds to claim.
          </p>
          <GoldBtn onClick={go} big>Open an Account</GoldBtn>
          <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b3a48f', marginTop: 40, textShadow: '0 1px 10px rgba(6,4,4,0.6)' }}>
            Engineered to win · Driven by you
          </p>
        </div>
      </section>

      {/* ══ Sticky mobile CTA ══ */}
      <div className={`lx-sticky${showBar ? ' lx-on' : ''}`}>
        <GoldBtn onClick={go} wide big>Open an Account · free $100k demo</GoldBtn>
      </div>
      <div className="lx-sticky-spacer" />

      {/* ══ Footer ══ */}
      <footer style={{ background: NIGHT, borderTop: `1px solid ${HAIR}`, padding: '52px clamp(18px, 4vw, 44px) 36px' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'clamp(28px, 4vw, 48px)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <BrandMark size={26} />
              <Wordmark />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: DIM, margin: 0, maxWidth: 240 }}>
              A racing team for the markets. The car is built, the engine is running,
              the seat is yours.
            </p>
            <div style={{ marginTop: 16 }}>
              <StartLights lit={5} size={8} />
            </div>
          </div>

          {[
            {
              h: 'Trade',
              links: [
                ['Live markets', () => jump('markets')],
                ['WebTrader', go],
                ['TradePilot bots', () => goTo('/trading-pilot')],
                ['Account types', () => goTo('/account-types')],
                ['Pricing', () => jump('pricing')],
              ] as [string, () => void][],
            },
            {
              h: 'Inside the platform',
              links: [
                ['Market scanner', go],
                ['Analytics & telemetry', go],
                ['Leaderboard', go],
                ['Economic calendar', go],
                ['Forex calculators', go],
                ['Trading Web TV', go],
              ] as [string, () => void][],
            },
            {
              h: 'Company & legal',
              links: [
                ['Trading scams & safety', () => goTo('/trading-scams')],
                ['Sign in', () => goTo('/login')],
                ['Privacy policy', () => window.open('/privacy-policy.html', '_blank')],
                ['Terms of service', () => window.open('/terms-of-service.html', '_blank')],
                ['Risk disclosure', () => window.open('/risk-disclosure.html', '_blank')],
                ['Cookie policy', () => window.open('/cookie-policy.html', '_blank')],
              ] as [string, () => void][],
            },
          ].map(col => (
            <div key={col.h}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>
                {col.h}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(([label, fn]) => (
                  <button key={label} onClick={fn} className="lx-navlink"
                    style={{ textAlign: 'left', fontSize: 13.5, fontWeight: 500 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 1280, margin: '36px auto 0', borderTop: `1px solid ${HAIR}`, paddingTop: 20 }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: DIM, margin: 0 }}>
            *Spreads from 0.0 pips on Raw Spread accounts during liquid sessions.
            Trading involves real risk and leverage multiplies losses as well as gains.
            Simulated results do not guarantee future returns. Practice accounts use
            virtual funds on live prices. © {new Date().getFullYear()} TradeX.
            Engineered to win. Driven by you.
          </p>
        </div>
      </footer>
    </div>
  )
}
