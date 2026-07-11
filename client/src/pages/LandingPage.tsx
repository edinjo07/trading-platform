import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/ui/BrandMark'
import AssetIcon from '../components/ui/AssetIcon'

/* ════════════════════════════════════════════════════════════════════════════
   TradeX. The homepage.

   The story: the car is the company. The engine is the trading, two power
   units, TradePilot and Manual. But engines don't win championships.
   Drivers do. The driver is the missing piece. The driver is you.

   The feeling: golden hour at the circuit. Warm tarmac, low sun, long
   shadows. Dark sections are espresso and ember, never cold navy. Cream
   sections read like the pages of a team's story, set in a warm serif.
   Blue exists only as a small machine tag. Gold is the human, the win,
   and it stays scarce.

   Motto: "Engineered to win. Driven by you."
   ════════════════════════════════════════════════════════════════════════════ */

/* ── The palette: dusk, not midnight ─────────────────────────────────────── */

const NIGHT   = '#1a1310'   // warm near-black, hot tarmac after sunset
const NIGHT2  = '#241a14'   // raised surfaces on dark
const NIGHT3  = '#2e2118'   // hover / borders base
const PAPER   = '#f6efe3'   // cream, the story pages
const PAPER2  = '#efe6d6'   // cream, slightly deeper
const INK     = '#2a211a'   // warm espresso ink on cream
const INK2    = '#6d5f50'   // secondary text on cream
const IVORY   = '#f7f2e6'   // headline light on dark
const BODY    = '#c7b8a5'   // body text on dark
const DIM     = '#8d7d6a'   // quiet labels on dark
const GOLD    = '#f2b84b'   // Victory Gold, the human
const GOLDDK  = '#a3701c'   // gold legible on cream
const GOLD_G  = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const EMBER   = '#e07a4a'   // warm accent, exhaust heat
const BLUE    = '#6f9dff'   // the machine. small doses only.
const BULL    = '#18c98a'
const BEAR    = '#ff5a72'

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"

/* ── Display data ─────────────────────────────────────────────────────────── */

