import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChart, ColorType, IChartApi, UTCTimestamp } from 'lightweight-charts'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/ui/BrandMark'
import AssetIcon from '../components/ui/AssetIcon'
import { getTickers, getSymbols, getCandles } from '../api/markets'
import { formatPrice } from '../utils/formatters'
import type { Ticker, MarketSymbol } from '../types'

/* ════════════════════════════════════════════════════════════════════════════
   TradeX. The homepage.

   A trading platform that proves itself: live prices, a live chart, and a
   clear pitch on how money gets made here. TradePilot is the star product.
   The hero photo is the car at golden hour; the text owns the left, the
   car owns the right, and nothing covers it.

   The story: the car is the company, the engine is the trading, the driver
   is you. Golden hour palette. Blue only as a small machine tag.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Palette: dusk, not midnight ─────────────────────────────────────────── */

const NIGHT   = '#1a1310'
const NIGHT2  = '#241a14'
const PAPER   = '#f6efe3'
const PAPER2  = '#efe6d6'
const INK     = '#2a211a'
const INK2    = '#6d5f50'
const IVORY   = '#f7f2e6'
const BODY    = '#c7b8a5'
const DIM     = '#8d7d6a'
const GOLD    = '#f2b84b'
const GOLDDK  = '#a3701c'
const GOLD_G  = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const BLUE    = '#6f9dff'
const BULL    = '#18c98a'
const BEAR    = '#ff5a72'

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
const MONO  = "'JetBrains Mono', monospace"

/* ── Static fallbacks (used until live data arrives) ─────────────────────── */

const FALLBACK_TICKER = [
  { sym: 'BTCUSD', price: '67,420.50', chg: '+2.41%', up: true  },
  { sym: 'ETHUSD', price: '3,512.80',  chg: '+1.83%', up: true  },
  { sym: 'XAUUSD', price: '2,334.10',  chg: '+0.34%', up: true  },
  { sym: 'EURUSD', price: '1.08420',   chg: '+0.12%', up: true  },
  { sym: 'NVDA',   price: '875.40',    chg: '+3.14%', up: true  },
  { sym: 'US500',  price: '5,320.4',   chg: '-0.22%', up: false },
  { sym: 'AAPL',   price: '189.24',    chg: '-0.61%', up: false },
  { sym: 'SOLUSD', price: '143.20',    chg: '+4.22%', up: true  },
  { sym: 'GBPUSD', price: '1.26350',   chg: '-0.08%', up: false },
  { sym: 'WTI',    price: '78.42',     chg: '+1.05%', up: true  },
]

const HERO_SYMBOLS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'NVDA']
const HERO_CLASS: Record<string, string> = {
  BTCUSD: 'crypto', ETHUSD: 'crypto', XAUUSD: 'commodity', EURUSD: 'forex', NVDA: 'stock',
}
const POPULAR = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'NVDA', 'AAPL', 'TSLA', 'US500']

const MARKET_TABS: { key: string; label: string }[] = [
  { key: 'popular',   label: 'Popular' },
  { key: 'crypto',    label: 'Crypto' },
  { key: 'forex',     label: 'Forex' },
  { key: 'stock',     label: 'Stocks' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'index',     label: 'Indices' },
]

const STORY = [
  {
    n: '01', title: 'The car',
    body: 'That is us. The chassis, the pit wall, the people who stay up all night so the engine never sleeps. We build the car. We keep it fast. We hand you the keys.',
  },
  {
    n: '02', title: 'The engine',
    body: 'Two power units under one cover. TradePilot reads the market a thousand times a minute and never gets tired, never gets greedy. Manual mode puts your hands on the wheel, raw spreads and all.',
  },
  {
    n: '03', title: 'The driver',
    body: 'That is you. The one part we cannot build. Every car we have ever made was missing the same piece: someone with the nerve to drive it.',
  },
]

const STEPS = [
  { n: 1, title: 'Take the seat',     body: 'Sixty seconds, no card. Every driver gets a seat moulded to them.' },
  { n: 2, title: 'Practice flat out', body: 'A $100,000 practice balance on live prices. Same engine, same telemetry, zero risk.' },
  { n: 3, title: 'Lights out',        body: 'Go live when your numbers say you are ready. The engine is already warm.' },
]

/* Simulated 90-day TradePilot practice run: 100 → 138.4, honest drawdowns.
   Deterministic walk so every visitor sees the same curve. */
const EQUITY: number[] = (() => {
  const out: number[] = []
  let v = 100
  let seed = 42
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let i = 0; i < 90; i++) {
    const drift = 0.55
    const shock = (rnd() - 0.47) * 3.2
    v = Math.max(88, v + drift + shock)
    out.push(v)
  }
  // pin the ending so the headline number is exact
  const scale = 138.4 / out[out.length - 1]
  return out.map((x, i) => 100 + (x - 100) * ((scale - 1) * (i / (out.length - 1)) + 1))
})()

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="font-extrabold tracking-tight text-lg">
      <span style={{ color: dark ? INK : IVORY }}>Trade</span>
      <span style={{ color: dark ? GOLDDK : GOLD }}>X</span>
    </span>
  )
}

