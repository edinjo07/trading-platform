import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { BrandMark } from '../components/ui/BrandMark'

/* ════════════════════════════════════════════════════════════════════════════
   TradeX — Homepage
   Identity: the F1 ethos. Fast. Built by the best engineers. Aimed at winning.
   Motto: "Engineered to win."  The X is the apex.
   ════════════════════════════════════════════════════════════════════════════ */

const BLUE  = '#4f8cff'
const GOLD  = '#f6c453'
const INK   = '#e9eef8'
const MUTE  = '#98a4bb'
const DIM   = '#5f6d85'

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
  { val: '0.0',    unit: 'pips',  label: 'Raw spreads'    },
  { val: '<40',    unit: 'ms',    label: 'Execution'      },
  { val: '1:1000', unit: '',      label: 'Max leverage'   },
  { val: '250+',   unit: '',      label: 'Instruments'    },
  { val: '24/7',   unit: '',      label: 'Support'        },
]

const PILLARS = [
  {
    title: 'The engine',
    sub: 'Millisecond execution',
    body: 'Orders fill in milliseconds on live market data. No requotes, no lag — pure pace, every session.',
    color: BLUE,
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    title: 'The pit wall',
    sub: 'TradePilot automation',
    body: 'Strategy bots read confluence and breaking news the way race engineers read telemetry — and refuse to gamble.',
    color: '#8b5cf6',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5M8 5h8M9 13h.01M15 13h.01M9.5 16.5h5"/>
      </svg>
    ),
  },
  {
    title: 'The safety cell',
    sub: 'Risk engineering',
    body: 'Stop-loss, take-profit, margin protection and daily loss limits — built into the chassis. Fast is nothing without control.',
    color: '#18c98a',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: 'The telemetry',
    sub: 'Live analytics',
    body: 'Live equity, drawdown, win-rate, attribution by bot and strategy. Every lap is measured. Every trade is accounted for.',
    color: GOLD,
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: 'Take your seat',        body: 'Create your account in sixty seconds. No card, no commitment — just a cockpit.' },
  { n: '02', title: 'Practice at full speed', body: 'A $100,000 demo balance on live prices. Same engine, same telemetry, zero risk.' },
  { n: '03', title: 'Lights out',             body: 'Go live when your numbers say you are ready. The platform is already at temperature.' },
]

