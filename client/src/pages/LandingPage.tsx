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
   TradeX. The homepage of a broker, not a brochure.

   Rule one: the product is the hero. A live WebTrader frame with real
   prices opens the page; markets, pricing and tools follow in broker
   order. The F1 identity survives as a signature, not a theme: gold as
   the accent, the start lights, the closing shot of the car, and the
   motto at the end. Everything else is data.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Palette: deep warm dark, sleek not sooty ────────────────────────────── */

const NIGHT   = '#161011'
const NIGHT2  = '#201818'
const PANEL   = '#1b1414'
const IVORY   = '#f7f2e6'
const BODY    = '#c9bcae'
const DIM     = '#8d7d6a'
const GOLD    = '#f2b84b'
const GOLD_G  = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const BLUE    = '#6f9dff'
const BULL    = '#18c98a'
const BEAR    = '#ff5a72'

const SERIF = "'Fraunces', Georgia, serif"
const MONO  = "'JetBrains Mono', monospace"
const HAIR  = 'rgba(242,184,75,0.09)'

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

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Wordmark() {
  return (
    <span className="font-extrabold tracking-tight text-lg">
      <span style={{ color: IVORY }}>Trade</span>
      <span style={{ color: GOLD }}>X</span>
    </span>
  )
}

function GoldBtn({ children, onClick, big = false, wide = false }: {
  children: React.ReactNode; onClick: () => void; big?: boolean; wide?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="lx-gold"
      style={{
        background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
        borderRadius: 12, fontWeight: 800, letterSpacing: '0.01em',
        fontSize: big ? 16 : 14, padding: big ? '16px 36px' : '11px 22px',
        width: wide ? '100%' : undefined,
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
        background: 'transparent', cursor: 'pointer', borderRadius: 12,
        fontWeight: 600, fontSize: 14, padding: '12px 24px',
        color: IVORY, border: '1px solid rgba(247,242,230,0.22)',
      }}
    >
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
      fontSize: 'clamp(28px, 3.8vw, 44px)', fontWeight: 800, letterSpacing: '-0.025em',
      lineHeight: 1.08, color: IVORY, margin: '0 0 14px',
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

function fmtPct(p: number) { return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%` }

/* ── Live chart: real candles, warm skin, no chrome ──────────────────────── */

function HeroChart({ symbol, height = 240 }: { symbol: string; height?: number }) {
  const boxRef = useRef<HTMLDivElement>(null)

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

    getCandles(symbol, '15m', 96)
      .then(candles => {
        if (dead || candles.length === 0) return
        const up = candles[candles.length - 1].close >= candles[0].close
        const series = chart.addAreaSeries({
          lineColor: up ? BULL : BEAR, lineWidth: 2,
          topColor: up ? 'rgba(24,201,138,0.28)' : 'rgba(255,90,114,0.24)',
          bottomColor: 'rgba(22,16,17,0)',
          priceLineVisible: false, lastValueVisible: true,
          crosshairMarkerVisible: false,
        })
        series.setData(candles.map(c => ({ time: c.time as UTCTimestamp, value: c.close })))
        chart.timeScale().fitContent()
      })
      .catch(() => { /* header still shows; the page must never break */ })

    const onResize = () => {
      if (boxRef.current) chart.applyOptions({ width: boxRef.current.clientWidth, height: boxRef.current.clientHeight })
    }
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(boxRef.current)
    return () => { dead = true; ro.disconnect(); chart.remove() }
  }, [symbol])

  return <div ref={boxRef} style={{ width: '100%', height }} />
}

/* ── The hero: a live WebTrader frame ─────────────────────────────────────── */

function PlatformFrame({ tickers, go }: { tickers: Record<string, Ticker>; go: () => void }) {
  const [sym, setSym] = useState('BTCUSD')
  const [lev, setLev] = useState(100)
  const t = tickers[sym]
  const up = (t?.changePercent ?? 0) >= 0

  return (
    <div className="lx-frame" style={{ position: 'relative' }}>
      {/* under-glow */}
      <div style={{
        position: 'absolute', inset: '12% -6% -8% -6%', borderRadius: 40, filter: 'blur(60px)',
        background: 'radial-gradient(50% 60% at 50% 60%, rgba(242,184,75,0.16), rgba(111,157,255,0.07) 60%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        background: 'rgba(27,20,20,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(242,184,75,0.18)',
        boxShadow: '0 1px 2px rgba(8,5,5,0.6), 0 40px 100px rgba(8,5,5,0.6)',
      }}>
        {/* Browser bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${HAIR}`, background: 'rgba(22,16,17,0.8)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <div style={{
            flex: 1, maxWidth: 280, margin: '0 auto', textAlign: 'center',
            fontSize: 11, fontFamily: MONO, color: DIM, background: 'rgba(242,184,75,0.05)',
            border: `1px solid ${HAIR}`, borderRadius: 8, padding: '4px 12px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            app.tradex.pro/webtrader
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: BULL }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: BULL, animation: 'lx-pulse 1.8s ease-in-out infinite' }} />
            LIVE
          </span>
        </div>

        {/* Symbol tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '10px 12px 0', flexWrap: 'wrap' }}>
          {HERO_SYMBOLS.map(s => (
            <button key={s} onClick={() => setSym(s)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                fontFamily: MONO,
                background: sym === s ? 'rgba(242,184,75,0.12)' : 'transparent',
                color: sym === s ? GOLD : DIM,
                border: `1px solid ${sym === s ? 'rgba(242,184,75,0.3)' : 'transparent'}`,
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Chart + trade panel */}
        <div className="lx-frame-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 172px', gap: 0 }}>
          <div style={{ padding: '4px 0 0 4px', minWidth: 0 }}>
            <HeroChart symbol={sym} height={252} />
          </div>

          <div style={{ borderLeft: `1px solid ${HAIR}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AssetIcon symbol={sym} assetClass={HERO_CLASS[sym] ?? 'crypto'} size={26} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO, color: IVORY, lineHeight: 1.1 }}>
                  {t ? formatPrice(t.price, sym) : '––'}
                </div>
                <div style={{ fontSize: 10.5, fontFamily: MONO, fontWeight: 700, color: up ? BULL : BEAR }}>
                  {t ? fmtPct(t.changePercent) : ''}
                </div>
              </div>
            </div>

            <button onClick={go} className="lx-trade-btn" style={{
              padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,90,114,0.3)',
              background: 'rgba(255,90,114,0.1)', color: BEAR, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: MONO,
            }}>
              SELL {t?.bid ? formatPrice(t.bid, sym) : ''}
            </button>
            <button onClick={go} className="lx-trade-btn" style={{
              padding: '9px 0', borderRadius: 10, border: '1px solid rgba(24,201,138,0.3)',
              background: 'rgba(24,201,138,0.1)', color: BULL, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: MONO,
            }}>
              BUY {t?.ask ? formatPrice(t.ask, sym) : ''}
            </button>

            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginBottom: 6 }}>Leverage</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[10, 100, 500].map(l => (
                  <button key={l} onClick={() => setLev(l)}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
                      background: lev === l ? 'rgba(111,157,255,0.14)' : 'rgba(247,242,230,0.04)',
                      color: lev === l ? BLUE : DIM,
                      border: `1px solid ${lev === l ? 'rgba(111,157,255,0.35)' : 'transparent'}`,
                    }}>
                    1:{l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10.5, color: DIM, lineHeight: 1.5 }}>
              $500 margin controls{' '}
              <span style={{ color: IVORY, fontFamily: MONO }}>${(500 * lev).toLocaleString()}</span>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <GoldBtn onClick={go} wide>Start trading</GoldBtn>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: 'flex', gap: 18, padding: '9px 14px', borderTop: `1px solid ${HAIR}`, background: 'rgba(22,16,17,0.6)', flexWrap: 'wrap' }}>
          {[
            ['24H HIGH', t ? formatPrice(t.high24h, sym) : '––'],
            ['24H LOW', t ? formatPrice(t.low24h, sym) : '––'],
            ['VOL', t ? (t.volume24h >= 1e9 ? `${(t.volume24h / 1e9).toFixed(2)}B` : t.volume24h >= 1e6 ? `${(t.volume24h / 1e6).toFixed(2)}M` : `${(t.volume24h / 1e3).toFixed(0)}K`) : '––'],
            ['SPREAD', t?.spread ? t.spread.toFixed(t.spread < 0.01 ? 5 : 2) : 'RAW'],
          ].map(([l, v]) => (
            <span key={l} style={{ fontSize: 10, fontFamily: MONO }}>
              <span style={{ color: DIM }}>{l} </span>
              <span style={{ color: BODY }}>{v}</span>
            </span>
          ))}
        </div>
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
      boxShadow: '0 1px 2px rgba(8,5,5,0.5), 0 30px 80px rgba(8,5,5,0.45)',
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
            background: 'rgba(22,16,17,0.6)', border: `1px solid ${HAIR}`,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap' }}>{v}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.9, color: DIM, background: 'rgba(22,16,17,0.6)', borderRadius: 12, padding: '10px 14px', border: `1px solid ${HAIR}` }}>
        <div><span style={{ color: BULL }}>▲ BUY</span> BTCUSD 0.050 @ 67,410.25 <span style={{ color: BULL }}>+$128.40</span></div>
        <div><span style={{ color: BEAR }}>▼ SELL</span> EURUSD 25,000 @ 1.08442 <span style={{ color: BULL }}>+$61.20</span></div>
        <div><span style={{ color: BULL }}>▲ BUY</span> XAUUSD 4.0 @ 2,331.80 <span style={{ color: DIM }}>running…</span></div>
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

      <div style={{
        borderRadius: 18, border: `1px solid ${HAIR}`, overflow: 'hidden', background: PANEL,
      }}>
        <div className="lx-mhead" style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 90px 172px', gap: 12,
          padding: '12px 20px', borderBottom: `1px solid ${HAIR}`,
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
        Live prices, no account needed. 250+ instruments inside, this is the front row.
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
  const [tickers, setTickers] = useState<Record<string, Ticker>>({})
  const [meta, setMeta] = useState<Record<string, MarketSymbol>>({})

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pagesRef.current && !pagesRef.current.contains(e.target as Node)) setPagesOpen(false)
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

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const go = () => { setMenuOpen(false); navigate(isAuthenticated ? '/dashboard' : '/login?mode=register') }
  const goTo = (path: string) => { setMenuOpen(false); navigate(path) }
  const jump = (id: string) => {
    setMenuOpen(false)
    setPagesOpen(false)
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  const PAGE_LINKS: [string, () => void][] = [
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
        .lx-mini { border: none; cursor: pointer; border-radius: 9px; font-weight: 800; font-size: 11.5px;
          font-family: ${MONO}; padding: 7px 0; width: 76px; transition: filter 0.15s, transform 0.15s }
        .lx-mini:hover { filter: brightness(1.3); transform: translateY(-1px) }
        .lx-hsplit { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(28px, 4vw, 60px); align-items: center }
        .lx-psplit { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: clamp(28px, 4.5vw, 64px); align-items: center }
        .lx-frame { transform: perspective(1600px) rotateY(-5deg) rotateX(1.5deg); transition: transform 0.4s ease }
        .lx-frame:hover { transform: perspective(1600px) rotateY(-2deg) rotateX(0.5deg) }
        .lx-sticky { display: none }
        .lx-sticky-spacer { display: none }
        .lx-burger { display: none; background: none; border: 1px solid rgba(242,184,75,0.25); border-radius: 10px;
          width: 42px; height: 42px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0 }
        .lx-drawer { position: fixed; inset: 0; z-index: 200; background: rgba(22,16,17,0.97);
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
          .lx-hsplit, .lx-psplit { grid-template-columns: 1fr }
          .lx-frame { transform: none }
          .lx-frame:hover { transform: none }
        }
        @media (max-width: 720px) {
          .lx-navlinks { display: none }
          .lx-burger { display: flex }
          .lx-navsignin { display: none }
          .lx-mgrid, .lx-mhead { grid-template-columns: 1fr 104px 74px !important }
          .lx-mgrid > :nth-child(4), .lx-mhead > :nth-child(4) { display: none }
          .lx-sticky {
            display: block; position: fixed; left: 0; right: 0; bottom: 0; z-index: 120;
            padding: 10px 14px calc(env(safe-area-inset-bottom) + 10px);
            background: rgba(22,16,17,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
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
          .lx-frame-body { grid-template-columns: 1fr !important }
          .lx-frame-body > div:last-child { border-left: none !important; border-top: 1px solid ${HAIR} }
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px clamp(18px, 4vw, 44px)',
        background: scrolled ? 'rgba(22,16,17,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${HAIR}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandMark size={30} />
          <Wordmark />
        </div>
        <div className="lx-navlinks" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <a className="lx-navlink" href="#markets">Markets</a>
          <a className="lx-navlink" href="#pilot">TradePilot</a>
          <a className="lx-navlink" href="#plans">Pricing</a>
          <a className="lx-navlink" href="#cockpit">Platform</a>

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
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'rgba(27,20,20,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(242,184,75,0.16)', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(8,5,5,0.5), 0 30px 80px rgba(8,5,5,0.6)',
              }}>
                <div style={{ padding: '18px 20px', borderRight: `1px solid ${HAIR}` }}>
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
          <span className="lx-navcta"><GoldBtn onClick={go}>Open account</GoldBtn></span>
          <button className="lx-burger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
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
          <button className="lx-dlink" onClick={() => jump('markets')}>Live markets</button>
          <button className="lx-dlink" onClick={() => jump('pilot')}>TradePilot</button>
          <button className="lx-dlink" onClick={() => jump('plans')}>Pricing</button>
          <button className="lx-dlink" onClick={() => jump('cockpit')}>The platform</button>

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
          <GoldBtn onClick={go} wide big>Open account</GoldBtn>
          <p style={{ fontSize: 12, color: DIM, textAlign: 'center', margin: '10px 0 0' }}>
            Free $100,000 demo · 60 seconds · no card
          </p>
        </div>
      </div>

      {/* ── Hero: the platform, live ────────────────────────────────────────── */}
      <header style={{
        position: 'relative',
        background: `
          radial-gradient(1200px 640px at 78% 8%, rgba(242,184,75,0.09), transparent 60%),
          radial-gradient(900px 520px at 10% 100%, rgba(111,157,255,0.05), transparent 60%),
          ${NIGHT}
        `,
      }}>
        <div className="lx-hsplit" style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '128px clamp(18px, 4vw, 44px) 96px',
        }}>
          {/* Left: the pitch */}
          <div>
            <div className="lx-rise" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <StartLights lit={5} size={8} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
                Crypto · Forex · Stocks · Gold · Indices
              </span>
            </div>

            <h1 className="lx-rise" style={{
              fontSize: 'clamp(40px, 5.6vw, 72px)', lineHeight: 1.0, letterSpacing: '-0.035em',
              fontWeight: 800, color: IVORY, margin: 0, animationDelay: '0.08s',
            }}>
              Trade the world's markets.
              <br />
              <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Earn in both directions.
              </span>
            </h1>

            <p className="lx-rise" style={{
              maxWidth: 500, fontSize: 'clamp(15px, 1.8vw, 17px)', lineHeight: 1.65,
              color: BODY, margin: '24px 0 30px', animationDelay: '0.16s',
            }}>
              250+ instruments with raw spreads from 0.0 pips, leverage to 1:1000
              and execution under 40 ms. Trade it yourself or let TradePilot run
              day and night. Every account starts with a free $100,000 demo.
            </p>

            <div className="lx-rise lx-hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', animationDelay: '0.24s' }}>
              <GoldBtn onClick={go} big>Open account</GoldBtn>
              <GhostBtn onClick={go}>Try the free demo</GhostBtn>
            </div>
            <p className="lx-rise" style={{ fontSize: 13, color: DIM, marginTop: 14, animationDelay: '0.28s' }}>
              60 seconds to open · no card · practice on live prices
            </p>

            <div className="lx-rise" style={{ display: 'flex', gap: 'clamp(20px, 3vw, 40px)', flexWrap: 'wrap', marginTop: 38, animationDelay: '0.32s' }}>
              {[['250+', 'instruments'], ['0.0', 'pip spreads'], ['1:1000', 'leverage'], ['<40ms', 'execution']].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: IVORY }}>{v}</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: the product */}
          <div className="lx-rise" style={{ animationDelay: '0.18s', minWidth: 0 }}>
            <PlatformFrame tickers={tickers} go={go} />
          </div>
        </div>

        {/* Ticker marquee */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderTop: `1px solid ${HAIR}`, background: 'rgba(22,16,17,0.72)', padding: '11px 0',
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

      {/* ── Trust band ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#1a1312', borderBottom: `1px solid ${HAIR}`, padding: '26px clamp(18px, 4vw, 44px)' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
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
              <div style={{ fontSize: 11, color: DIM }}>from our traders</div>
            </div>
          </div>
          {[['250+', 'instruments, 6 asset classes'], ['<40ms', 'average execution'], ['24/7', 'markets and support']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: GOLD }}>{v}</div>
              <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{ maxWidth: 1280, margin: '18px auto 0', fontSize: 11.5, lineHeight: 1.5, color: DIM }}>
          Leverage multiplies losses as well as gains. Trade with money you can afford to lose,
          and practice free for as long as you like first.
        </p>
      </section>

      {/* ── Live markets ────────────────────────────────────────────────────── */}
      <section id="markets" style={{ background: NIGHT, padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Eyebrow>Live markets</Eyebrow>
          <H2>Markets move. Money moves with them.</H2>
          <p style={{ maxWidth: 540, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 32px' }}>
            Every price below is live right now. Go long or short and profit
            from the move in either direction.
          </p>
          <MarketsBoard tickers={tickers} meta={meta} go={go} />
        </div>
      </section>

      {/* ── TradePilot ──────────────────────────────────────────────────────── */}
      <section id="pilot" style={{
        background: `radial-gradient(1000px 520px at 90% -10%, rgba(111,157,255,0.06), transparent 60%), #1a1312`,
        padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)',
        borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="lx-psplit">
            <div>
              <Eyebrow>TradePilot automation</Eyebrow>
              <H2>The engine that earns while you sleep.</H2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 480 }}>
                Markets do not keep office hours. TradePilot doesn't either. It reads
                every tick, around the clock, and trades your strategy without fear,
                without greed, without hesitation.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: BODY, margin: '0 0 14px', maxWidth: 480 }}>
                Four strategies, hard stops on every trade, a daily loss circuit-breaker,
                and full telemetry on every decision it makes.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: IVORY, fontWeight: 600, margin: '0 0 28px', maxWidth: 480 }}>
                Every tick is a chance to earn. TradePilot doesn't miss one.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <GoldBtn onClick={go} big>Deploy TradePilot free</GoldBtn>
                <GhostBtn onClick={() => goTo('/trading-pilot')}>Explore in depth</GhostBtn>
              </div>
            </div>
            <PilotConsole go={go} />
          </div>
        </div>
      </section>

      {/* ── Inside the platform ─────────────────────────────────────────────── */}
      <section id="cockpit" style={{ background: NIGHT, padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)' }}>
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

      {/* ── Pricing / account plans ─────────────────────────────────────────── */}
      <section id="plans" style={{
        background: `radial-gradient(900px 480px at 50% -10%, rgba(242,184,75,0.06), transparent 60%), #1a1312`,
        padding: 'clamp(64px, 8vw, 100px) clamp(18px, 4vw, 44px)',
        borderTop: `1px solid ${HAIR}`,
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
                position: 'relative', borderRadius: 20, padding: 'clamp(24px, 3vw, 32px)',
                background: NIGHT2,
                border: `1px solid ${p.popular ? 'rgba(242,184,75,0.45)' : HAIR}`,
                boxShadow: p.popular
                  ? '0 1px 2px rgba(8,5,5,0.5), 0 24px 70px rgba(242,184,75,0.1)'
                  : '0 1px 2px rgba(8,5,5,0.5), 0 18px 50px rgba(8,5,5,0.35)',
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
                      background: 'transparent', cursor: 'pointer', borderRadius: 12, width: '100%',
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

      {/* ── The closer: the only place the car appears ──────────────────────── */}
      <section style={{
        position: 'relative',
        background: `
          linear-gradient(180deg, ${NIGHT} 0%, rgba(22,16,17,0.55) 30%, rgba(22,16,17,0.75) 100%),
          url(/hero-bg.jpg) center 40% / cover no-repeat,
          ${NIGHT}
        `,
        padding: 'clamp(90px, 12vw, 150px) clamp(18px, 4vw, 44px)', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ animation: 'lx-pulse 2.4s ease-in-out infinite' }}>
            <StartLights lit={5} size={13} />
          </div>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(36px, 5.4vw, 64px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', color: IVORY, margin: '28px 0 14px',
            textShadow: '0 2px 30px rgba(8,5,5,0.6)',
          }}>
            Lights out.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: '#ddd2c2', margin: '0 0 14px', maxWidth: 480, textShadow: '0 1px 12px rgba(8,5,5,0.6)' }}>
            The markets are open. The engine is warm. Your free $100,000 demo
            takes sixty seconds to claim.
          </p>

          {/* Three steps, one line each */}
          <div style={{ display: 'flex', gap: 'clamp(18px, 4vw, 44px)', flexWrap: 'wrap', justifyContent: 'center', margin: '18px 0 34px' }}>
            {[['1', 'Open your account'], ['2', 'Practice on $100k'], ['3', 'Go live and earn']].map(([n, l]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(242,184,75,0.14)', border: '1px solid rgba(242,184,75,0.4)',
                  color: GOLD, fontSize: 12, fontWeight: 800, fontFamily: MONO,
                }}>{n}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#ddd2c2', textShadow: '0 1px 10px rgba(8,5,5,0.6)' }}>{l}</span>
              </div>
            ))}
          </div>

          <GoldBtn onClick={go} big>Open your account</GoldBtn>
          <p style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b3a48f', marginTop: 40, textShadow: '0 1px 10px rgba(8,5,5,0.6)' }}>
            Engineered to win · Driven by you
          </p>
        </div>
      </section>

      {/* ── Sticky mobile CTA ───────────────────────────────────────────────── */}
      <div className={`lx-sticky${showBar ? ' lx-on' : ''}`}>
        <GoldBtn onClick={go} wide big>Open account · free $100k demo</GoldBtn>
      </div>
      <div className="lx-sticky-spacer" />

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
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
                ['Pricing', () => jump('plans')],
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontSize: 13.5 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 1280, margin: '36px auto 0', borderTop: `1px solid ${HAIR}`, paddingTop: 20 }}>
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