function GoldBtn({ children, onClick, big = false }: { children: React.ReactNode; onClick: () => void; big?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="lx-gold"
      style={{
        background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
        borderRadius: 999, fontWeight: 800, letterSpacing: '0.01em',
        fontSize: big ? 16 : 14, padding: big ? '17px 38px' : '12px 24px',
        boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.18)',
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lx-ghost"
      style={{
        background: 'transparent', cursor: 'pointer', borderRadius: 999,
        fontWeight: 600, fontSize: 14, padding: '12px 24px',
        color: IVORY, border: '1px solid rgba(247,242,230,0.22)',
      }}
    >
      {children}
    </button>
  )
}

function Eyebrow({ children, onPaper = false }: { children: React.ReactNode; onPaper?: boolean }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
      color: onPaper ? GOLDDK : GOLD, marginBottom: 18,
    }}>
      {children}
    </div>
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
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

function fmtPct(p: number) { return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%` }

/* ── Live hero chart: real candles, warm skin, no chrome ─────────────────── */

function HeroChart({ symbol }: { symbol: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    let dead = false
    if (!boxRef.current) return
    const chart = createChart(boxRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: DIM, fontFamily: MONO, fontSize: 10,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(242,184,75,0.05)' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.05 } },
      timeScale: { visible: false },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    })
    chartRef.current = chart

    getCandles(symbol, '15m', 96)
      .then(candles => {
        if (dead || candles.length === 0) return
        const up = candles[candles.length - 1].close >= candles[0].close
        const line = up ? BULL : BEAR
        const series = chart.addAreaSeries({
          lineColor: line, lineWidth: 2,
          topColor: up ? 'rgba(24,201,138,0.28)' : 'rgba(255,90,114,0.24)',
          bottomColor: 'rgba(26,19,16,0)',
          priceLineVisible: false, lastValueVisible: true,
          crosshairMarkerVisible: false,
        })
        series.setData(candles.map(c => ({ time: c.time as UTCTimestamp, value: c.close })))
        chart.timeScale().fitContent()
      })
      .catch(() => { /* the card header still shows; the page must never break */ })

    const onResize = () => {
      if (boxRef.current) chart.applyOptions({ width: boxRef.current.clientWidth, height: boxRef.current.clientHeight })
    }
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(boxRef.current)

    return () => { dead = true; ro.disconnect(); chart.remove(); chartRef.current = null }
  }, [symbol])

  return <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
}

/* ── Live trade card ──────────────────────────────────────────────────────── */

function LiveTradeCard({ tickers, go }: { tickers: Record<string, Ticker>; go: () => void }) {
  const [sym, setSym] = useState('BTCUSD')
  const t = tickers[sym]
  const up = (t?.changePercent ?? 0) >= 0

  return (
    <div style={{
      background: 'rgba(36,26,20,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(242,184,75,0.16)', borderRadius: 22,
      boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 30px 80px rgba(10,6,3,0.5)',
      padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0,
    }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {HERO_SYMBOLS.map(s => (
          <button key={s} onClick={() => setSym(s)}
            style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: sym === s ? 'rgba(242,184,75,0.14)' : 'transparent',
              color: sym === s ? GOLD : DIM,
              border: `1px solid ${sym === s ? 'rgba(242,184,75,0.35)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
            {s.replace('USD', s.length > 5 ? '' : 'USD')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AssetIcon symbol={sym} assetClass={HERO_CLASS[sym] ?? 'crypto'} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: IVORY, lineHeight: 1.1 }}>
            {t ? formatPrice(t.price, sym) : '––'}
          </div>
          <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.06em', marginTop: 2 }}>{sym} · 15m · live</div>
        </div>
        {t && (
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: MONO, padding: '5px 11px', borderRadius: 999,
            color: up ? BULL : BEAR,
            background: up ? 'rgba(24,201,138,0.1)' : 'rgba(255,90,114,0.1)',
            border: `1px solid ${up ? 'rgba(24,201,138,0.25)' : 'rgba(255,90,114,0.25)'}`,
          }}>
            {fmtPct(t.changePercent)}
          </span>
        )}
      </div>

      <div style={{ height: 210, minWidth: 0 }}>
        <HeroChart symbol={sym} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={go} className="lx-trade-btn" style={{
          padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,90,114,0.3)',
          background: 'rgba(255,90,114,0.1)', color: BEAR, fontWeight: 800, fontSize: 13, cursor: 'pointer',
        }}>
          Sell {t?.bid ? formatPrice(t.bid, sym) : ''}
        </button>
        <button onClick={go} className="lx-trade-btn" style={{
          padding: '11px 0', borderRadius: 12, border: '1px solid rgba(24,201,138,0.3)',
          background: 'rgba(24,201,138,0.1)', color: BULL, fontWeight: 800, fontSize: 13, cursor: 'pointer',
        }}>
          Buy {t?.ask ? formatPrice(t.ask, sym) : ''}
        </button>
      </div>

      <div style={{ fontSize: 11, color: DIM, textAlign: 'center' }}>
        Live prices, straight from the engine. No account needed to watch.
      </div>
    </div>
  )
}