const TICKER = [
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

const MARKETS = [
  { sym: 'BTCUSD', name: 'Bitcoin',    price: '67,420.50', chg: '+2.41%', up: true,  cls: 'crypto'    },
  { sym: 'ETHUSD', name: 'Ethereum',   price: '3,512.80',  chg: '+1.83%', up: true,  cls: 'crypto'    },
  { sym: 'EURUSD', name: 'Euro / USD', price: '1.08420',   chg: '+0.12%', up: true,  cls: 'forex'     },
  { sym: 'XAUUSD', name: 'Gold Spot',  price: '2,334.10',  chg: '+0.34%', up: true,  cls: 'commodity' },
  { sym: 'NVDA',   name: 'NVIDIA',     price: '875.40',    chg: '+3.14%', up: true,  cls: 'stock'     },
  { sym: 'AAPL',   name: 'Apple',      price: '189.24',    chg: '-0.61%', up: false, cls: 'stock'     },
  { sym: 'US500',  name: 'US 500',     price: '5,320.4',   chg: '-0.22%', up: false, cls: 'index'     },
  { sym: 'WTI',    name: 'Crude Oil',  price: '78.42',     chg: '+1.05%', up: true,  cls: 'commodity' },
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
  { n: 1, title: 'Take the seat',   body: 'Sixty seconds, no card. Every driver gets a seat moulded to them.' },
  { n: 2, title: 'Practice flat out', body: 'A $100,000 practice balance on live prices. Same engine, same telemetry, zero risk.' },
  { n: 3, title: 'Lights out',      body: 'Go live when your numbers say you are ready. The engine is already warm.' },
]

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="font-extrabold tracking-tight text-lg" style={{ fontFamily: 'inherit' }}>
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

function GhostBtn({ children, onClick, dark = false }: { children: React.ReactNode; onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="lx-ghost"
      style={{
        background: 'transparent', cursor: 'pointer', borderRadius: 999,
        fontWeight: 600, fontSize: 14, padding: '12px 24px',
        color: dark ? INK : IVORY,
        border: `1px solid ${dark ? 'rgba(42,33,26,0.25)' : 'rgba(247,242,230,0.22)'}`,
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

/** Five start lights. `lit` of them glow. */
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

/* ── The page ─────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const isAuthenticated = !!token
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login?mode=register')

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
        .lx-navlink { color: ${BODY}; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s }
        .lx-navlink:hover { color: ${IVORY} }
        .lx-mrow { transition: background 0.15s, transform 0.15s }
        .lx-mrow:hover { background: rgba(242,184,75,0.05); transform: translateY(-1px) }
        @media (max-width: 720px) { .lx-navlinks { display: none } }
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
          <a className="lx-navlink" href="#story">The story</a>
          <a className="lx-navlink" href="#engine">The engine</a>
          <a className="lx-navlink" href="#markets">Markets</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="lx-navlink" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign in
          </button>
          <GoldBtn onClick={go}>Take the seat</GoldBtn>
        </div>
      </nav>

      {/* ── Hero: golden hour at the circuit ───────────────────────────────── */}
      <header style={{
        position: 'relative', minHeight: '100svh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        background: `
          linear-gradient(180deg, rgba(26,19,16,0.55) 0%, rgba(26,19,16,0.35) 40%, rgba(26,19,16,0.92) 88%, ${NIGHT} 100%),
          linear-gradient(100deg, rgba(26,19,16,0.82) 0%, rgba(26,19,16,0.35) 55%, rgba(224,122,74,0.12) 100%),
          url(/hero-bg.jpg) center / cover no-repeat,
          ${NIGHT}
        `,
      }}>
        <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '120px clamp(18px, 4vw, 44px) 90px' }}>
          <div className="lx-rise" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
            <StartLights lit={5} size={9} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
              A racing team for the markets
            </span>
          </div>

          <h1 className="lx-rise" style={{
            fontSize: 'clamp(46px, 8.4vw, 104px)', lineHeight: 0.98, letterSpacing: '-0.03em',
            fontWeight: 800, color: IVORY, margin: 0, animationDelay: '0.08s',
          }}>
            Engineered to win.
            <br />
            <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Driven by you.
            </span>
          </h1>

          <p className="lx-rise" style={{
            maxWidth: 540, fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: 1.65,
            color: BODY, margin: '28px 0 36px', animationDelay: '0.16s',
          }}>
            We spent years building the fastest trading engine we could.
            Then we left the seat open. It's yours, if you want it.
          </p>

          <div className="lx-rise" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', animationDelay: '0.24s' }}>
            <GoldBtn onClick={go} big>Take the seat</GoldBtn>
            <GhostBtn onClick={() => document.getElementById('engine')?.scrollIntoView({ behavior: 'smooth' })}>
              See the engine
            </GhostBtn>
          </div>

          <p className="lx-rise" style={{ fontSize: 13, color: DIM, marginTop: 22, animationDelay: '0.3s' }}>
            Free practice account · $100,000 in virtual fuel · no card needed
          </p>
        </div>

        {/* Ticker: proof of life at the bottom of the hero */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden',
          borderTop: '1px solid rgba(242,184,75,0.1)', background: 'rgba(26,19,16,0.72)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '11px 0',
        }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'lx-marquee 42s linear infinite' }}>
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', padding: '0 26px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DIM, letterSpacing: '0.04em' }}>{t.sym}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: IVORY }}>{t.price}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: t.up ? BULL : BEAR }}>{t.chg}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── The story: cream pages, a human voice ───────────────────────────── */}
      <section id="story" style={{
        background: `radial-gradient(1000px 500px at 85% -10%, rgba(242,184,75,0.12), transparent 60%), ${PAPER}`,
        color: INK, padding: 'clamp(72px, 10vw, 130px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow onPaper>The story</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(32px, 4.6vw, 56px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: INK, margin: '0 0 18px', maxWidth: 720,
          }}>
            Every winning team is three things.
          </h2>
          <p style={{ maxWidth: 560, fontSize: 17, lineHeight: 1.7, color: INK2, margin: '0 0 60px' }}>
            Formula 1 taught us how to think about trading. Not the glamour of it.
            The discipline of it. A championship is won by a car, an engine, and a driver.
            No one of them wins alone.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(28px, 4vw, 56px)' }}>
            {STORY.map(s => (
              <div key={s.n}>
                <div style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 500, color: GOLDDK, lineHeight: 1 }}>{s.n}</div>
                <div style={{ width: 42, height: 2, background: GOLDDK, opacity: 0.35, margin: '14px 0 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 750, color: INK, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: INK2, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>

          <blockquote style={{
            margin: 'clamp(56px, 8vw, 96px) auto 0', maxWidth: 680, textAlign: 'center', padding: 0,
          }}>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 450, fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.4, color: INK, margin: 0 }}>
              "The engine is the key. The driver is the missing piece."
            </p>
            <footer style={{ marginTop: 14, fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: INK2 }}>
              The pit wall, TradeX
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── The engine: back in the garage ──────────────────────────────────── */}
      <section id="engine" style={{
        background: `radial-gradient(900px 480px at 10% 0%, rgba(224,122,74,0.09), transparent 60%), radial-gradient(700px 400px at 95% 100%, rgba(242,184,75,0.06), transparent 60%), ${NIGHT}`,
        padding: 'clamp(72px, 10vw, 130px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow>The engine</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(32px, 4.6vw, 56px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 18px',
          }}>
            Two power units. One garage.
          </h2>
          <p style={{ maxWidth: 560, fontSize: 17, lineHeight: 1.7, color: BODY, margin: '0 0 54px' }}>
            Same engine block, two very different ways to drive it.
            Most of our drivers run both.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22 }}>
            {/* PU-01 */}
            <article style={{
              background: NIGHT2, border: '1px solid rgba(111,157,255,0.14)', borderRadius: 20,
              padding: 'clamp(26px, 3.4vw, 40px)',
              boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 18px 50px rgba(10,6,3,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: BLUE,
                  border: '1px solid rgba(111,157,255,0.3)', borderRadius: 999, padding: '4px 12px',
                }}>PU-01 · THE MACHINE</span>
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: IVORY, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                TradePilot
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: BODY, margin: '0 0 26px' }}>
                The relentless one. It watches every tick, around the clock, and never
                gets tired, never gets greedy, never checks its phone at the worst moment.
                You set the limits. It does the laps.
              </p>
              <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                {[['5s', 'tick cycle'], ['24/7', 'on track'], ['0', 'emotions']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: BLUE }}>{v}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </article>

            {/* PU-02 */}
            <article style={{
              background: NIGHT2, border: '1px solid rgba(242,184,75,0.16)', borderRadius: 20,
              padding: 'clamp(26px, 3.4vw, 40px)',
              boxShadow: '0 1px 2px rgba(10,6,3,0.5), 0 18px 50px rgba(10,6,3,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: GOLD,
                  border: '1px solid rgba(242,184,75,0.35)', borderRadius: 999, padding: '4px 12px',
                }}>PU-02 · THE HUMAN</span>
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: IVORY, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                Manual
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: BODY, margin: '0 0 26px' }}>
                Your hands on the wheel. Raw spreads, one-tap orders, execution measured
                in milliseconds. When you feel the moment coming, nothing should sit
                between you and it.
              </p>
              <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                {[['0.0', 'pip spreads'], ['<40ms', 'execution'], ['1:1000', 'leverage']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: GOLD }}>{v}</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM, marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          {/* Support systems, quiet row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, marginTop: 22 }}>
            {[
              ['The safety cell', 'Stop loss, take profit, margin protection and daily limits. Built into the chassis, not bolted on. Fast is nothing without control.'],
              ['The telemetry', 'Live equity, drawdown, win rate, attribution by bot and by strategy. Every lap is measured. Every trade is accounted for.'],
            ].map(([t, b]) => (
              <div key={t} style={{
                display: 'flex', gap: 16, padding: '22px 26px', borderRadius: 16,
                background: 'rgba(36,26,20,0.55)', border: '1px solid rgba(242,184,75,0.07)',
              }}>
                <div style={{ width: 3, borderRadius: 2, background: GOLD_G, opacity: 0.8, flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 750, color: IVORY, margin: '0 0 6px' }}>{t}</h4>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: BODY, margin: 0 }}>{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Markets: pick your circuit ──────────────────────────────────────── */}
      <section id="markets" style={{ background: '#20170f', padding: 'clamp(72px, 10vw, 120px) clamp(18px, 4vw, 44px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Eyebrow>The circuits</Eyebrow>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 4.2vw, 48px)',
            lineHeight: 1.1, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 14px',
          }}>
            Pick your circuit.
          </h2>
          <p style={{ maxWidth: 520, fontSize: 16, lineHeight: 1.7, color: BODY, margin: '0 0 44px' }}>
            Crypto, forex, stocks, gold, oil, indices. Two hundred and fifty
            instruments on the same feed the engine reads.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {MARKETS.map(m => (
              <div key={m.sym} className="lx-mrow" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 14, background: 'rgba(36,26,20,0.6)', border: '1px solid rgba(242,184,75,0.07)',
              }}>
                <AssetIcon symbol={m.sym} assetClass={m.cls} size={34} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: IVORY }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.04em' }}>{m.sym}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: IVORY }}>{m.price}</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: m.up ? BULL : BEAR }}>{m.chg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The driver: cream again, the seat is open ───────────────────────── */}
      <section id="driver" style={{
        background: `radial-gradient(900px 460px at 12% 110%, rgba(242,184,75,0.14), transparent 60%), ${PAPER2}`,
        color: INK, padding: 'clamp(72px, 10vw, 130px) clamp(18px, 4vw, 44px)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(36px, 6vw, 80px)', alignItems: 'start' }}>
            <div>
              <Eyebrow onPaper>The driver</Eyebrow>
              <h2 style={{
                fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(32px, 4.6vw, 54px)',
                lineHeight: 1.08, letterSpacing: '-0.015em', color: INK, margin: '0 0 20px',
              }}>
                The seat is open.
              </h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.75, color: INK2, margin: '0 0 14px', maxWidth: 460 }}>
                We can tune the engine forever. We can shave grams off the chassis and
                milliseconds off the pit stops. But a car with an empty seat has never
                won anything.
              </p>
              <p style={{ fontSize: 16.5, lineHeight: 1.75, color: INK2, margin: '0 0 32px', maxWidth: 460 }}>
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
        padding: 'clamp(90px, 12vw, 160px) clamp(18px, 4vw, 44px)', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ animation: 'lx-pulse 2.4s ease-in-out infinite' }}>
            <StartLights lit={5} size={13} />
          </div>
          <h2 style={{
            fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(38px, 6vw, 72px)',
            lineHeight: 1.05, letterSpacing: '-0.02em', color: IVORY, margin: '30px 0 16px',
          }}>
            Lights out.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: BODY, margin: '0 0 36px', maxWidth: 460 }}>
            The grid is set. The engine is warm. One seat is still open,
            and it has your name on it.
          </p>
          <GoldBtn onClick={go} big>Take the seat</GoldBtn>
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
            <a className="lx-navlink" href="#story">The story</a>
            <a className="lx-navlink" href="#engine">The engine</a>
            <a className="lx-navlink" href="#markets">Markets</a>
            <button onClick={() => navigate('/login')} className="lx-navlink" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Sign in
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1240, margin: '18px auto 0' }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: DIM, margin: 0 }}>
            Trading involves real risk. Practice accounts use virtual funds on live prices,
            so you can learn the limit before you race it. © {new Date().getFullYear()} TradeX.
            Engineered to win. Driven by you.
          </p>
        </div>
      </footer>
    </div>
  )
}
