import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/ui/BrandMark'
import AssetIcon from '../components/ui/AssetIcon'

/* ════════════════════════════════════════════════════════════════════════════
   TradeX — Homepage
   The car is the company. The engine is the trading — TradePilot and manual,
   two power units. But engines don't win championships. Drivers do.
   The driver is the missing piece. The driver is you.

   Motto: "Engineered to win. Driven by you."
   Color story: the machine is cool blue — the human is warm gold.
   ════════════════════════════════════════════════════════════════════════════ */

const BLUE   = '#4f8cff'    // Signal Blue — the machine
const BLUE2  = '#7aa7ff'
const GOLD   = '#f6c453'    // Victory Gold — the human, the win
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const IVORY  = '#f4f1e8'    // warm headline white — a human light
const BODY   = '#aba5b6'    // body text
const DIM    = '#746d84'    // quiet labels

/* ── Static display data ──────────────────────────────────────────────────── */

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

const TELEMETRY = [
  { val: '0.0',    unit: 'pips', label: 'Raw spreads'  },
  { val: '<40',    unit: 'ms',   label: 'Execution'    },
  { val: '1:1000', unit: '',     label: 'Max leverage' },
  { val: '250+',   unit: '',     label: 'Instruments'  },
  { val: '24/7',   unit: '',     label: 'Support'      },
]

const SUPPORT_SYSTEMS = [
  {
    title: 'The safety cell',
    body: 'Stop-loss, take-profit, margin protection and daily loss limits — built into the chassis, not bolted on. Fast is nothing without control.',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: 'The telemetry',
    body: 'Live equity, drawdown, win rate, attribution by bot and strategy. Every lap is measured. Every trade is accounted for.',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: 'Seat fitting',           body: 'Create your account in sixty seconds. No card, no commitment. Every driver gets a seat moulded to them.' },
  { n: '02', title: 'Practice at full speed', body: 'A $100,000 practice balance on live prices. Same engine, same telemetry, zero risk. Learn the limit before you race it.' },
  { n: '03', title: 'Lights out',             body: 'Go live when your numbers say you are ready. The engine is already at temperature — it has been waiting for you.' },
]