const MARKETS = [
  { sym: 'BTCUSD', name: 'Bitcoin',      price: '67,420.50', chg: '+2.41%', up: true,  cat: 'Crypto'      },
  { sym: 'ETHUSD', name: 'Ethereum',     price: '3,512.80',  chg: '+1.83%', up: true,  cat: 'Crypto'      },
  { sym: 'EURUSD', name: 'Euro / USD',   price: '1.08420',   chg: '+0.12%', up: true,  cat: 'Forex'       },
  { sym: 'XAUUSD', name: 'Gold Spot',    price: '2,334.10',  chg: '+0.34%', up: true,  cat: 'Commodities' },
  { sym: 'NVDA',   name: 'NVIDIA',       price: '875.40',    chg: '+3.14%', up: true,  cat: 'Stocks'      },
  { sym: 'AAPL',   name: 'Apple',        price: '189.24',    chg: '-0.61%', up: false, cat: 'Stocks'      },
  { sym: 'US500',  name: 'US 500',       price: '5,320.4',   chg: '-0.22%', up: false, cat: 'Indices'     },
  { sym: 'WTI',    name: 'Crude Oil',    price: '78.42',     chg: '+1.05%', up: true,  cat: 'Commodities' },
]

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Wordmark({ size = 'text-lg' }: { size?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${size}`}>
      <span style={{ color: INK }}>Trade</span>
      <span style={{ color: BLUE }}>X</span>
      <span style={{ color: DIM }}> Pro</span>
    </span>
  )
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span style={{ width: 22, height: 2, background: GOLD, display: 'inline-block', borderRadius: 2 }} />
      <span className="text-xs font-bold uppercase" style={{ color: GOLD, letterSpacing: '0.16em' }}>{children}</span>
    </div>
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
    { label: 'Platform',   id: 'platform'  },
    { label: 'TradePilot', id: 'tradepilot' },
    { label: 'Markets',    id: 'markets'   },
    { label: 'Get started', id: 'start'    },
  ]

  return (
    <div className="theme-dark-scope min-h-screen" style={{ background: '#0b0f1a', color: MUTE, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Local keyframes */}
      <style>{`
        @keyframes lp-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes lp-pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes lp-sweep   { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }
        .lp-card { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .lp-card:hover { transform: translateY(-3px); border-color: rgba(122,167,255,0.35) !important; box-shadow: 0 18px 48px rgba(3,7,18,0.5); }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ════════ NAV ════════ */}
      <header className="fixed top-0 inset-x-0 z-50 transition-all"
        style={{
          background: scrolled || menuOpen ? 'rgba(11,15,26,0.92)' : 'transparent',
          backdropFilter: scrolled || menuOpen ? 'blur(14px)' : 'none',
          borderBottom: scrolled || menuOpen ? '1px solid rgba(148,163,184,0.1)' : '1px solid transparent',
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
                style={{ color: MUTE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = INK)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTE)}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button onClick={goToLogin} className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{ color: INK, background: 'rgba(233,238,248,0.06)', border: '1px solid rgba(148,163,184,0.16)', cursor: 'pointer' }}>
              Sign in
            </button>
            <button onClick={goToRegister} className="text-sm font-bold px-4 py-2 rounded-lg"
              style={{ color: '#fff', background: BLUE, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(79,140,255,0.3)' }}>
              Start free
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg"
            onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
            style={{ background: 'rgba(233,238,248,0.06)', border: '1px solid rgba(148,163,184,0.16)', color: INK, cursor: 'pointer' }}>
            {menuOpen
              ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-5 pb-5 pt-1 flex flex-col gap-1"
            style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="text-left text-[15px] font-medium py-3 px-2 rounded-lg"
                style={{ color: INK, background: 'none', border: 'none', cursor: 'pointer' }}>
                {l.label}
              </button>
            ))}
            <div className="flex gap-3 mt-3">
              <button onClick={goToLogin} className="flex-1 text-sm font-semibold py-3 rounded-xl"
                style={{ color: INK, background: 'rgba(233,238,248,0.06)', border: '1px solid rgba(148,163,184,0.16)', cursor: 'pointer' }}>
                Sign in
              </button>
              <button onClick={goToRegister} className="flex-1 text-sm font-bold py-3 rounded-xl"
                style={{ color: '#fff', background: BLUE, border: 'none', cursor: 'pointer' }}>
                Start free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ════════ HERO — the car ════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
        {/* F1 background */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 32%',
        }} />
        {/* Cinematic treatment: darken edges, keep the car readable, fade to page */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(to bottom, rgba(11,15,26,0.78) 0%, rgba(11,15,26,0.45) 42%, rgba(11,15,26,0.72) 72%, #0b0f1a 100%),
            radial-gradient(90% 60% at 50% 45%, transparent 0%, rgba(11,15,26,0.5) 100%)
          `,
        }} />
        {/* Gold speed streak across the track line */}
        <div className="absolute pointer-events-none" style={{ left: 0, right: 0, top: '58%', height: 1.5, overflow: 'hidden', opacity: 0.8 }}>
          <div style={{ width: '30%', height: '100%', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: 'lp-sweep 4.5s cubic-bezier(0.6,0,0.3,1) infinite' }} />
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-6xl mx-auto px-5 sm:px-6 w-full" style={{ paddingTop: 96, paddingBottom: 32 }}>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold self-start mb-6"
            style={{ background: 'rgba(11,15,26,0.6)', border: '1px solid rgba(246,196,83,0.35)', color: GOLD, letterSpacing: '0.1em', backdropFilter: 'blur(8px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#18c98a', animation: 'lp-pulse 1.8s ease-in-out infinite' }} />
            LIVE EXECUTION · FCA · CYSEC · CURAÇAO REGULATED
          </div>

          {/* Headline */}
          <h1 className="font-extrabold text-white" style={{
            fontSize: 'clamp(2.6rem, 8vw, 5.4rem)', lineHeight: 1.02, letterSpacing: '-0.03em',
            textShadow: '0 4px 40px rgba(0,0,0,0.85)', maxWidth: 780,
          }}>
            Engineered
            <br />
            to <span style={{ color: GOLD }}>win.</span>
          </h1>

          {/* Sub */}
          <p className="mt-6 text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(233,238,248,0.88)', maxWidth: 560, textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
            A trading platform built like a race car — millisecond execution,
            precision risk engineering, and TradePilot automation tuned for one
            thing: performance.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-9">
            <button onClick={goToRegister}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-[15px] font-bold"
              style={{ background: BLUE, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(79,140,255,0.4)' }}>
              Start trading free
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button onClick={() => scrollTo('platform')}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-[15px] font-semibold"
              style={{ background: 'rgba(11,15,26,0.55)', color: INK, border: '1px solid rgba(148,163,184,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              Inside the machine
            </button>
          </div>
        </div>

        {/* Telemetry strip — the pit wall */}
        <div className="relative w-full" style={{ background: 'rgba(8,11,19,0.72)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(246,196,83,0.22)' }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {TELEMETRY.map((s, i) => (
              <div key={s.label} className="py-4 sm:py-5 px-2 sm:px-4 flex flex-col items-center text-center"
                style={{ borderLeft: i > 0 ? '1px solid rgba(148,163,184,0.09)' : 'none' }}>
                <div className="font-mono font-extrabold text-xl sm:text-2xl" style={{ color: GOLD, letterSpacing: '-0.02em' }}>
                  {s.val}<span className="text-xs sm:text-sm font-bold" style={{ color: 'rgba(246,196,83,0.6)' }}>{s.unit && ` ${s.unit}`}</span>
                </div>
                <div className="text-[10px] sm:text-2xs font-bold uppercase mt-1" style={{ color: DIM, letterSpacing: '0.14em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live ticker marquee */}
        <div className="relative w-full overflow-hidden" style={{ background: '#0b0f1a', borderTop: '1px solid rgba(148,163,184,0.07)', padding: '10px 0' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'lp-marquee 38s linear infinite' }}>
            {[...TICKER, ...TICKER].map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 px-6" style={{ whiteSpace: 'nowrap' }}>
                <span className="font-mono text-xs font-bold" style={{ color: INK }}>{t.sym}</span>
                <span className="font-mono text-xs" style={{ color: MUTE }}>{t.price}</span>
                <span className="font-mono text-xs font-bold" style={{ color: t.up ? '#18c98a' : '#ff5a72' }}>{t.chg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PLATFORM — built like a race car ════════ */}
      <section id="platform" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
        <SectionTag>The machine</SectionTag>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-12">
          <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1, maxWidth: 560 }}>
            Built like a race car.
            <br /><span style={{ color: DIM }}>Every part exists to perform.</span>
          </h2>
          <p className="text-sm sm:text-[15px] leading-relaxed" style={{ color: MUTE, maxWidth: 380 }}>
            An F1 car is fast because nothing on it is decoration. TradeX is
            engineered the same way — four systems, one purpose.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map(p => (
            <div key={p.title} className="lp-card rounded-2xl p-6"
              style={{ background: '#121826', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${p.color}18`, border: `1px solid ${p.color}30`, color: p.color }}>
                {p.icon}
              </div>
              <div className="text-[11px] font-bold uppercase mb-1" style={{ color: p.color, letterSpacing: '0.12em' }}>{p.title}</div>
              <h3 className="text-white font-bold text-base mb-2">{p.sub}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: MUTE }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ TRADEPILOT — the pit wall ════════ */}
      <section id="tradepilot" className="relative py-20 sm:py-28" style={{ background: 'linear-gradient(180deg, #0b0f1a 0%, #0d1322 50%, #0b0f1a 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Copy */}
          <div>
            <SectionTag>TradePilot</SectionTag>
            <h2 className="font-extrabold text-white mb-5" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Your pit wall.
            </h2>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: MUTE, maxWidth: 460 }}>
              A driver wins with a team of engineers on the radio. TradePilot is
              yours: automated strategies that analyse every tick, demand
              confluence before entering, and veto trades that fight the news.
            </p>
            <ul className="flex flex-col gap-4 mb-9">
              {[
                ['Four race-tested strategies', 'MA Cross, RSI, MACD and Momentum — each with trend and volatility filters.'],
                ['News-aware discipline', 'Confident, opposing news reads veto the entry. Aligned reads accelerate it.'],
                ['Hard risk limits', 'ATR-based stops, daily loss caps and trade limits. The bot follows team orders.'],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-3.5">
                  <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(79,140,255,0.14)', border: '1px solid rgba(79,140,255,0.3)' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={BLUE} strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <div>
                    <div className="text-white text-sm font-bold">{t}</div>
                    <div className="text-[13px] mt-0.5 leading-relaxed" style={{ color: MUTE }}>{b}</div>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={goToRegister} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(79,140,255,0.14)', color: '#7aa7ff', border: '1px solid rgba(79,140,255,0.35)', cursor: 'pointer' }}>
              Deploy your first bot
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Bot telemetry card */}
          <div className="relative">
            <div className="absolute -inset-8 pointer-events-none" style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(79,140,255,0.1) 0%, transparent 70%)' }} />
            <div className="relative rounded-2xl overflow-hidden" style={{ background: '#121826', border: '1px solid rgba(148,163,184,0.14)', boxShadow: '0 32px 80px rgba(3,7,18,0.6)' }}>
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5M8 5h8M9 13h.01M15 13h.01M9.5 16.5h5"/></svg>
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">Apex One</div>
                    <div className="text-[11px] font-mono" style={{ color: DIM }}>XAUUSD · RSI + news filter</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(24,201,138,0.14)', color: '#18c98a', border: '1px solid rgba(24,201,138,0.3)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: '#18c98a', animation: 'lp-pulse 1.6s ease-in-out infinite' }} />
                  RUNNING
                </span>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                {[
                  ['P&L', '+$1,284.60', '#18c98a'],
                  ['Win rate', '64%', INK],
                  ['Trades', '38', INK],
                ].map(([l, v, c], i) => (
                  <div key={l} className="px-5 py-4" style={{ borderLeft: i > 0 ? '1px solid rgba(148,163,184,0.08)' : 'none' }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: DIM, letterSpacing: '0.1em' }}>{l}</div>
                    <div className="font-mono font-extrabold text-lg" style={{ color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Radio log */}
              <div className="px-5 py-4 flex flex-col gap-2.5 font-mono text-[11.5px]">
                <div style={{ color: DIM }}><span style={{ color: '#8b5cf6' }}>14:02:11</span>  Analysing XAUUSD · RSI 31.4 · trend up · news neutral</div>
                <div style={{ color: DIM }}><span style={{ color: '#8b5cf6' }}>14:03:26</span>  <span style={{ color: GOLD }}>SIGNAL</span> BUY — oversold + MACD turning</div>
                <div style={{ color: DIM }}><span style={{ color: '#8b5cf6' }}>14:03:31</span>  <span style={{ color: '#18c98a' }}>OPENED</span> LONG 0.5 @ 2,331.20 · SL 2,318 · TP 2,356</div>
                <div style={{ color: DIM }}><span style={{ color: '#8b5cf6' }}>15:47:03</span>  <span style={{ color: '#18c98a' }}>CLOSED</span> +$1,240.00 · TP hit — box, box.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ MARKETS ════════ */}
      <section id="markets" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
        <SectionTag>The circuits</SectionTag>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Every track. One car.
          </h2>
          <p className="text-sm sm:text-[15px]" style={{ color: MUTE, maxWidth: 360 }}>
            Crypto, forex, stocks, indices and commodities — 250+ instruments on the same engine.
          </p>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MARKETS.map(m => (
            <button key={m.sym} onClick={goToApp} className="lp-card rounded-xl p-4 text-left"
              style={{ background: '#121826', border: '1px solid rgba(148,163,184,0.12)', cursor: 'pointer' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-extrabold" style={{ color: INK }}>{m.sym}</span>
                <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ color: DIM, background: 'rgba(148,163,184,0.09)', letterSpacing: '0.08em' }}>{m.cat}</span>
              </div>
              <div className="text-[12px] mb-2" style={{ color: DIM }}>{m.name}</div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[15px] font-bold" style={{ color: INK }}>{m.price}</span>
                <span className="font-mono text-xs font-bold" style={{ color: m.up ? '#18c98a' : '#ff5a72' }}>{m.chg}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════ START — lights out ════════ */}
      <section id="start" className="relative py-20 sm:py-28" style={{ background: 'linear-gradient(180deg, #0b0f1a 0%, #0e1424 100%)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <SectionTag>Race start</SectionTag>
          <h2 className="font-extrabold text-white mb-12" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Three steps to lights out.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl p-6 overflow-hidden"
                style={{ background: '#121826', border: '1px solid rgba(148,163,184,0.12)' }}>
                <div className="font-mono font-extrabold mb-4" style={{ fontSize: 44, lineHeight: 1, color: 'rgba(246,196,83,0.16)' }}>{s.n}</div>
                <h3 className="text-white font-bold text-base mb-2">{s.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: MUTE }}>{s.body}</p>
                {/* start lights */}
                <div className="flex gap-1.5 mt-5">
                  {[0, 1, 2].map(j => (
                    <span key={j} style={{
                      width: 8, height: 8, borderRadius: 99,
                      background: j <= i ? GOLD : 'rgba(148,163,184,0.15)',
                      boxShadow: j <= i ? `0 0 8px ${GOLD}66` : 'none',
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="relative rounded-3xl overflow-hidden px-6 sm:px-12 py-12 sm:py-16 text-center"
            style={{ background: 'linear-gradient(135deg, #16203a 0%, #0d1322 100%)', border: '1px solid rgba(122,167,255,0.22)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 90% at 50% 0%, rgba(79,140,255,0.14) 0%, transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{
                    width: 12, height: 12, borderRadius: 99, background: GOLD,
                    boxShadow: `0 0 12px ${GOLD}88`,
                    animation: `lp-pulse 2.4s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
              <h2 className="font-extrabold text-white mb-3" style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', letterSpacing: '-0.03em' }}>
                It's lights out.
              </h2>
              <p className="text-[15px] mb-9" style={{ color: MUTE, maxWidth: 420, margin: '0 auto 36px' }}>
                Sixty seconds to your seat. A $100,000 practice balance is waiting on the grid.
              </p>
              <button onClick={goToRegister}
                className="inline-flex items-center gap-2 px-9 py-4 rounded-xl text-base font-bold"
                style={{ background: BLUE, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 10px 40px rgba(79,140,255,0.45)' }}>
                Start your engine
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer style={{ borderTop: '1px solid rgba(148,163,184,0.1)', background: '#0a0e18' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <BrandMark size={30} />
                <Wordmark size="text-base" />
              </div>
              <p className="text-[13px] font-semibold mb-3" style={{ color: GOLD }}>Engineered to win.</p>
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
                <h4 className="text-white text-xs font-bold uppercase mb-4" style={{ letterSpacing: '0.12em' }}>{col.h}</h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(([label, fn]) => (
                    <li key={label}>
                      <button onClick={fn} className="text-[13px] transition-colors"
                        style={{ color: MUTE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = INK)}
                        onMouseLeave={e => (e.currentTarget.style.color = MUTE)}>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="text-white text-xs font-bold uppercase mb-4" style={{ letterSpacing: '0.12em' }}>Legal</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  ['Privacy policy', '/privacy-policy.html'],
                  ['Terms of service', '/terms-of-service.html'],
                  ['Risk disclosure', '/risk-disclosure.html'],
                  ['Cookie policy', '/cookie-policy.html'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] transition-colors"
                      style={{ color: MUTE, textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = INK)}
                      onMouseLeave={e => (e.currentTarget.style.color = MUTE)}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Risk + copyright */}
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 24 }}>
            <p className="text-[11px] leading-relaxed mb-4" style={{ color: DIM }}>
              <strong style={{ color: MUTE }}>Risk warning:</strong>{' '}
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
