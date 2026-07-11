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

   This is a trading platform and the homepage has to prove it in the first
   second: a live chart, live prices, and a clear way to earn. The markets
   endpoints are public, so everything the visitor sees here is real.

   The story stays: the car is the company, the engine is the trading
   (TradePilot and Manual), the driver is you. But the product leads and
   the story supports.

   The feeling stays too: golden hour at the circuit. Warm espresso darks,
   ember glows, cream story pages. Blue only as a small machine tag.
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

/* ── Live trade card: the product, in the hero ───────────────────────────── */

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
      {/* Symbol tabs */}
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

      {/* Price header */}
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

      {/* The chart */}
      <div style={{ height: 230, minWidth: 0 }}>
        <HeroChart symbol={sym} />
      </div>

      {/* Sell / Buy, same encoding as the platform */}
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
      {/* Tabs */}
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

      {/* Board */}
      <div style={{
        borderRadius: 18, border: '1px solid rgba(242,184,75,0.1)', overflow: 'hidden',
        background: 'rgba(36,26,20,0.55)',
      }}>
        <div className="lx-mhead" style={{
          display: 'grid', gridTemplateColumns: '1fr 130px 110px 90px', gap: 12,
          padding: '12px 20px', borderBottom: '1px solid rgba(242,184,75,0.08)',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: DIM,
        }}>
          <span>Market</span>
          <span style={{ textAlign: 'right' }}>Price</span>
          <span style={{ textAlign: 'right' }}>24h</span>
          <span />
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
              display: 'grid', gridTemplateColumns: '1fr 130px 110px 90px', gap: 12, alignItems: 'center',
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
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: GOLD }}>Trade →</span>
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
  const [tickers, setTickers] = useState<Record<string, Ticker>>({})
  const [meta, setMeta] = useState<Record<string, MarketSymbol>>({})

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Live public data: symbols once, tickers on a 5s heartbeat
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

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login?mode=register')

  // Marquee: live if we have it, fallback if not
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
        .lx-gold { transition: transform 0.18s ease, box-shadow 0.18s ease }
        .lx-gold:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(20,10,4,0.4), 0 16px 44px rgba(242,184,75,0.28) }
        .lx-gold:active { transform: translateY(0) }
        .lx-ghost { transition: border-color 0.18s ease, background 0.18s ease }
        .lx-ghost:hover { border-color: rgba(242,184,75,0.5); background: rgba(242,184,75,0.06) }
        .lx-navlink { color: ${BODY}; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .lx-navlink:hover { color: ${IVORY} }
        .lx-mrow { transition: background 0.15s }
        .lx-mrow:hover { background: rgba(242,184,75,0.06) }
        .lx-trade-btn { transition: filter 0.15s, transform 0.15s }
        .lx-trade-btn:hover { filter: brightness(1.25); transform: translateY(-1px) }
        @media (max-width: 720px) {
          .lx-navlinks { display: none }
          .lx-mgrid, .lx-mhead { grid-template-columns: 1fr 110px 80px !important }
          .lx-mgrid > :nth-child(4), .lx-mhead > :nth-child(4) { display: none }
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
        <div className="lx-navlinks" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a className="lx-navlink" href="#markets">Markets</a>
          <a className="lx-navlink" href="#earn">Ways to earn</a>
          <a className="lx-navlink" href="#story">The story</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="lx-navlink" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign in
          </button>
          <GoldBtn onClick={go}>Start trading</GoldBtn>
        </div>
      </nav>

      {/* ── Hero: the product, live ─────────────────────────────────────────── */}
      <header style={{
        position: 'relative',
        background: `
          radial-gradient(1100px 600px at 85% 10%, rgba(224,122,74,0.1), transparent 60%),
          linear-gradient(180deg, rgba(26,19,16,0.6) 0%, rgba(26,19,16,0.85) 70%, ${NIGHT} 100%),
          url(/hero-bg.jpg) center / cover no-repeat,
          ${NIGHT}
        `,
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto',
          padding: '120px clamp(18px, 4vw, 44px) 120px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'clamp(32px, 5vw, 64px)', alignItems: 'center',
        }}>
          {/* Left: the promise */}
          <div>
            <div className="lx-rise" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <StartLights lit={5} size={9} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
                Crypto · Forex · Stocks · Gold · Indices
              </span>
            </div>

            <h1 className="lx-rise" style={{
              fontSize: 'clamp(40px, 5.6vw, 68px)', lineHeight: 1.02, letterSpacing: '-0.03em',
              fontWeight: 800, color: IVORY, margin: 0, animationDelay: '0.08s',
            }}>
              Trade the world's markets.
              <br />
              <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Built to help you win.
              </span>
            </h1>

            <p className="lx-rise" style={{
              maxWidth: 500, fontSize: 'clamp(15px, 1.8vw, 17px)', lineHeight: 1.65,
              color: BODY, margin: '24px 0 30px', animationDelay: '0.16s',
            }}>
              Go long or short on 250+ instruments with raw spreads and leverage
              up to 1:1000. Trade it yourself, or let TradePilot run the laps for you.
              Start with a free $100,000 practice account and go live when you're ready to earn.
            </p>

            <div className="lx-rise" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', animationDelay: '0.24s' }}>
              <GoldBtn onClick={go} big>Start trading free</GoldBtn>
              <GhostBtn onClick={() => document.getElementById('markets')?.scrollIntoView({ behavior: 'smooth' })}>
                See live markets
              </GhostBtn>
            </div>

            {/* Proof row */}
            <div className="lx-rise" style={{ display: 'flex', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', marginTop: 40, animationDelay: '0.3s' }}>
              {[['250+', 'instruments'], ['0.0', 'pip spreads'], ['1:1000', 'leverage'], ['<40ms', 'execution']].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: IVORY }}>{v}</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            <p className="lx-rise" style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: DIM, marginTop: 36, animationDelay: '0.36s' }}>
              Engineered to win · Driven by you
            </p>
          </div>

          {/* Right: the product, alive */}
          <div className="lx-rise" style={{ animationDelay: '0.2s', minWidth: 0 }}>
            <LiveTradeCard tickers={tickers} go={go} />
          </div>
        </div>

        {/* Ticker marquee */}
        <div style={{
          position: 'relative', overflow: 'hidden',
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

      {/* ── Live markets ────────────────────────────────────────────────────── */}
      <section id="markets" style={{
        background: `radial-gradient(900px 480px at 90% 0%, rgba(242,184,75,0.06), transparent 60%), ${NIGHT}`,
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
          <MarketsBoard tickers={tickers} meta={meta} go={go} />
        </div>
      </section>

      {/* ── Ways to earn ────────────────────────────────────────────────────── */}
      <section id="earn" style={{
        background: `radial-gradient(900px 480px at 10% 0%, rgba(224,122,74,0.09), transparent 60%), #20170f`,
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
            {/* Manual */}
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
                in milliseconds. Long when it rises, short when it falls. You earn
                on the move, not the direction.
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

            {/* TradePilot */}
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
                Pick a strategy, cap the risk, press start. The bot watches every tick
                around the clock and trades your plan without fear or greed. You
                check the telemetry. It does the laps.
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

            {/* Demo */}
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

          {/* Safety line */}
          <div style={{
            display: 'flex', gap: 16, padding: '20px 24px', borderRadius: 16, marginTop: 20,
            background: 'rgba(36,26,20,0.55)', border: '1px solid rgba(242,184,75,0.07)',
          }}>
            <div style={{ width: 3, borderRadius: 2, background: GOLD_G, opacity: 0.8, flexShrink: 0 }} />
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: BODY, margin: 0 }}>
              <span style={{ color: IVORY, fontWeight: 700 }}>The safety cell comes standard.</span>{' '}
              Stop loss, take profit, margin protection and daily limits are built into the
              chassis, not bolted on. Fast is nothing without control.
            </p>
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
              <GoldBtn onClick={go} big>Start trading free</GoldBtn>
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
            The markets are open. The engine is warm. One seat is still empty,
            and it has your name on it.
          </p>
          <GoldBtn onClick={go} big>Start trading free</GoldBtn>
          <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: DIM, marginTop: 44 }}>
            The X is the apex
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: NIGHT, borderTop: '1px solid rgba(242,184,75,0.08)', padding: '36px clamp(18px, 4vw, 44px)' }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between', gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark size={24} />
            <Wordmark />
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <a className="lx-navlink" href="#markets">Markets</a>
            <a className="lx-navlink" href="#earn">Ways to earn</a>
            <a className="lx-navlink" href="#story">The story</a>
            <button onClick={() => navigate('/login')} className="lx-navlink" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Sign in
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1240, margin: '18px auto 0' }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: DIM, margin: 0 }}>
            Trading involves real risk and leverage can work against you. Practice accounts
            use virtual funds on live prices, so you can learn the limit before you race it.
            © {new Date().getFullYear()} TradeX. Engineered to win. Driven by you.
          </p>
        </div>
      </footer>
    </div>
  )
}