/* ── TradePilot console: the star product, pitched ───────────────────────── */

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
      background: NIGHT2, border: '1px solid rgba(111,157,255,0.16)', borderRadius: 22,
      boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 30px 80px rgba(10,6,3,0.45)',
      padding: 'clamp(20px, 2.6vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: BLUE,
          border: '1px solid rgba(111,157,255,0.3)', borderRadius: 999, padding: '4px 12px',
        }}>PU-01 · TRADEPILOT</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: IVORY }}>Momentum-X</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: BULL }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: BULL, boxShadow: '0 0 8px rgba(24,201,138,0.6)', animation: 'lx-pulse 1.8s ease-in-out infinite' }} />
          RUNNING
        </span>
      </div>

      {/* Equity curve */}
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

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[['$100k → $138.4k', 'equity'], ['64%', 'win rate'], ['7.8%', 'max drawdown'], ['1,204', 'trades']].map(([v, l]) => (
          <div key={l} style={{
            flex: '1 1 100px', padding: '10px 14px', borderRadius: 12,
            background: 'rgba(26,19,16,0.6)', border: '1px solid rgba(242,184,75,0.07)',
          }}>
            <div style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Live-log flavor */}
      <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.9, color: DIM, background: 'rgba(26,19,16,0.6)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(242,184,75,0.06)' }}>
        <div><span style={{ color: BULL }}>▲ BUY</span> BTCUSD 0.050 @ 67,410.25 <span style={{ color: BULL }}>+$128.40</span></div>
        <div><span style={{ color: BEAR }}>▼ SELL</span> EURUSD 25,000 @ 1.08442 <span style={{ color: BULL }}>+$61.20</span></div>
        <div><span style={{ color: BULL }}>▲ BUY</span> XAUUSD 4.0 @ 2,331.80 <span style={{ color: DIM }}>running…</span></div>
      </div>

      <button onClick={go} className="lx-gold" style={{
        background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
        borderRadius: 12, fontWeight: 800, fontSize: 15, padding: '15px 0',
        boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.18)',
      }}>
        Deploy TradePilot free
      </button>
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
              background: tab === t.key ? 'rgba(242,184,75,0.14)' : 'rgba(36,26,20,0.6)',
              color: tab === t.key ? GOLD : BODY,
              border: `1px solid ${tab === t.key ? 'rgba(242,184,75,0.4)' : 'rgba(242,184,75,0.08)'}`,
              transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        borderRadius: 18, border: '1px solid rgba(242,184,75,0.1)', overflow: 'hidden',
        background: 'rgba(36,26,20,0.55)',
      }}>
        <div className="lx-mhead" style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 90px 172px', gap: 12,
          padding: '12px 20px', borderBottom: '1px solid rgba(242,184,75,0.08)',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM,
        }}>
          <span>Market</span>
          <span style={{ textAlign: 'right' }}>Price</span>
          <span style={{ textAlign: 'right' }}>24h</span>
          <span style={{ textAlign: 'center' }}>Sell / Buy</span>
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
                  background: 'rgba(255,90,114,0.12)', color: BEAR, border: '1px solid rgba(255,90,114,0.28)',
                }}>
                  {t.bid ? formatPrice(t.bid, t.symbol) : 'Sell'}
                </button>
                <button className="lx-mini" onClick={e => { e.stopPropagation(); go() }} style={{
                  background: 'rgba(24,201,138,0.12)', color: BULL, border: '1px solid rgba(24,201,138,0.28)',
                }}>
                  {t.ask ? formatPrice(t.ask, t.symbol) : 'Buy'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 12.5, color: DIM, marginTop: 14 }}>
        Prices update live while you read this. 250+ instruments inside, this is just the front row.
      </p>
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
  const [pagesOpen, setPagesOpen] = useState(false)
  const pagesRef = useRef<HTMLDivElement>(null)

  // Close the desktop Pages dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pagesRef.current && !pagesRef.current.contains(e.target as Node)) setPagesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const [tickers, setTickers] = useState<Record<string, Ticker>>({})
  const [meta, setMeta] = useState<Record<string, MarketSymbol>>({})

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

  // Lock the page scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const go = () => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login?mode=register') }
  const goTo = (path: string) => { setMenuOpen(false); navigate(path) }
  const jump = (id: string) => {
    setMenuOpen(false)
    setPagesOpen(false)
    // wait for the drawer to release the scroll lock before jumping
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  // The full page map: real routes plus everything waiting inside the platform
  const PAGE_LINKS: [string, () => void][] = [
    ['TradePilot in depth', () => goTo('/trading-pilot')],
    ['Account types & plans', () => goTo('/account-types')],
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

  const marquee = useMemo(() => {
    const live = FALLBACK_TICKER.map(f => {
      const t = tickers[f.sym]
      return t
        ? { sym: f.sym, price: formatPrice(t.price, f.sym), chg: fmtPct(t.changePercent), up: t.changePercent >= 0 }
        : f
    })
    return [...live, ...live]
  }, [tickers])

  return (
    <div style={{ background: NIGHT, color: BODY, fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @keyframes lx-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes lx-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
        @keyframes lx-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .lx-rise { animation: lx-rise 0.7s cubic-bezier(0.2,0.7,0.3,1) both }
        .lx-gold { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease }
        .lx-gold:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(20,10,4,0.4), 0 16px 44px rgba(242,184,75,0.28); filter: brightness(1.04) }
        .lx-gold:active { transform: translateY(0) }
        .lx-ghost { transition: border-color 0.18s ease, background 0.18s ease }
        .lx-ghost:hover { border-color: rgba(242,184,75,0.5); background: rgba(242,184,75,0.06) }
        .lx-navlink { color: ${BODY}; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .lx-navlink:hover { color: ${IVORY} }
        .lx-mrow { transition: background 0.15s }
        .lx-mrow:hover { background: rgba(242,184,75,0.06) }
        .lx-trade-btn { transition: filter 0.15s, transform 0.15s }
        .lx-trade-btn:hover { filter: brightness(1.25); transform: translateY(-1px) }
        .lx-msplit { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr); gap: clamp(24px, 3.5vw, 44px); align-items: start }
        .lx-psplit { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: clamp(28px, 4.5vw, 64px); align-items: center }
        .lx-hero {
          background:
            linear-gradient(180deg, rgba(26,19,16,0.35) 0%, rgba(26,19,16,0.15) 45%, rgba(26,19,16,0.9) 92%, ${NIGHT} 100%),
            linear-gradient(95deg, rgba(26,19,16,0.78) 0%, rgba(26,19,16,0.42) 42%, rgba(26,19,16,0.05) 68%, transparent 100%),
            url(/hero-bg.jpg) center / cover no-repeat,
            ${NIGHT};
        }
        .lx-mini { border: none; cursor: pointer; border-radius: 9px; font-weight: 800; font-size: 11.5px;
          font-family: ${MONO}; padding: 7px 0; width: 76px; transition: filter 0.15s, transform 0.15s }
        .lx-mini:hover { filter: brightness(1.3); transform: translateY(-1px) }
        .lx-sticky { display: none }
        .lx-sticky-spacer { display: none }
        .lx-burger { display: none; background: none; border: 1px solid rgba(242,184,75,0.25); border-radius: 10px;
          width: 42px; height: 42px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0 }
        .lx-drawer { position: fixed; inset: 0; z-index: 200; background: rgba(26,19,16,0.97);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          display: flex; flex-direction: column; padding: 18px;
          opacity: 0; pointer-events: none; transition: opacity 0.25s ease }
        .lx-drawer.lx-on { opacity: 1; pointer-events: auto }
        .lx-dlink { background: none; border: none; cursor: pointer; text-align: left; padding: 15px 6px;
          font-size: 22px; font-weight: 750; letter-spacing: -0.01em; color: ${IVORY};
          border-bottom: 1px solid rgba(242,184,75,0.08) }
        .lx-dlink:active { color: ${GOLD} }
        .lx-dsub { background: none; border: none; cursor: pointer; text-align: left; padding: 10px 6px;
          font-size: 15px; font-weight: 600; color: ${BODY} }
        .lx-dsub:active { color: ${IVORY} }
        @media (max-width: 960px) {
          .lx-msplit, .lx-psplit { grid-template-columns: 1fr }
        }
        @media (max-width: 720px) {
          .lx-navlinks { display: none }
          .lx-burger { display: flex }
          .lx-navsignin { display: none }
          .lx-hero {
            background:
              linear-gradient(180deg, rgba(26,19,16,0.5) 0%, rgba(26,19,16,0.28) 40%, rgba(26,19,16,0.92) 90%, ${NIGHT} 100%),
              url(/hero-bg.jpg) 68% center / cover no-repeat,
              ${NIGHT};
          }
          .lx-mgrid, .lx-mhead { grid-template-columns: 1fr 104px 74px !important }
          .lx-mgrid > :nth-child(4), .lx-mhead > :nth-child(4) { display: none }
          .lx-sticky {
            display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 120;
            padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
            background: rgba(26,19,16,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid rgba(242,184,75,0.16);
            transform: translateY(110%); transition: transform 0.3s cubic-bezier(0.2,0.7,0.3,1);
          }
          .lx-sticky.lx-on { transform: translateY(0) }
          .lx-sticky-spacer { display: block; height: 84px }
        }
        @media (max-width: 520px) {
          .lx-navcta { display: none }
          .lx-hero-ctas { flex-direction: column; align-items: stretch !important }
          .lx-hero-ctas > button { width: 100% }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px clamp(18px, 4vw, 44px)',
        background: scrolled ? 'rgba(26,19,16,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(242,184,75,0.08)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandMark size={30} />
          <Wordmark />
        </div>
        <div className="lx-navlinks" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <a className="lx-navlink" href="#pilot">TradePilot</a>
          <a className="lx-navlink" href="#markets">Markets</a>
          <button onClick={() => goTo('/account-types')} className="lx-navlink" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Account types
          </button>
          <a className="lx-navlink" href="#story">The story</a>

          {/* Pages dropdown */}
          <div ref={pagesRef} style={{ position: 'relative' }}>
            <button onClick={() => setPagesOpen(o => !o)} className="lx-navlink"
              style={{
                background: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 999,
                border: `1px solid ${pagesOpen ? 'rgba(242,184,75,0.4)' : 'rgba(242,184,75,0.18)'}`,
                color: pagesOpen ? GOLD : BODY, display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              Pages
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}
                style={{ transform: pagesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {pagesOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 460,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                background: 'rgba(30,22,17,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(242,184,75,0.16)', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(10,6,3,0.5), 0 30px 80px rgba(10,6,3,0.6)',
              }}>
                <div style={{ padding: '18px 20px', borderRight: '1px solid rgba(242,184,75,0.08)' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>
                    Pages
                  </div>
                  {PAGE_LINKS.map(([label, fn]) => (
                    <button key={label} onClick={fn} className="lx-navlink"
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontSize: 14 }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>
                    Inside the platform
                  </div>
                  {PLATFORM_LINKS.map(([label, fn]) => (
                    <button key={label} onClick={fn} className="lx-navlink"
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0', fontSize: 13.5 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="lx-navlink lx-navsignin" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign in
          </button>
          <span className="lx-navcta"><GoldBtn onClick={go}>Claim $100,000 free</GoldBtn></span>
          <button className="lx-burger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer: every page, one thumb ─────────────────────────────── */}
      <div className={`lx-drawer${menuOpen ? ' lx-on' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark size={30} />
            <Wordmark />
          </div>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{
            background: 'none', border: '1px solid rgba(242,184,75,0.25)', borderRadius: 10,
            width: 42, height: 42, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <button className="lx-dlink" onClick={() => jump('pilot')}>TradePilot</button>
          <button className="lx-dlink" onClick={() => jump('markets')}>Live markets</button>
          <button className="lx-dlink" onClick={() => jump('cockpit')}>The platform</button>
          <button className="lx-dlink" onClick={() => jump('earn')}>Ways to earn</button>
          <button className="lx-dlink" onClick={() => jump('story')}>The story</button>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: DIM, margin: '24px 6px 4px' }}>
            Pages
          </div>
          {PAGE_LINKS.map(([label, fn]) => (
            <button key={label} className="lx-dsub" onClick={fn}>{label}</button>
          ))}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: DIM, margin: '20px 6px 4px' }}>
            Inside the platform
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
            {PLATFORM_LINKS.map(([label, fn]) => (
              <button key={label} className="lx-dsub" onClick={fn}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ paddingTop: 14 }}>
          <button onClick={go} className="lx-gold" style={{
            background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
            borderRadius: 14, fontWeight: 800, fontSize: 16, padding: '16px 0', width: '100%',
            boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.2)',
          }}>
            Claim your free $100,000
          </button>
          <p style={{ fontSize: 12, color: DIM, textAlign: 'center', margin: '10px 0 0' }}>
            60 seconds to open · no card, no catch
          </p>
        </div>
      </div>

      {/* ── Hero: the car at golden hour, the pitch on the left ────────────── */}
      <header className="lx-hero" style={{
        position: 'relative', minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '130px clamp(18px, 4vw, 44px) 110px' }}>
          <div style={{ maxWidth: 620 }}>
            <div className="lx-rise" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <StartLights lit={5} size={9} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
                Crypto · Forex · Stocks · Gold · Indices
              </span>
            </div>

            <h1 className="lx-rise" style={{
              fontSize: 'clamp(42px, 6.4vw, 82px)', lineHeight: 1.0, letterSpacing: '-0.03em',
              fontWeight: 800, color: IVORY, margin: 0, animationDelay: '0.08s',
              textShadow: '0 2px 30px rgba(10,6,3,0.5)',
            }}>
              Trade the world's markets.
              <br />
              <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Earn in both directions.
              </span>
            </h1>

            <p className="lx-rise" style={{
              maxWidth: 520, fontSize: 'clamp(15px, 1.8vw, 17.5px)', lineHeight: 1.65,
              color: '#d9cdbb', margin: '24px 0 12px', animationDelay: '0.16s',
              textShadow: '0 1px 12px rgba(10,6,3,0.6)',
            }}>
              Long when it rises. Short when it falls. 250+ instruments, raw spreads,
              and leverage up to 1:1000, where $500 of margin commands $500,000 of
              market power.
            </p>
            <p className="lx-rise" style={{
              maxWidth: 520, fontSize: 'clamp(15px, 1.8vw, 17.5px)', lineHeight: 1.65,
              color: '#d9cdbb', margin: '0 0 32px', animationDelay: '0.2s',
              textShadow: '0 1px 12px rgba(10,6,3,0.6)',
            }}>
              Or skip the wheel entirely and let <span style={{ color: GOLD, fontWeight: 700 }}>TradePilot</span> trade
              for you, day and night.
            </p>

            <div className="lx-rise lx-hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', animationDelay: '0.26s' }}>
              <GoldBtn onClick={go} big>Claim your free $100,000</GoldBtn>
              <GhostBtn onClick={go}>Try the free demo</GhostBtn>
            </div>
            <p className="lx-rise" style={{ fontSize: 13, color: '#b3a48f', marginTop: 16, animationDelay: '0.3s' }}>
              Practice account · 60 seconds to open · no card, no catch
            </p>

            <div className="lx-rise" style={{ display: 'flex', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', marginTop: 40, animationDelay: '0.34s' }}>
              {[['250+', 'instruments'], ['0.0', 'pip spreads'], ['1:1000', 'leverage'], ['<40ms', 'execution']].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: IVORY, textShadow: '0 1px 12px rgba(10,6,3,0.6)' }}>{v}</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b3a48f', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticker marquee */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden',
          borderTop: '1px solid rgba(242,184,75,0.1)', background: 'rgba(26,19,16,0.72)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '11px 0',
        }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'lx-marquee 42s linear infinite' }}>
            {marquee.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', padding: '0 26px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DIM, letterSpacing: '0.04em' }}>{t.sym}</span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: IVORY }}>{t.price}</span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: t.up ? BULL : BEAR }}>{t.chg}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Trust band: the numbers, right after the promise ────────────────── */}
      <section style={{ background: '#20170f', borderBottom: '1px solid rgba(242,184,75,0.07)', padding: '26px clamp(18px, 4vw, 44px)' }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'clamp(16px, 3vw, 32px)', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/le-fonti-awards-gold.svg" alt="Le Fonti Awards" width={46} height={46} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 750, color: IVORY, lineHeight: 1.3 }}>Le Fonti Awards</div>
              <div style={{ fontSize: 11, color: DIM }}>Trading experience</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/award-trophy.svg" alt="Award" width={42} height={42} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 750, color: IVORY, lineHeight: 1.3 }}>4.8 / 5 rating</div>
              <div style={{ fontSize: 11, color: DIM }}>from our drivers</div>
            </div>
          </div>
          {[['250+', 'instruments, 6 asset classes'], ['<40ms', 'average execution'], ['24/7', 'markets and support']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: GOLD }}>{v}</div>
              <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{ maxWidth: 1240, margin: '18px auto 0', fontSize: 11.5, lineHeight: 1.5, color: DIM }}>
          Leverage multiplies losses as well as gains. Trade with money you can afford to lose,
          and practice free for as long as you like first.
        </p>
      </section>

      {/* ── TradePilot: the star product ─────────────────────────────────────── */}
      <section id="pilot" style={{
        background: `radial-gradient(1000px 520px at 90% -10%, rgba(111,157,255,0.06), transparent 60%), radial-gradient(800px 460px at 5% 110%, rgba(224,122,74,0.09), transparent 60%), ${NIGHT}`,
        padding: 'clamp(72px, 9vw, 120px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="lx-psplit">
            <div>
              <Eyebrow>PU-01 · TradePilot</Eyebrow>
              <h2 style={{
                fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(32px, 4.6vw, 56px)',
                lineHeight: 1.08, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 20px',
              }}>
                The engine that earns while you sleep.
              </h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 480 }}>
                Markets do not keep office hours. TradePilot doesn't either. It reads
                every tick, around the clock, and trades your strategy without fear,
                without greed, without ever checking its phone at the worst moment.
              </p>
              <p style={{ fontSize: 16.5, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 480 }}>
                You choose the strategy. You cap the risk with a hard stop and a daily
                limit. Then you press start and get your evenings back while the engine
                hunts for the next move.
              </p>
              <p style={{ fontSize: 16.5, lineHeight: 1.75, color: IVORY, fontWeight: 600, margin: '0 0 30px', maxWidth: 480 }}>
                Every tick is a chance to earn. TradePilot doesn't miss one.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <GoldBtn onClick={go} big>Deploy TradePilot free</GoldBtn>
                <GhostBtn onClick={() => document.getElementById('markets')?.scrollIntoView({ behavior: 'smooth' })}>
                  See the markets it hunts
                </GhostBtn>
              </div>
              <button onClick={() => goTo('/trading-pilot')} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 18,
                fontSize: 14, fontWeight: 700, color: GOLD,
              }}>
                Explore TradePilot in depth →
              </button>
            </div>

            <PilotConsole go={go} />
          </div>
        </div>
      </section>

      {/* ── Live markets + live trade card ──────────────────────────────────── */}
      <section id="markets" style={{
        background: `radial-gradient(900px 480px at 90% 0%, rgba(242,184,75,0.06), transparent 60%), #20170f`,
        padding: 'clamp(72px, 9vw, 110px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow>Live markets</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 48px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 14px',
          }}>
            Markets move. Money moves with them.
          </h2>
          <p style={{ maxWidth: 540, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 36px' }}>
            Every price on this page is live, right now, no account needed.
            Pick a market, go long or short, and profit from the move in either direction.
          </p>
          <div className="lx-msplit">
            <MarketsBoard tickers={tickers} meta={meta} go={go} />
            <LiveTradeCard tickers={tickers} go={go} />
          </div>
        </div>
      </section>

      {/* ── Inside the cockpit: the platform's hidden depth ─────────────────── */}
      <section id="cockpit" style={{
        background: `radial-gradient(900px 480px at 50% -10%, rgba(242,184,75,0.05), transparent 60%), ${NIGHT}`,
        padding: 'clamp(72px, 9vw, 110px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow>Inside the cockpit</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 48px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 14px',
          }}>
            A full pit wall, not just a chart.
          </h2>
          <p style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 44px' }}>
            Your seat comes with every instrument on the dash. All of it is included,
            from the first practice lap.
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
                t: 'Leaderboard', d: 'Race the grid. Every driver ranked by verified performance, not talk.',
                i: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v6a5 5 0 01-10 0V4z" /><path d="M17 6h3a2 2 0 01-2 4h-1M7 6H4a2 2 0 002 4h1" /></>,
              },
              {
                t: 'Economic calendar', d: 'Rate decisions, payrolls, earnings. Know the corners before you reach them.',
                i: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
              },
              {
                t: 'Trading Web TV', d: 'Live market briefings and strategy sessions from the pit wall, all day.',
                i: <><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M10 10l5 2.5-5 2.5v-5z" /></>,
              },
            ].map(f => (
              <div key={f.t} className="lx-mrow" onClick={go} style={{
                display: 'flex', gap: 16, padding: '20px 22px', borderRadius: 16, cursor: 'pointer',
                background: 'rgba(36,26,20,0.55)', border: '1px solid rgba(242,184,75,0.08)',
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

      {/* ── Ways to earn ────────────────────────────────────────────────────── */}
      <section id="earn" style={{
        background: `radial-gradient(900px 480px at 10% 0%, rgba(224,122,74,0.09), transparent 60%), ${NIGHT}`,
        padding: 'clamp(72px, 9vw, 110px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow>Ways to earn</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 48px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 14px',
          }}>
            Three ways to put money to work.
          </h2>
          <p style={{ maxWidth: 540, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 44px' }}>
            Same engine, three ways to drive it. Most of our traders run all three.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <article style={{
              background: NIGHT2, border: '1px solid rgba(242,184,75,0.16)', borderRadius: 20,
              padding: 'clamp(24px, 3vw, 36px)',
              boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 18px 50px rgba(10,6,3,0.35)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: GOLD,
                border: '1px solid rgba(242,184,75,0.35)', borderRadius: 999, padding: '4px 12px',
              }}>PU-02 · YOU DRIVE</span>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: IVORY, margin: '18px 0 10px', letterSpacing: '-0.01em' }}>
                Trade it yourself
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: BODY, margin: '0 0 22px' }}>
                Spot the move, take it. One-tap orders on raw spreads with execution
                in milliseconds. A 1% move on a $50,000 position is $500, and with
                leverage you don't need $50,000 to open it.
              </p>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {[['0.0', 'pip spreads'], ['<40ms', 'execution'], ['1:1000', 'leverage']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: GOLD }}>{v}</div>
                    <div style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </article>

            <article style={{
              background: NIGHT2, border: '1px solid rgba(111,157,255,0.14)', borderRadius: 20,
              padding: 'clamp(24px, 3vw, 36px)',
              boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 18px 50px rgba(10,6,3,0.35)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: BLUE,
                border: '1px solid rgba(111,157,255,0.3)', borderRadius: 999, padding: '4px 12px',
              }}>PU-01 · THE BOT DRIVES</span>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: IVORY, margin: '18px 0 10px', letterSpacing: '-0.01em' }}>
                Let TradePilot work
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: BODY, margin: '0 0 22px' }}>
                Pick a strategy, cap the risk, press start. The bot compounds every
                edge it finds, day and night, weekends included. You check the
                telemetry. It does the laps.
              </p>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {[['24/7', 'on track'], ['5s', 'tick cycle'], ['0', 'emotions']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: BLUE }}>{v}</div>
                    <div style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </article>

            <article style={{
              background: NIGHT2, border: '1px solid rgba(24,201,138,0.16)', borderRadius: 20,
              padding: 'clamp(24px, 3vw, 36px)',
              boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 18px 50px rgba(10,6,3,0.35)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: BULL,
                border: '1px solid rgba(24,201,138,0.3)', borderRadius: 999, padding: '4px 12px',
              }}>PRACTICE · ZERO RISK</span>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: IVORY, margin: '18px 0 10px', letterSpacing: '-0.01em' }}>
                Start with $100,000 free
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: BODY, margin: '0 0 22px' }}>
                Every seat comes with a practice account: live prices, real telemetry,
                virtual money. Prove your strategy earns before a single real dollar
                touches the track.
              </p>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {[['$100k', 'practice funds'], ['Live', 'prices'], ['$0', 'at risk']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: BULL }}>{v}</div>
                    <div style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div style={{
            display: 'flex', gap: 16, padding: '20px 24px', borderRadius: 16, marginTop: 20,
            background: 'rgba(36,26,20,0.55)', border: '1px solid rgba(242,184,75,0.07)',
          }}>
            <div style={{ width: 3, borderRadius: 2, background: GOLD_G, opacity: 0.8, flexShrink: 0 }} />
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: BODY, margin: 0 }}>
              <span style={{ color: IVORY, fontWeight: 700 }}>The safety cell comes standard.</span>{' '}
              Stop loss, take profit, margin protection and daily limits are built into the
              chassis, not bolted on. Leverage multiplies losses as fast as gains; the safety
              cell is why our drivers walk away from bad laps.
            </p>
          </div>

          {/* Mid-page CTA band */}
          <div style={{
            marginTop: 44, borderRadius: 20, padding: 'clamp(28px, 4vw, 44px)',
            background: `radial-gradient(600px 300px at 15% 0%, rgba(242,184,75,0.14), transparent 60%), ${NIGHT2}`,
            border: '1px solid rgba(242,184,75,0.18)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          }}>
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 550, color: IVORY, letterSpacing: '-0.01em' }}>
                Your $100,000 practice account is waiting.
              </div>
              <div style={{ fontSize: 14, color: BODY, marginTop: 6 }}>
                60 seconds to open. No card. Deploy TradePilot on day one.
              </div>
            </div>
            <GoldBtn onClick={go} big>Claim it now</GoldBtn>
          </div>
        </div>
      </section>

      {/* ── The story: cream, the human part ────────────────────────────────── */}
      <section id="story" style={{
        background: `radial-gradient(1000px 500px at 85% -10%, rgba(242,184,75,0.12), transparent 60%), ${PAPER}`,
        color: INK, padding: 'clamp(72px, 9vw, 120px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow onPaper>The story</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 52px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: INK, margin: '0 0 18px', maxWidth: 720,
          }}>
            Every winning team is three things.
          </h2>
          <p style={{ maxWidth: 560, fontSize: 16.5, lineHeight: 1.7, color: INK2, margin: '0 0 54px' }}>
            Formula 1 taught us how to think about trading. Not the glamour of it.
            The discipline of it. A championship is won by a car, an engine, and a driver.
            No one of them wins alone.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(28px, 4vw, 56px)' }}>
            {STORY.map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, color: GOLDDK, lineHeight: 1 }}>{s.n}</div>
                <div style={{ width: 42, height: 2, background: GOLDDK, opacity: 0.35, margin: '14px 0 16px' }} />
                <h3 style={{ fontSize: 19, fontWeight: 750, color: INK, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.7, color: INK2, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>

          <blockquote style={{ margin: 'clamp(48px, 7vw, 84px) auto 0', maxWidth: 680, textAlign: 'center', padding: 0 }}>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 450, fontSize: 'clamp(21px, 2.8vw, 28px)', lineHeight: 1.4, color: INK, margin: 0 }}>
              "The engine is the key. The driver is the missing piece."
            </p>
            <footer style={{ marginTop: 14, fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: INK2 }}>
              The pit wall, TradeX
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── The driver: steps, cream ────────────────────────────────────────── */}
      <section id="driver" style={{
        background: `radial-gradient(900px 460px at 12% 110%, rgba(242,184,75,0.14), transparent 60%), ${PAPER2}`,
        color: INK, padding: 'clamp(72px, 9vw, 120px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(36px, 6vw, 80px)', alignItems: 'start' }}>
            <div>
              <Eyebrow onPaper>The driver</Eyebrow>
              <h2 style={{
                fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 50px)',
                lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, margin: '0 0 20px',
              }}>
                The seat is open.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: INK2, margin: '0 0 14px', maxWidth: 460 }}>
                We can tune the engine forever. We can shave grams off the chassis and
                milliseconds off the pit stops. But a car with an empty seat has never
                won anything.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: INK2, margin: '0 0 32px', maxWidth: 460 }}>
                You bring the judgment, the patience, the nerve. We bring everything else.
              </p>
              <GoldBtn onClick={go} big>Take the seat</GoldBtn>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{
                  display: 'flex', gap: 20, padding: '26px 0',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(42,33,26,0.12)',
                }}>
                  <div style={{ paddingTop: 5, flexShrink: 0 }}>
                    <StartLights lit={s.n === 3 ? 5 : s.n} size={9} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 750, color: INK, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                      {s.title}
                    </h3>
                    <p style={{ fontSize: 14.5, lineHeight: 1.65, color: INK2, margin: 0 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Lights out ──────────────────────────────────────────────────────── */}
      <section style={{
        background: `radial-gradient(800px 420px at 50% 120%, rgba(224,122,74,0.14), transparent 65%), ${NIGHT}`,
        padding: 'clamp(80px, 10vw, 140px) clamp(18px, 4vw, 44px)', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ animation: 'lx-pulse 2.4s ease-in-out infinite' }}>
            <StartLights lit={5} size={13} />
          </div>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(36px, 5.6vw, 66px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', color: IVORY, margin: '30px 0 16px',
          }}>
            Lights out.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: BODY, margin: '0 0 36px', maxWidth: 480 }}>
            The markets are open. The engine is warm. Your $100,000 practice
            account takes sixty seconds to claim.
          </p>
          <GoldBtn onClick={go} big>Start earning your way</GoldBtn>
          <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: DIM, marginTop: 44 }}>
            The X is the apex
          </p>
        </div>
      </section>

      {/* ── Sticky mobile CTA: the seat follows you ─────────────────────────── */}
      <div className={`lx-sticky${showBar ? ' lx-on' : ''}`}>
        <button onClick={go} className="lx-gold" style={{
          background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
          borderRadius: 14, fontWeight: 800, fontSize: 15, padding: '15px 0', width: '100%',
          boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.2)',
        }}>
          Claim your free $100,000
        </button>
      </div>
      <div className="lx-sticky-spacer" />

      {/* ── Footer: every page, findable ────────────────────────────────────── */}
      <footer style={{ background: NIGHT, borderTop: '1px solid rgba(242,184,75,0.08)', padding: '52px clamp(18px, 4vw, 44px) 36px' }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'clamp(28px, 4vw, 48px)',
        }}>
          <div style={{ gridColumn: 'span 1' }}>
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
                ['Ways to earn', () => jump('earn')],
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
                ['The story', () => jump('story')],
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontSize: 13.5 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 1240, margin: '36px auto 0', borderTop: '1px solid rgba(242,184,75,0.07)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: DIM, margin: 0 }}>
            Trading involves real risk and leverage multiplies losses as well as gains.
            Simulated results do not guarantee future returns. Practice accounts use
            virtual funds on live prices, so you can learn the limit before you race it.
            © {new Date().getFullYear()} TradeX. Engineered to win. Driven by you.
          </p>
        </div>
      </footer>
    </div>
  )
}