const MARKETS = [
  { sym: 'BTCUSD', name: 'Bitcoin',    price: '67,420.50', chg: '+2.41%', up: true,  cat: 'Crypto',      cls: 'crypto'    },
  { sym: 'ETHUSD', name: 'Ethereum',   price: '3,512.80',  chg: '+1.83%', up: true,  cat: 'Crypto',      cls: 'crypto'    },
  { sym: 'EURUSD', name: 'Euro / USD', price: '1.08420',   chg: '+0.12%', up: true,  cat: 'Forex',       cls: 'forex'     },
  { sym: 'XAUUSD', name: 'Gold Spot',  price: '2,334.10',  chg: '+0.34%', up: true,  cat: 'Commodities', cls: 'commodity' },
  { sym: 'NVDA',   name: 'NVIDIA',     price: '875.40',    chg: '+3.14%', up: true,  cat: 'Stocks',      cls: 'stock'     },
  { sym: 'AAPL',   name: 'Apple',      price: '189.24',    chg: '-0.61%', up: false, cat: 'Stocks',      cls: 'stock'     },
  { sym: 'US500',  name: 'US 500',     price: '5,320.4',   chg: '-0.22%', up: false, cat: 'Indices',     cls: 'index'     },
  { sym: 'WTI',    name: 'Crude Oil',  price: '78.42',     chg: '+1.05%', up: true,  cat: 'Commodities', cls: 'commodity' },
]

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Wordmark({ size = 'text-lg' }: { size?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${size}`}>
      <span style={{ color: IVORY }}>Trade</span>
      <span style={{ color: BLUE }}>X</span>
      <span style={{ color: DIM }}> Pro</span>
    </span>
  )
}

/** Gradient-gold inline text — reserved for the human, the win */
function Gold({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
      {children}
    </span>
  )
}

function SectionTag({ children, warm = false }: { children: React.ReactNode; warm?: boolean }) {
  const c = warm ? GOLD : BLUE2
  return (
    <div className="inline-flex items-center gap-2.5 mb-4">
      <span style={{ width: 26, height: 2, background: c, display: 'inline-block', borderRadius: 2 }} />
      <span className="text-xs font-bold uppercase" style={{ color: c, letterSpacing: '0.18em' }}>{children}</span>
    </div>
  )
}

/** The gold CTA — the moment the human enters */
function GoldCTA({ children, onClick, big = false }: { children: React.ReactNode; onClick: () => void; big?: boolean }) {
  return (
    <button onClick={onClick} className="lp-gold-cta inline-flex items-center justify-center gap-2 rounded-xl font-extrabold"
      style={{
        padding: big ? '17px 40px' : '15px 30px',
        fontSize: big ? 16 : 15,
        background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
        boxShadow: '0 12px 44px rgba(242,184,75,0.34), inset 0 1px 0 rgba(255,255,255,0.35)',
        letterSpacing: '-0.01em',
      }}>
      {children}
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goToLogin    = () => navigate('/login')
  const goToRegister = () => navigate(user ? '/dashboard' : '/login?mode=register')
  const goToApp      = () => navigate(user ? '/dashboard' : '/login')
  const scrollTo = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const NAV_LINKS = [
    { label: 'The engine', id: 'engine'  },
    { label: 'The driver', id: 'driver'  },
    { label: 'Markets',    id: 'markets' },
    { label: 'Get started', id: 'start'  },
  ]

  return (
    <div className="theme-dark-scope min-h-screen" style={{ background: '#14121a', color: BODY, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Local keyframes + hovers */}
      <style>{`
        @keyframes lp-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes lp-pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes lp-sweep   { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        .lp-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
        .lp-card:hover { transform: translateY(-3px); border-color: rgba(246,196,83,0.32) !important; box-shadow: 0 20px 52px rgba(4,6,12,0.55); }
        .lp-gold-cta { transition: transform 0.15s ease, filter 0.2s ease, box-shadow 0.2s ease; }
        .lp-gold-cta:hover { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 16px 52px rgba(242,184,75,0.42), inset 0 1px 0 rgba(255,255,255,0.35); }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ════════ NAV ════════ */}
      <header className="fixed top-0 inset-x-0 z-50 transition-all"
        style={{
          background: scrolled || menuOpen ? 'rgba(20,18,26,0.9)' : 'transparent',
          backdropFilter: scrolled || menuOpen ? 'blur(14px)' : 'none',
          borderBottom: scrolled || menuOpen ? '1px solid rgba(166,150,120,0.12)' : '1px solid transparent',
        }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button className="flex items-center gap-2.5 shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <BrandMark size={32} />
            <Wordmark />
          </button>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="text-sm font-medium transition-colors"
                style={{ color: BODY, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = IVORY)}
                onMouseLeave={e => (e.currentTarget.style.color = BODY)}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button onClick={goToLogin} className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{ color: IVORY, background: 'rgba(244,241,232,0.06)', border: '1px solid rgba(166,150,120,0.2)', cursor: 'pointer' }}>
              Sign in
            </button>
            <button onClick={goToRegister} className="lp-gold-cta text-sm font-extrabold px-4 py-2 rounded-lg"
              style={{ color: '#221503', background: GOLD_G, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(242,184,75,0.3)' }}>
              Take the seat
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg"
            onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
            style={{ background: 'rgba(244,241,232,0.06)', border: '1px solid rgba(166,150,120,0.2)', color: IVORY, cursor: 'pointer' }}>
            {menuOpen
              ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-5 pb-5 pt-1 flex flex-col gap-1"
            style={{ borderTop: '1px solid rgba(166,150,120,0.1)' }}>
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="text-left text-[15px] font-medium py-3 px-2 rounded-lg"
                style={{ color: IVORY, background: 'none', border: 'none', cursor: 'pointer' }}>
                {l.label}
              </button>
            ))}
            <div className="flex gap-3 mt-3">
              <button onClick={goToLogin} className="flex-1 text-sm font-semibold py-3 rounded-xl"
                style={{ color: IVORY, background: 'rgba(244,241,232,0.06)', border: '1px solid rgba(166,150,120,0.2)', cursor: 'pointer' }}>
                Sign in
              </button>
              <button onClick={goToRegister} className="flex-1 text-sm font-extrabold py-3 rounded-xl"
                style={{ color: '#221503', background: GOLD_G, border: 'none', cursor: 'pointer' }}>
                Take the seat
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ════════ HERO — the car, at night, under warm light ════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
        {/* F1 background */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 32%',
        }} />
        {/* Cinematic night treatment — cool shadows, warm floodlight from below */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(to bottom, rgba(20,18,26,0.82) 0%, rgba(20,18,26,0.42) 40%, rgba(20,18,26,0.75) 74%, #14121a 100%),
            radial-gradient(85% 55% at 50% 44%, transparent 0%, rgba(20,18,26,0.45) 100%)
          `,
        }} />
        {/* Warm trackside glow — the human light */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
          height: '46%',
          background: 'radial-gradient(70% 90% at 50% 100%, rgba(242,184,75,0.13) 0%, rgba(242,184,75,0.04) 45%, transparent 75%)',
        }} />
        {/* Gold speed streak */}
        <div className="absolute pointer-events-none" style={{ left: 0, right: 0, top: '58%', height: 1.5, overflow: 'hidden', opacity: 0.85 }}>
          <div style={{ width: '30%', height: '100%', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: 'lp-sweep 4.5s cubic-bezier(0.6,0,0.3,1) infinite' }} />
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-6xl mx-auto px-5 sm:px-6 w-full" style={{ paddingTop: 96, paddingBottom: 32 }}>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-bold self-start mb-7"
            style={{ background: 'rgba(20,18,26,0.62)', border: '1px solid rgba(246,196,83,0.3)', color: GOLD, letterSpacing: '0.12em', backdropFilter: 'blur(8px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#18c98a', animation: 'lp-pulse 1.8s ease-in-out infinite' }} />
            FCA · CYSEC · CURAÇAO REGULATED — LIVE EXECUTION
          </div>

          {/* Headline — the motto itself */}
          <h1 className="font-extrabold" style={{
            fontSize: 'clamp(2.5rem, 7.6vw, 5.2rem)', lineHeight: 1.04, letterSpacing: '-0.03em',
            color: IVORY, textShadow: '0 4px 44px rgba(0,0,0,0.85)', maxWidth: 820,
          }}>
            Engineered to win.
            <br />
            <Gold>Driven by you.</Gold>
          </h1>

          {/* Sub — the story in three sentences */}
          <p className="mt-7 text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(244,241,232,0.86)', maxWidth: 590, textShadow: '0 2px 18px rgba(0,0,0,0.9)' }}>
            TradeX is the car — built to run fast and take titles in every market.
            TradePilot and manual execution are its engine. But engines don't win
            championships. <span style={{ color: IVORY, fontWeight: 600 }}>Drivers do.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <GoldCTA onClick={goToRegister}>Take the seat — it's free</GoldCTA>
            <button onClick={() => scrollTo('engine')}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-[15px] font-semibold"
              style={{ background: 'rgba(20,18,26,0.55)', color: IVORY, border: '1px solid rgba(166,150,120,0.32)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              Open the engine cover
            </button>
          </div>
        </div>

        {/* Telemetry strip — pit wall */}
        <div className="relative w-full" style={{ background: 'rgba(16,14,20,0.74)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(246,196,83,0.24)' }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {TELEMETRY.map((s, i) => (
              <div key={s.label} className="py-4 sm:py-5 px-2 sm:px-4 flex flex-col items-center text-center"
                style={{ borderLeft: i > 0 ? '1px solid rgba(166,150,120,0.1)' : 'none' }}>
                <div className="font-mono font-extrabold text-xl sm:text-2xl" style={{ color: GOLD, letterSpacing: '-0.02em' }}>
                  {s.val}<span className="text-xs sm:text-sm font-bold" style={{ color: 'rgba(246,196,83,0.55)' }}>{s.unit && ` ${s.unit}`}</span>
                </div>
                <div className="text-[10px] sm:text-2xs font-bold uppercase mt-1" style={{ color: DIM, letterSpacing: '0.14em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live ticker marquee */}
        <div className="relative w-full overflow-hidden" style={{ background: '#14121a', borderTop: '1px solid rgba(166,150,120,0.08)', padding: '10px 0' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'lp-marquee 38s linear infinite' }}>
            {[...TICKER, ...TICKER].map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-6" style={{ whiteSpace: 'nowrap' }}>
                <span className="font-mono text-xs font-bold" style={{ color: IVORY }}>{t.sym}</span>
                <span className="font-mono text-xs" style={{ color: BODY }}>{t.price}</span>
                <span className="font-mono text-xs font-bold" style={{ color: t.up ? '#18c98a' : '#ff5a72' }}>{t.chg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ THE ENGINE — cool blue: the machine ════════ */}
      <section id="engine" className="relative py-20 sm:py-28" style={{ background: 'linear-gradient(180deg, #14121a 0%, #181521 55%, #14121a 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <SectionTag>The engine</SectionTag>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-12">
            <h2 className="font-extrabold" style={{ color: IVORY, fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.12, maxWidth: 620 }}>
              One engine.
              <br />Two power units.
            </h2>
            <p className="text-sm sm:text-[15px] leading-relaxed" style={{ color: BODY, maxWidth: 400 }}>
              Every great car is defined by its engine. Ours has two power units
              working as one — the relentless one, and the one with your hands
              on the wheel.
            </p>
          </div>

          {/* Power units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* PU-01 TradePilot */}
            <div className="lp-card relative rounded-2xl p-7 overflow-hidden"
              style={{ background: '#1e1a28', border: '1px solid rgba(79,140,255,0.22)' }}>
              <div className="absolute top-0 right-0 pointer-events-none" style={{ width: 220, height: 220, background: 'radial-gradient(closest-side, rgba(79,140,255,0.12), transparent)' }} />
              <div className="font-mono text-[10.5px] font-bold mb-5" style={{ color: BLUE2, letterSpacing: '0.2em' }}>POWER UNIT — 01</div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(79,140,255,0.14)', border: '1px solid rgba(79,140,255,0.35)', color: BLUE2 }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5M8 5h8M9 13h.01M15 13h.01M9.5 16.5h5"/></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg" style={{ color: IVORY }}>TradePilot</h3>
                  <div className="text-xs font-semibold" style={{ color: BLUE2 }}>The relentless one</div>
                </div>
              </div>
              <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BODY }}>
                Automation that never blinks, never tires, never revenge-trades.
                Four race-tested strategies read confluence and breaking news the
                way engineers read telemetry — and refuse entries that fight the
                data. It runs your plan at machine precision, all night, every session.
              </p>
              <ul className="flex flex-col gap-2">
                {['Demands confluence before every entry', 'News-aware: vetoes trades that fight confident reads', 'Hard stops, daily loss caps — team orders, always obeyed'].map(t => (
                  <li key={t} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: BODY }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: BLUE, flexShrink: 0 }} />{t}
                  </li>
                ))}
              </ul>
            </div>

            {/* PU-02 Manual */}
            <div className="lp-card relative rounded-2xl p-7 overflow-hidden"
              style={{ background: '#1e1a28', border: '1px solid rgba(246,196,83,0.2)' }}>
              <div className="absolute top-0 right-0 pointer-events-none" style={{ width: 220, height: 220, background: 'radial-gradient(closest-side, rgba(246,196,83,0.1), transparent)' }} />
              <div className="font-mono text-[10.5px] font-bold mb-5" style={{ color: GOLD, letterSpacing: '0.2em' }}>POWER UNIT — 02</div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(246,196,83,0.12)', border: '1px solid rgba(246,196,83,0.35)', color: GOLD }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/><path d="M12 3v4M3.5 14.5L7.2 13M20.5 14.5L16.8 13"/><circle cx="12" cy="14" r="2.4"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg" style={{ color: IVORY }}>Manual</h3>
                  <div className="text-xs font-semibold" style={{ color: GOLD }}>Your hands on the wheel</div>
                </div>
              </div>
              <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: BODY }}>
                A full trading cockpit with millisecond fills — charts, depth, one-tap
                tickets, SL/TP on every order. When you see the gap the machines can't,
                nothing gets between your instinct and the market.
              </p>
              <ul className="flex flex-col gap-2">
                {['Millisecond market execution, no requotes', '250+ instruments across five asset classes', 'Price alerts, scanner and news at your fingertips'].map(t => (
                  <li key={t} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: BODY }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: GOLD, flexShrink: 0 }} />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Supporting systems */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPORT_SYSTEMS.map(s => (
              <div key={s.title} className="lp-card rounded-2xl p-6 flex gap-4 items-start"
                style={{ background: '#1b1824', border: '1px solid rgba(174,166,186,0.12)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(174,166,186,0.09)', border: '1px solid rgba(174,166,186,0.18)', color: BODY }}>
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[15px] mb-1" style={{ color: IVORY }}>{s.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: BODY }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ THE DRIVER — warm gold: the human ════════ */}
      <section id="driver" className="relative py-24 sm:py-32 overflow-hidden">
        {/* warm ambient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(60% 70% at 50% 50%, rgba(242,184,75,0.09) 0%, rgba(242,184,75,0.03) 45%, transparent 75%)',
        }} />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center">
          <SectionTag warm>The driver</SectionTag>
          <h2 className="font-extrabold mb-7" style={{ color: IVORY, fontSize: 'clamp(2rem, 5.5vw, 3.4rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            The missing piece
            <br />isn't in the garage.
          </h2>
          <p className="text-[15px] sm:text-lg leading-relaxed mx-auto mb-5" style={{ color: BODY, maxWidth: 560 }}>
            We can engineer the pace. We can engineer the guards, the telemetry,
            the discipline. What we can't engineer is the nerve to take the corner —
            the feel for the moment the market opens a door.
          </p>
          <p className="text-[15px] sm:text-lg leading-relaxed mx-auto mb-11" style={{ color: IVORY, maxWidth: 560, fontWeight: 600 }}>
            The car wins races. <Gold>The driver wins titles.</Gold>
            <br />The seat is open.
          </p>
          <GoldCTA onClick={goToRegister} big>Take the seat</GoldCTA>
          <div className="mt-5 text-xs" style={{ color: DIM }}>Free forever on demo · $100,000 practice balance · no card required</div>
        </div>
      </section>

      {/* ════════ MARKETS ════════ */}
      <section id="markets" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
        <SectionTag>The circuits</SectionTag>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <h2 className="font-extrabold" style={{ color: IVORY, fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Every track. One car.
          </h2>
          <p className="text-sm sm:text-[15px]" style={{ color: BODY, maxWidth: 360 }}>
            Crypto, forex, stocks, indices and commodities — 250+ instruments on the same engine.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MARKETS.map(m => (
            <button key={m.sym} onClick={goToApp} className="lp-card rounded-xl p-4 text-left"
              style={{ background: '#1b1824', border: '1px solid rgba(174,166,186,0.12)', cursor: 'pointer' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AssetIcon symbol={m.sym} assetClass={m.cls} size={26} />
                  <span className="font-mono text-sm font-extrabold" style={{ color: IVORY }}>{m.sym}</span>
                </div>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full hidden sm:inline"
                  style={{ color: DIM, background: 'rgba(174,166,186,0.09)', letterSpacing: '0.08em' }}>{m.cat}</span>
              </div>
              <div className="text-[12px] mb-2" style={{ color: DIM }}>{m.name}</div>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="font-mono text-[15px] font-bold" style={{ color: IVORY }}>{m.price}</span>
                <span className="font-mono text-xs font-bold" style={{ color: m.up ? '#18c98a' : '#ff5a72' }}>{m.chg}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════ START — race start ════════ */}
      <section id="start" className="relative py-20 sm:py-28" style={{ background: 'linear-gradient(180deg, #14121a 0%, #191623 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <SectionTag warm>Race start</SectionTag>
          <h2 className="font-extrabold mb-12" style={{ color: IVORY, fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Three steps to lights out.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-card relative rounded-2xl p-6 overflow-hidden"
                style={{ background: '#1e1a28', border: '1px solid rgba(174,166,186,0.12)' }}>
                <div className="font-mono font-extrabold mb-4" style={{ fontSize: 44, lineHeight: 1, color: 'rgba(246,196,83,0.16)' }}>{s.n}</div>
                <h3 className="font-bold text-base mb-2" style={{ color: IVORY }}>{s.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: BODY }}>{s.body}</p>
                <div className="flex gap-1.5 mt-5">
                  {[0, 1, 2].map(j => (
                    <span key={j} style={{
                      width: 8, height: 8, borderRadius: 99,
                      background: j <= i ? GOLD : 'rgba(174,166,186,0.15)',
                      boxShadow: j <= i ? `0 0 8px ${GOLD}66` : 'none',
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Final CTA — five lights */}
          <div className="relative rounded-3xl overflow-hidden px-6 sm:px-12 py-14 sm:py-18 text-center"
            style={{ background: 'linear-gradient(150deg, #241f2e 0%, #1b1726 45%, #191507 130%)', border: '1px solid rgba(246,196,83,0.26)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(65% 100% at 50% 110%, rgba(242,184,75,0.16) 0%, transparent 65%)' }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-2.5 mb-7">
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{
                    width: 13, height: 13, borderRadius: 99, background: GOLD_G,
                    boxShadow: `0 0 14px rgba(242,184,75,0.6)`,
                    animation: `lp-pulse 2.4s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
              <h2 className="font-extrabold mb-4" style={{ color: IVORY, fontSize: 'clamp(1.9rem, 5vw, 3.1rem)', letterSpacing: '-0.03em', lineHeight: 1.08 }}>
                The engine is running.
                <br /><Gold>It's waiting for you.</Gold>
              </h2>
              <p className="text-[15px] mx-auto mb-10" style={{ color: BODY, maxWidth: 430 }}>
                Sixty seconds to your seat fitting. A $100,000 practice balance is on the grid, warmed up and ready.
              </p>
              <GoldCTA onClick={goToRegister} big>Take the seat</GoldCTA>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer style={{ borderTop: '1px solid rgba(166,150,120,0.12)', background: '#121017' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <BrandMark size={30} />
                <Wordmark size="text-base" />
              </div>
              <p className="text-[13px] font-semibold mb-3" style={{ color: GOLD }}>Engineered to win. Driven by you.</p>
              <p className="text-xs leading-relaxed" style={{ color: DIM }}>
                FCA, CySEC &amp; Curaçao regulated. Real-execution CFD trading
                on crypto, forex, stocks, indices and commodities.
              </p>
            </div>
            {/* Columns */}
            {[
              { h: 'Platform', links: [['WebTrader', goToApp], ['TradePilot bots', goToApp], ['Markets', () => scrollTo('markets')], ['Analytics', goToApp]] as [string, () => void][] },
              { h: 'Resources', links: [['Economic calendar', goToApp], ['Forex calculators', goToApp], ['Leaderboard', goToApp], ['Blog & news', goToApp]] as [string, () => void][] },
            ].map(col => (
              <div key={col.h}>
                <h4 className="text-xs font-bold uppercase mb-4" style={{ color: IVORY, letterSpacing: '0.12em' }}>{col.h}</h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(([label, fn]) => (
                    <li key={label}>
                      <button onClick={fn} className="text-[13px] transition-colors"
                        style={{ color: BODY, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = IVORY)}
                        onMouseLeave={e => (e.currentTarget.style.color = BODY)}>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="text-xs font-bold uppercase mb-4" style={{ color: IVORY, letterSpacing: '0.12em' }}>Legal</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  ['Privacy policy', '/privacy-policy.html'],
                  ['Terms of service', '/terms-of-service.html'],
                  ['Risk disclosure', '/risk-disclosure.html'],
                  ['Cookie policy', '/cookie-policy.html'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] transition-colors"
                      style={{ color: BODY, textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = IVORY)}
                      onMouseLeave={e => (e.currentTarget.style.color = BODY)}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Risk + copyright */}
          <div style={{ borderTop: '1px solid rgba(166,150,120,0.1)', paddingTop: 24 }}>
            <p className="text-[11px] leading-relaxed mb-4" style={{ color: DIM }}>
              <strong style={{ color: BODY }}>Risk warning:</strong>{' '}
              Trading derivatives carries a high risk of losing capital and is not suitable for all investors.
              You should only trade with money you can afford to lose and ensure you fully understand the risks involved.
              Past performance is not a reliable indicator of future results.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[11px]" style={{ color: DIM }}>© {new Date().getFullYear()} TradeX Pro. All rights reserved.</p>
              <p className="text-[11px] font-mono" style={{ color: 'rgba(246,196,83,0.55)' }}>The X is the apex.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
