import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// ─── Static market data for display ──────────────────────────────────────────
const HERO_TICKERS = [
  { sym: 'BTCUSD',  price: '67,420.50', chg: '+2.41%', up: true },
  { sym: 'ETHUSD',  price: '3,512.80',  chg: '+1.83%', up: true },
  { sym: 'AAPL',    price: '189.24',    chg: '-0.61%', up: false },
  { sym: 'EURUSD',  price: '1.08420',   chg: '+0.12%', up: true },
  { sym: 'NVDA',    price: '875.40',    chg: '+3.14%', up: true },
  { sym: 'GBPUSD',  price: '1.26350',   chg: '-0.08%', up: false },
  { sym: 'SOLUSD',  price: '143.20',    chg: '+4.22%', up: true },
  { sym: 'TSLA',    price: '245.60',    chg: '+1.95%', up: true },
  { sym: 'XAUUSD',  price: '2,334.10',  chg: '+0.34%', up: true },
  { sym: 'USDJPY',  price: '149.820',   chg: '-0.21%', up: false },
]

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: 'Real-Time Execution',
    desc: 'Sub-millisecond order routing with institutional-grade matching engine and deep liquidity across all instruments.',
    accent: '#0ea5e9',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: 'Advanced Charting',
    desc: 'Professional candlestick charts with 50+ indicators, multi-timeframe analysis and real-time market depth.',
    accent: '#8b5cf6',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Risk Management',
    desc: 'Built-in take-profit, stop-loss, and trailing stops on every order. Control your risk with precision.',
    accent: '#00c878',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    title: 'Market Scanner',
    desc: 'Scan all markets simultaneously for opportunities. Filter by momentum, volatility, and price action.',
    accent: '#f59e0b',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    title: 'Portfolio Analytics',
    desc: 'Deep portfolio insights with P&L tracking, win-rate analysis, drawdown metrics and performance attribution.',
    accent: '#38bdf8',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
    title: 'Live Market Data',
    desc: 'Real-time feeds from Binance and Twelve Data covering crypto, equities, forex and commodities globally.',
    accent: '#ff3047',
  },
]

const MARKETS = [
  { sym: 'BTCUSD',   name: 'Bitcoin',           price: '67,420.50', chg: '+2.41', up: true,  cat: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { sym: 'ETHUSD',   name: 'Ethereum',          price: '3,512.80',  chg: '+1.83', up: true,  cat: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { sym: 'EURUSD',   name: 'Euro / US Dollar',  price: '1.08420',   chg: '+0.12', up: true,  cat: 'Forex',  logo: 'https://flagcdn.com/w40/eu.png' },
  { sym: 'GBPUSD',   name: 'Pound / US Dollar', price: '1.26350',   chg: '-0.08', up: false, cat: 'Forex',  logo: 'https://flagcdn.com/w40/gb.png' },
  { sym: 'AAPL',      name: 'Apple Inc.',        price: '189.24',    chg: '-0.61', up: false, cat: 'Stocks', logo: 'https://logo.clearbit.com/apple.com' },
  { sym: 'NVDA',      name: 'NVIDIA Corp.',      price: '875.40',    chg: '+3.14', up: true,  cat: 'Stocks', logo: 'https://logo.clearbit.com/nvidia.com' },
  { sym: 'XAUUSD',   name: 'Gold Spot',         price: '2,334.10',  chg: '+0.34', up: true,  cat: 'Commod', logo: 'https://assets.coingecko.com/coins/images/14/small/xrp-symbol-white-128.png' },
  { sym: 'SOLUSD',   name: 'Solana',            price: '143.20',    chg: '+4.22', up: true,  cat: 'Crypto', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
]

const STEPS = [
  {
    n: '01', title: 'Create Free Account',
    desc: 'Sign up in under 30 seconds. No credit card required. Start with $100,000 virtual funds immediately.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    n: '02', title: 'Explore Markets',
    desc: 'Browse 20+ instruments across crypto, forex, stocks and commodities with live streaming prices.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    n: '03', title: 'Place Your First Trade',
    desc: 'Use market or limit orders with built-in risk controls. Watch your P&L update in real time.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    n: '04', title: 'Analyse & Improve',
    desc: 'Track every trade in your journal, measure your win rate, and optimise your strategy over time.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
]

const TESTIMONIALS = [
  {
    text: "TradeX Pro has completely transformed how I approach the markets. The execution speed and depth of analytics are on par with professional desks.",
    name: 'Marcus T.', role: 'Proprietary Trader', avatar: 'M',
  },
  {
    text: "The charting tools and real-time data are exceptional. I practice new strategies risk-free and transition my winners to live accounts with confidence.",
    name: 'Sophia R.', role: 'Forex Analyst', avatar: 'S',
  },
  {
    text: "As a quant, I need reliable data and fast execution. TradeX delivers both. The API feed quality and scanner are best in class.",
    name: 'Kevin L.', role: 'Quantitative Researcher', avatar: 'K',
  },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(6,9,15,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={18} height={18}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            TradeX<span className="text-brand-400"> Pro</span>
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-7">
          {['Markets', 'Features', 'How it Works', 'Pricing'].map(link => (
            <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`}
               className="text-sm text-text-secondary hover:text-white transition-colors cursor-pointer">
              {link}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm px-5 py-2">
              Open Platform
            </button>
          ) : (
            <>
              <button onClick={onLogin}
                className="text-sm font-medium text-text-secondary hover:text-white transition-colors px-4 py-2">
                Sign In
              </button>
              <button onClick={onLogin}
                className="btn-primary text-sm px-5 py-2">
                Start Free
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Ticker Tape ──────────────────────────────────────────────────────────────
function TickerTape() {
  const doubled = [...HERO_TICKERS, ...HERO_TICKERS]
  return (
    <div className="overflow-hidden py-2.5" style={{ background: 'rgba(14,165,233,0.05)', borderTop: '1px solid rgba(14,165,233,0.1)', borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
      <div className="flex gap-8 animate-marquee whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
        {doubled.map((t, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-text-secondary font-mono">{t.sym}</span>
            <span className="text-xs font-mono font-semibold text-white">{t.price}</span>
            <span className={`text-2xs font-bold font-mono ${t.up ? 'text-bull' : 'text-bear'}`}>{t.chg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const goToLogin = () => navigate('/login')
  const goToApp   = () => navigate(user ? '/dashboard' : '/login')

  return (
    <div className="min-h-screen" style={{ background: '#06090f', color: '#d4dde8' }}>
      <Navbar onLogin={goToLogin} />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-0 overflow-hidden">
        {/* F1 hero background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Dark overlay — keeps text readable, fades bottom into page bg */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(6,9,15,0.80) 0%, rgba(6,9,15,0.75) 40%, rgba(6,9,15,0.90) 75%, #06090f 100%)',
          }}
        />
        {/* Subtle blue accent glow on top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.10) 0%, transparent 65%)' }} />

        {/* ── Floating gold bars ─────────────────────────────────────────── */}
        {/* Left bar */}
        <div className="absolute left-6 pointer-events-none" style={{ top: '22%', width: 10, height: 200, borderRadius: 99, background: 'linear-gradient(180deg, rgba(251,191,36,0) 0%, rgba(245,158,11,0.9) 40%, rgba(251,191,36,1) 65%, rgba(245,158,11,0.5) 100%)', boxShadow: '0 0 24px rgba(251,191,36,0.5), 0 0 60px rgba(245,158,11,0.25)', animation: 'floatBar 5s ease-in-out infinite' }} />
        <div className="absolute left-10 pointer-events-none" style={{ top: '40%', width: 5, height: 120, borderRadius: 99, background: 'linear-gradient(180deg, rgba(251,191,36,0) 0%, rgba(251,191,36,0.6) 50%, rgba(251,191,36,0) 100%)', animation: 'floatBarAlt 6s ease-in-out infinite 0.8s' }} />
        {/* Right bar */}
        <div className="absolute right-6 pointer-events-none" style={{ top: '28%', width: 10, height: 200, borderRadius: 99, background: 'linear-gradient(180deg, rgba(251,191,36,0.5) 0%, rgba(251,191,36,1) 35%, rgba(245,158,11,0.9) 60%, rgba(251,191,36,0) 100%)', boxShadow: '0 0 24px rgba(251,191,36,0.5), 0 0 60px rgba(245,158,11,0.25)', animation: 'floatBarAlt 5s ease-in-out infinite 1.5s' }} />
        <div className="absolute right-10 pointer-events-none" style={{ top: '18%', width: 5, height: 120, borderRadius: 99, background: 'linear-gradient(180deg, rgba(251,191,36,0) 0%, rgba(251,191,36,0.6) 50%, rgba(251,191,36,0) 100%)', animation: 'floatBar 6s ease-in-out infinite 2s' }} />

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
               style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse inline-block" />
            Live market data · 20+ instruments · Paper trading
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '-0.02em', textShadow: '0 2px 24px rgba(0,0,0,0.8)' }}>
            Trade Like the{' '}
            <span className="gradient-text">Top 1%</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.90)', textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}>
            Institutional-grade platform with real-time execution, advanced analytics, and live market feeds.
            Master the markets risk-free with $100,000 in virtual funds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button onClick={goToApp} className="btn-primary text-base px-8 py-3.5 rounded-xl">
              Start Trading Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-secondary text-base px-8 py-3.5 rounded-xl">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" style={{ fill: 'currentColor', stroke: 'none' }} />
              </svg>
              See Features
            </button>
          </div>

          {/* IC Markets–style stats strip */}
          <div className="w-full mb-0" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
            <div className="flex flex-wrap items-stretch justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(251,191,36,0.18)', borderBottom: '1px solid rgba(251,191,36,0.18)' }}>
              {[
                { val: '0.0',     label: 'COMMISSION FEES' },
                { val: '$100K',   label: 'VIRTUAL FUNDS' },
                { val: '20+',     label: 'INSTRUMENTS' },
                { val: '<1ms',    label: 'EXECUTION SPEED' },
                { val: '24/7',    label: 'LIVE MARKET DATA' },
              ].map((s, i) => (
                <div key={s.val} className="flex items-center gap-4 px-8 py-4"
                     style={{ borderRight: i < 4 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div>
                    <div className="text-xl font-black font-mono" style={{ color: '#fbbf24', letterSpacing: '-0.02em' }}>{s.val}</div>
                    <div className="text-2xs font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Platform preview mockup ──────────────────────────────────────── */}
        <div className="relative max-w-6xl mx-auto px-6">
          {/* Glow behind screenshot */}
          <div className="absolute inset-x-0 -top-10 h-40 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(14,165,233,0.18) 0%, transparent 80%)' }} />

          {/* Browser chrome wrapper */}
          <div className="relative rounded-2xl overflow-hidden"
               style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.08), 0 0 80px rgba(14,165,233,0.08)' }}>

            {/* Browser top bar */}
            <div className="flex items-center gap-3 px-4 py-3"
                 style={{ background: '#0d1520', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono text-text-muted"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', minWidth: 220 }}>
                  <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  localhost:3000/dashboard/trade
                </div>
              </div>
            </div>

            {/* App shell */}
            <div className="flex" style={{ background: '#07101c', minHeight: 480 }}>

              {/* Sidebar */}
              <div className="w-[200px] shrink-0 flex flex-col py-4 gap-1"
                   style={{ background: '#060d18', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 mb-5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                       style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </div>
                  <span className="text-white font-bold text-sm">TradeX <span style={{ color: '#38bdf8' }}>Pro</span></span>
                </div>
                {[
                  { label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0 0h6m0 0h3a1 1 0 001-1V10', active: false },
                  { label: 'Trade',     icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',                                              active: true  },
                  { label: 'Scanner',   icon: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',                         active: false },
                  { label: 'Portfolio', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', active: false },
                  { label: 'Orders',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0V3h6v2m-6 0h6', active: false },
                ].map(item => (
                  <div key={item.label}
                    className="flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={item.active
                      ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', borderLeft: '2px solid #0ea5e9' }
                      : { color: '#6b8099' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path d={item.icon}/>
                    </svg>
                    {item.label}
                  </div>
                ))}

                {/* Watchlist */}
                <div className="mt-4 px-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#3a4a60' }}>Watchlist</p>
                  {[
                    { sym:'AAPL',    px:'186.51', chg:'-0.53%', up:false },
                    { sym:'NVDA',    px:'870.74', chg:'-0.51%', up:false },
                    { sym:'BTCUSD',  px:'67,420', chg:'+2.41%', up:true  },
                  ].map(w => (
                    <div key={w.sym} className="flex items-center justify-between py-1.5">
                      <div>
                        <p className="text-xs font-mono font-semibold text-white">{w.sym}</p>
                        <p className="text-xs font-mono" style={{ color: '#3a4a60', fontSize: 10 }}>STOCK</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-white">{w.px}</p>
                        <p className="text-xs font-mono font-semibold" style={{ color: w.up ? '#00c878' : '#ff3047', fontSize: 10 }}>{w.chg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#07101c' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-white font-semibold"
                         style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      AAPL
                      <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,200,120,0.1)', color: '#00c878' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-bull inline-block" style={{ animation: 'pulse 2s infinite' }}/>
                      LIVE
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                    Balance <span className="text-white font-semibold ml-1">$100,000.00</span>
                  </div>
                </div>

                {/* Trading area */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Chart placeholder */}
                  <div className="flex-1 relative" style={{ background: '#06090f', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Candlestick chart mockup */}
                    <div className="absolute top-3 left-4 flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-white">AAPL</span>
                      <span className="text-xs font-mono" style={{ color: '#ff3047' }}>186.51</span>
                      <span className="text-xs font-mono" style={{ color: '#ff3047' }}>-0.53%</span>
                    </div>
                    <div className="absolute top-3 right-4 flex gap-1">
                      {['1m','5m','15m','1h','4h','1d'].map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded font-mono"
                              style={{ color: t === '1h' ? '#38bdf8' : '#3a4a60', background: t === '1h' ? 'rgba(14,165,233,0.1)' : 'transparent' }}>{t}</span>
                      ))}
                    </div>
                    {/* SVG candles */}
                    <svg className="w-full h-full" viewBox="0 0 480 320" preserveAspectRatio="none">
                      {/* Grid lines */}
                      {[60,120,180,240].map(y => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>)}
                      {[80,160,240,320,400].map(x => <line key={x} x1={x} y1="0" x2={x} y2="320" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>)}
                      {/* Volume bars */}
                      {[
                        [20,280,30,8,'rgba(0,200,120,0.3)'],[55,260,30,22,'rgba(0,200,120,0.3)'],[90,270,30,14,'rgba(255,48,71,0.3)'],
                        [125,265,30,18,'rgba(0,200,120,0.3)'],[160,255,30,28,'rgba(255,48,71,0.3)'],[195,270,30,12,'rgba(0,200,120,0.3)'],
                        [230,262,30,20,'rgba(0,200,120,0.3)'],[265,258,30,25,'rgba(255,48,71,0.3)'],[300,265,30,17,'rgba(0,200,120,0.3)'],
                        [335,255,30,28,'rgba(255,48,71,0.3)'],[370,260,30,22,'rgba(0,200,120,0.3)'],[405,250,30,33,'rgba(0,200,120,0.3)'],
                        [440,258,30,24,'rgba(255,48,71,0.3)'],
                      ].map(([x,y,w,h,c],i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c as string} rx="1"/>)}
                      {/* Candles */}
                      {[
                        [25,80,104,14,'#00c878'],[60,70,96,20,'#00c878'],[95,90,108,10,'#ff3047'],
                        [130,72,102,22,'#00c878'],[165,90,124,28,'#ff3047'],[200,82,106,12,'#00c878'],
                        [235,75,99,18,'#00c878'],[270,88,115,20,'#ff3047'],[305,78,104,16,'#00c878'],
                        [340,95,128,28,'#ff3047'],[375,80,112,22,'#00c878'],[410,65,95,36,'#00c878'],
                        [445,76,108,20,'#ff3047'],
                      ].map(([x,y,c_h,body_h,col],i) => (
                        <g key={i}>
                          <line x1={Number(x)+15} y1={y} x2={Number(x)+15} y2={Number(y)+Number(c_h)} stroke={col as string} strokeWidth="1.5"/>
                          <rect x={x} y={Number(y)+(Number(c_h)-Number(body_h))/2} width="22" height={body_h} fill={col as string} rx="1"/>
                        </g>
                      ))}
                      {/* Price line */}
                      <polyline points="0,145 40,138 80,132 120,128 160,135 200,125 240,118 280,124 320,116 360,122 400,110 440,115 480,108"
                        fill="none" stroke="rgba(14,165,233,0.4)" strokeWidth="1" strokeDasharray="4,3"/>
                    </svg>
                  </div>

                  {/* Right panel: order book + order form */}
                  <div className="w-[270px] shrink-0 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['ORDER BOOK','TRADES'].map((t,i) => (
                        <div key={t} className="flex-1 py-2.5 text-center text-xs font-semibold"
                             style={{ color: i === 0 ? '#38bdf8' : '#3a4a60', borderBottom: i === 0 ? '2px solid #0ea5e9' : '2px solid transparent' }}>
                          {t}
                        </div>
                      ))}
                    </div>

                    {/* Order book */}
                    <div className="px-3 py-2 overflow-hidden" style={{ maxHeight: 180 }}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: '#3a4a60' }}>
                        <span>PRICE</span><span>SIZE</span><span>TOTAL</span>
                      </div>
                      {/* Asks */}
                      {[
                        ['187.20','1,234','1,234'],['187.10','2,891','4,125'],['187.00','5,432','9,557'],
                        ['186.90','3,210','12,767'],['186.80','1,876','14,643'],
                      ].map(([p,s,t],i) => (
                        <div key={i} className="relative flex justify-between text-xs py-0.5 font-mono">
                          <div className="absolute right-0 top-0 bottom-0 rounded-sm opacity-20"
                               style={{ width: `${20+i*12}%`, background: '#ff3047' }}/>
                          <span style={{ color: '#ff3047' }}>{p}</span>
                          <span style={{ color: '#8899aa' }}>{s}</span>
                          <span style={{ color: '#3a4a60' }}>{t}</span>
                        </div>
                      ))}
                      {/* Spread */}
                      <div className="flex items-center justify-center py-1">
                        <span className="text-xs font-mono font-bold px-3 py-0.5 rounded"
                              style={{ background: 'rgba(14,165,233,0.08)', color: '#38bdf8' }}>186.51 ▼ · Spread 0.69</span>
                      </div>
                      {/* Bids */}
                      {[
                        ['186.40','4,123','4,123'],['186.30','2,567','6,690'],['186.20','6,234','12,924'],
                        ['186.10','1,890','14,814'],['186.00','3,456','18,270'],
                      ].map(([p,s,t],i) => (
                        <div key={i} className="relative flex justify-between text-xs py-0.5 font-mono">
                          <div className="absolute right-0 top-0 bottom-0 rounded-sm opacity-20"
                               style={{ width: `${15+i*12}%`, background: '#00c878' }}/>
                          <span style={{ color: '#00c878' }}>{p}</span>
                          <span style={{ color: '#8899aa' }}>{s}</span>
                          <span style={{ color: '#3a4a60' }}>{t}</span>
                        </div>
                      ))}
                    </div>

                    {/* Order form */}
                    <div className="border-t p-3 flex flex-col gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#07101c' }}>
                      <p className="text-xs font-semibold text-text-primary">Place Order</p>
                      <p className="text-xs" style={{ color: '#3a4a60' }}>AAPL</p>
                      {/* Buy/Sell */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="py-1.5 rounded text-center text-xs font-bold" style={{ background: 'linear-gradient(135deg,#00c878,#00a060)', color: '#fff' }}>▲ BUY</div>
                        <div className="py-1.5 rounded text-center text-xs font-bold" style={{ background: 'rgba(255,48,71,0.08)', color: '#ff3047', border: '1px solid rgba(255,48,71,0.2)' }}>▼ SELL</div>
                      </div>
                      {/* Order type tabs */}
                      <div className="flex gap-0.5 text-xs">
                        {['Market','Limit','Stop'].map((t,i) => (
                          <div key={t} className="flex-1 text-center py-1 rounded font-medium"
                               style={{ background: i === 0 ? 'rgba(14,165,233,0.15)' : 'transparent', color: i === 0 ? '#38bdf8' : '#3a4a60' }}>{t}</div>
                        ))}
                      </div>
                      {/* Fields */}
                      <div className="rounded p-2 text-xs font-mono" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ color: '#3a4a60' }}>Last</span>
                        <span className="float-right" style={{ color: '#ff3047' }}>186.51 · -0.53%</span>
                      </div>
                      <div className="rounded p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ color: '#3a4a60' }}>Quantity</span>
                        <span className="float-right font-mono text-text-muted">0.000000</span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        {['25%','50%','75%','100%'].map(p => (
                          <div key={p} className="flex-1 text-center py-1 rounded font-mono font-semibold"
                               style={{ background: 'rgba(255,255,255,0.04)', color: '#6b8099' }}>{p}</div>
                        ))}
                      </div>
                      <div className="rounded py-2 text-center text-xs font-bold" style={{ background: 'linear-gradient(135deg,#00c878,#00a060)', color: '#fff' }}>▲ BUY AAPL</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="h-24 -mt-24 relative pointer-events-none"
               style={{ background: 'linear-gradient(to bottom, transparent, #06090f)' }} />
        </div>
      </section>

      {/* ── TICKER TAPE ────────────────────────────────────────────────────── */}
      <TickerTape />

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="landing-section" style={{ background: '#f0f5ff' }}>
        <div className="landing-container">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#0369a1' }}>Platform Features</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#0a1520' }}>Built for Serious Traders</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#4b6280' }}>
              Every tool you need — from precision order entry to deep performance analytics — built into one professional platform.
            </p>
          </div>

          {/* ── BIG FEATURE: Leaderboard + Risk Calculator (2-col) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Leaderboard */}
            <div className="feature-card-light group" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg,#f59e0b22,#d97706 11%)', border: '1px solid #f59e0b44' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.8}>
                    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                    <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0012 0V2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>Global Leaderboard</h3>
                  <p className="text-sm" style={{ color: '#0369a1' }}>Compete with traders worldwide</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Real-time global rankings across 12,400+ traders. Sorted by return %, Sharpe ratio, win rate and net P&L.
                Podium highlights the top 3. Monthly and all-time periods.
              </p>
              {/* Mini podium preview */}
              <div className="rounded-xl p-4 flex items-end justify-center gap-4" style={{ background: 'linear-gradient(135deg,#1e3a5f10,#0ea5e910)', border: '1px solid #0ea5e918' }}>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#94a3b8' }}>C</div>
                  <div className="rounded-t text-center px-3 py-1.5" style={{ background: '#94a3b8', minHeight: 36 }}>
                    <span className="text-white text-xs font-bold">+18.4%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">🥇</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#f59e0b' }}>A</div>
                  <div className="rounded-t text-center px-3 py-2" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', minHeight: 52 }}>
                    <span className="text-white text-xs font-bold">+34.2%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#cd7f32' }}>B</div>
                  <div className="rounded-t text-center px-3 py-1" style={{ background: '#cd7f32', minHeight: 28 }}>
                    <span className="text-white text-xs font-bold">+22.1%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Calculator */}
            <div className="feature-card-light group" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#00c87818', border: '1px solid #00c87828' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#00c878" strokeWidth={1.8}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>Risk Calculator</h3>
                  <p className="text-sm" style={{ color: '#059669' }}>Built into every order</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Set your account risk % and stop-loss level — the calculator instantly shows dollar risk and exact position size.
                One click applies it to your order quantity.
              </p>
              {/* Mini calculator preview */}
              <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'linear-gradient(135deg,#00c87808,#059669 08%)', border: '1px solid #00c87820' }}>
                {[
                  { label: 'Account Balance', value: '$100,000', color: '#0a1520' },
                  { label: 'Risk %', value: '1.00%', color: '#0a1520' },
                  { label: 'Dollar Risk', value: '$1,000.00', color: '#dc2626' },
                  { label: 'Position Size', value: '0.52 lots', color: '#00c878' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{row.label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 2: P&L Calendar (wide) + Price Alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

            {/* P&L Calendar — spans 3 cols */}
            <div className="feature-card-light group lg:col-span-3" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#8b5cf618', border: '1px solid #8b5cf628' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth={1.8}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>P&L Calendar</h3>
                  <p className="text-sm" style={{ color: '#7c3aed' }}>Daily performance heatmap</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Navigate month-by-month through your trading history. Each day is colour-coded by P&L — instantly spot your best streaks and worst drawdowns.
              </p>
              {/* Mini calendar heatmap */}
              <div className="rounded-xl p-3" style={{ background: '#f8f9ff', border: '1px solid #e0e7ff' }}>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className="text-center text-2xs font-semibold" style={{ color: '#94a3b8', fontSize: 10 }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    null, null, 320, -80, 210, 450, -120,
                    180, -240, 90, 560, -30, 210, 340,
                    -180, 120, 0, 390, -60, 280, 170,
                    420, -90, 310, 0, 500, -150, 220,
                  ].map((v, i) => (
                    <div key={i} className="rounded aspect-square flex items-center justify-center"
                         style={{
                           fontSize: 8,
                           fontWeight: 700,
                           background: v === null ? 'transparent' : v === 0 ? '#e2e8f0' : v > 0 ? `rgba(0,200,120,${Math.min(0.15 + v/3000, 0.7)})` : `rgba(239,68,68,${Math.min(0.15 + Math.abs(v)/3000, 0.7)})`,
                           color: v === null ? 'transparent' : v === 0 ? '#94a3b8' : v > 0 ? '#059669' : '#dc2626',
                         }}>
                      {v !== null && v !== 0 ? (v > 0 ? '+' : '') + (v/1000).toFixed(1) + 'k' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Alerts — spans 2 cols */}
            <div className="feature-card-light group lg:col-span-2" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#f59e0b18', border: '1px solid #f59e0b28' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.8}>
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>Price Alerts</h3>
                  <p className="text-sm" style={{ color: '#d97706' }}>Never miss a move</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Set price targets on any symbol. Alerts fire instantly when your level is hit — even while you're away from the screen.
              </p>
              {/* Mini alert list */}
              <div className="space-y-2">
                {[
                  { sym: 'BTCUSD',  cond: 'above', price: '70,000', status: 'active', color: '#0ea5e9' },
                  { sym: 'EURUSD',   cond: 'below', price: '1.0800', status: 'triggered', color: '#f59e0b' },
                  { sym: 'NVDA',    cond: 'above', price: '900.00', status: 'active', color: '#0ea5e9' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                       style={{ background: a.status === 'triggered' ? '#fef3c720' : '#f0f9ff', border: `1px solid ${a.status === 'triggered' ? '#f59e0b44' : '#0ea5e920'}` }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs" style={{ color: '#0a1520' }}>{a.sym}</span>
                      <span className="text-xs" style={{ color: '#6b7280' }}>{a.cond}</span>
                      <span className="font-mono text-xs font-semibold" style={{ color: a.color }}>{a.price}</span>
                    </div>
                    <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: a.status === 'triggered' ? '#fef3c7' : '#e0f2fe', color: a.status === 'triggered' ? '#d97706' : '#0369a1', fontSize: 10 }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 3: CSV Export + Advanced Analytics ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CSV Export */}
            <div className="feature-card-light group" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#0ea5e918', border: '1px solid #0ea5e928' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth={1.8}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>Export to CSV</h3>
                  <p className="text-sm" style={{ color: '#0369a1' }}>Your data, your way</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Download your complete order history in one click — symbol, type, side, quantity, fill price, status and timestamps.
                Open in Excel, Google Sheets, or any analysis tool.
              </p>
              {/* Mini CSV preview */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e0e7ff' }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#1e3a5f', color: '#94a3b8', fontSize: 11 }}>
                  <span className="font-mono">tradex-orders-2024-06-12.csv</span>
                  <span className="flex items-center gap-1" style={{ color: '#0ea5e9' }}>
                    <span>↓</span><span>Download</span>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ fontSize: 10 }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        {['Symbol','Side','Qty','Price','Status'].map(h => (
                          <th key={h} className="px-3 py-1.5 text-left font-semibold" style={{ color: '#64748b' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['BTCUSD','BUY','0.5','67,420','filled'],
                        ['NVDA','SELL','10','875.40','filled'],
                        ['EURUSD','BUY','1000','1.0842','open'],
                      ].map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                          {r.map((c, j) => (
                            <td key={j} className="px-3 py-1.5 font-mono" style={{ color: c === 'BUY' ? '#059669' : c === 'SELL' ? '#dc2626' : '#374151' }}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Advanced Analytics */}
            <div className="feature-card-light group" style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#38bdf818', border: '1px solid #38bdf828' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: '#0a1520' }}>Portfolio Analytics</h3>
                  <p className="text-sm" style={{ color: '#0ea5e9' }}>Know your numbers</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#4b6280' }}>
                Equity curve, win rate, average R:R, max drawdown, Sharpe ratio — all calculated automatically.
                The P&L calendar and performance breakdown show exactly where you win and lose.
              </p>
              {/* Mini stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Win Rate',    value: '64.8%',  color: '#00c878', bg: '#00c87810' },
                  { label: 'Avg R:R',     value: '2.3 : 1', color: '#38bdf8', bg: '#38bdf810' },
                  { label: 'Max Drawdown',value: '-8.4%',  color: '#ef4444', bg: '#ef444410' },
                  { label: 'Sharpe Ratio',value: '1.84',   color: '#8b5cf6', bg: '#8b5cf610' },
                  { label: 'Total Trades',value: '247',    color: '#f59e0b', bg: '#f59e0b10' },
                  { label: 'Net P&L',     value: '+$34.2k',color: '#00c878', bg: '#00c87810' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                    <span className="text-xs" style={{ color: '#6b7280' }}>{s.label}</span>
                    <span className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-14">
            <a href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white transition-transform hover:scale-105"
               style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 4px 20px #0ea5e940' }}>
              Start Trading Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <p className="mt-3 text-sm" style={{ color: '#64748b' }}>No credit card required · $100k virtual funds · instant access</p>
          </div>
        </div>
      </section>

      {/* ── TRADING PILOT PITCH ──────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #060d18 0%, #04080f 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(14,165,233,0.07) 0%, transparent 65%)' }} />
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
          <svg width="100%" height="100%"><defs><pattern id="pg" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0ea5e9" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#pg)"/></svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Section label */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6"
                 style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8', letterSpacing: '0.08em' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
              INTRODUCING · CLAUDE AI POWERED
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-5"
                style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Meet{' '}
              <span style={{ background: 'linear-gradient(135deg,#0ea5e9 0%,#8b5cf6 50%,#00c878 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Trading Pilot
              </span>
            </h2>
            <p className="text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              The world's first trading bot that combines institutional-grade strategies with
              live <strong style={{ color: '#a78bfa' }}>Claude AI</strong> sentiment intelligence.
              It trades while you sleep.
            </p>
          </div>

          {/* Feature pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {[
              {
                color: '#0ea5e9', bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.15)',
                icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                title: 'Claude AI Sentiment',
                desc: 'Before every trade, Pilot reads the news. Claude analyses financial headlines in real-time and only approves entries when market sentiment agrees with the technical signal.',
              },
              {
                color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)',
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                title: '4 Battle-Tested Strategies',
                desc: 'MA Crossover, RSI Reversal, MACD Momentum, Pure Momentum. Each one engineered for a different market condition. Configure once, deploy forever.',
              },
              {
                color: '#00c878', bg: 'rgba(0,200,120,0.06)', border: 'rgba(0,200,120,0.15)',
                icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                title: '6-Layer Risk Shield',
                desc: 'Stop-loss, take-profit, daily loss limits, max trade caps, confirmation filters, and equity curve protection. Your capital is never left unguarded.',
              },
            ].map(f => (
              <div key={f.title} className="rounded-2xl p-7"
                   style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                     style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={f.color} strokeWidth={1.8}>
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Wide preview card */}
          <div className="relative rounded-3xl overflow-hidden"
               style={{ background: 'linear-gradient(135deg,rgba(10,16,30,0.95),rgba(6,9,20,0.98))', border: '1px solid rgba(14,165,233,0.12)', boxShadow: '0 0 80px rgba(14,165,233,0.06)' }}>
            {/* Left glow */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
            {/* Right glow */}
            <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-60 h-60 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left: pitch copy */}
              <div className="p-10 lg:p-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6"
                     style={{ background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.2)', color: '#00c878' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s infinite' }} />
                  NEVER TRIED BEFORE
                </div>
                <h3 className="text-3xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  The Market Never<br />Sleeps — and<br />
                  <span style={{ color: '#38bdf8' }}>Neither Does Pilot.</span>
                </h3>
                <p className="text-base leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  While you rest, Pilot monitors every tick on every enabled asset. It doesn't panic. It doesn't get greedy. It doesn't override its own rules.
                  It just executes — with cold, precise, AI-enhanced intelligence that no human can replicate.
                </p>
                <div className="space-y-2 mb-8">
                  {[
                    'Runs 24/7 autonomously — no babysitting needed',
                    'Claude AI reads news before every single trade',
                    'Multiple bots on multiple assets simultaneously',
                    'Full trade log with timestamps and P&L tracking',
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                           style={{ background: 'rgba(0,200,120,0.15)', border: '1px solid rgba(0,200,120,0.3)' }}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#00c878" strokeWidth={3}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{b}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href="/trading-pilot"
                     className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl transition-all"
                     style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', boxShadow: '0 0 30px rgba(14,165,233,0.3)' }}>
                    Explore Trading Pilot
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                  <a href="/login"
                     className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#d4dde8' }}>
                    Start Free Now
                  </a>
                </div>
              </div>

              {/* Right: mini bot card */}
              <div className="p-10 lg:p-12 flex items-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-full">
                  {/* Bot status card */}
                  <div className="rounded-2xl p-5 mb-4"
                       style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                             style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">BTC Trend Bot</div>
                          <div className="text-xs" style={{ color: '#3a5060' }}>MA Crossover · BTCUSD</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                           style={{ background: 'rgba(0,200,120,0.1)', color: '#00c878', border: '1px solid rgba(0,200,120,0.2)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s infinite' }} />
                        RUNNING
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'P&L', value: '+$1,247', color: '#00c878' },
                        { label: 'Trades', value: '14', color: '#0ea5e9' },
                        { label: 'Win Rate', value: '71%', color: '#8b5cf6' },
                      ].map(s => (
                        <div key={s.label} className="text-center rounded-xl py-2"
                             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-2xs mt-0.5" style={{ color: '#3a5060', fontSize: 10 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Log snippet */}
                  <div className="rounded-xl p-4 font-mono text-xs space-y-1.5"
                       style={{ background: '#030810', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { time: '15:18:30', color: '#00c878',  msg: '✓ BUY 0.15 BTCUSD @ 67,420' },
                      { time: '15:18:30', color: '#a78bfa', msg: 'Claude: BULLISH (0.81)' },
                      { time: '15:22:01', color: '#00c878',  msg: '✓ TP HIT · P&L +$434.93' },
                    ].map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <span style={{ color: '#1a2a3a' }}>{l.time}</span>
                        <span style={{ color: l.color }}>{l.msg}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <span style={{ color: '#1a2a3a' }}>15:22:02</span>
                      <span style={{ color: '#0ea5e9', animation: 'pulse 1s infinite' }}>█ Scanning next signal...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DATA PARTNERS ──────────────────────────────────────────────────── */
      <section style={{ background: 'rgba(14,165,233,0.04)', borderTop: '1px solid rgba(14,165,233,0.08)', borderBottom: '1px solid rgba(14,165,233,0.08)', padding: '20px 0' }}>
        <div className="landing-container">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Powered by real data from</span>
            {/* Binance */}
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://cryptologos.cc/logos/binance-bnb-logo.png" alt="Binance" width={22} height={22} style={{ borderRadius: 4 }} />
              <span className="text-white font-bold text-sm tracking-tight">Binance</span>
            </div>
            {/* Twelve Data */}
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <div style={{ width: 22, height: 22, borderRadius: 4, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display:'flex',alignItems:'center',justifyContent:'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>12</div>
              <span className="text-white font-bold text-sm tracking-tight">Twelve Data</span>
            </div>
            {/* Supabase */}
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://avatars.githubusercontent.com/u/54469796" alt="Supabase" width={22} height={22} style={{ borderRadius: 4 }} />
              <span className="text-white font-bold text-sm tracking-tight">Supabase</span>
            </div>
            {/* CoinGecko */}
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae4523e8c2d81234d04c1a35975ce50a7d.png" alt="CoinGecko" width={22} height={22} style={{ borderRadius: 4 }} />
              <span className="text-white font-bold text-sm tracking-tight">CoinGecko</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE MARKETS ───────────────────────────────────────────────────── */}
      <section id="markets" className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-container">
          <div className="text-center mb-10">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Live Markets</p>
            <h2 className="text-4xl font-bold text-white mb-3">Trade 20+ Instruments</h2>
            <p className="text-text-secondary">Crypto, Forex, Stocks, Commodities — all in one platform</p>
          </div>

          {/* Category pills */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['All', 'Crypto', 'Forex', 'Stocks'].map(c => (
              <span key={c} className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
                    style={{ background: c === 'All' ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                             border: c === 'All' ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(255,255,255,0.07)',
                             color: c === 'All' ? '#38bdf8' : '#6b8099' }}>
                {c}
              </span>
            ))}
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Symbol', 'Name', 'Price', 'Change', '24h %', 'Category'].map((h, i) => (
                    <th key={h} className={`py-3 px-5 text-left text-2xs font-semibold uppercase tracking-wider text-text-muted ${i >= 2 ? 'text-right' : ''}`}
                        style={i >= 2 ? {textAlign:'right'} : {}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MARKETS.map((m, i) => (
                  <tr key={m.sym} className="transition-colors cursor-pointer"
                      style={{ borderBottom: i < MARKETS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                             style={{ background: m.cat === 'Crypto' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : m.cat === 'Forex' ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : m.cat === 'Stocks' ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#f59e0b,#b45309)' }}>
                          <img src={m.logo} alt={m.name} width={28} height={28}
                               style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).innerText = m.sym[0] }} />
                        </div>
                        <span className="font-mono font-bold text-white text-sm">{m.sym}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-text-secondary text-sm">{m.name}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-semibold text-white text-sm">{m.price}</td>
                    <td className={`py-3.5 px-5 text-right font-mono text-sm font-semibold ${m.up ? 'text-bull' : 'text-bear'}`}>
                      {m.chg}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${m.up ? 'text-bull bg-bull-muted' : 'text-bear bg-bear-muted'}`}>
                        {m.up ? '▲' : '▼'} {Math.abs(parseFloat(m.chg)).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#6b8099' }}>
                        {m.cat}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-white/[0.05] text-center">
              <button onClick={goToApp} className="text-brand-400 text-xs font-semibold hover:text-brand-300 transition-colors">
                View all 20+ instruments →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="landing-section" style={{ background: '#f4f8ff' }}>
        <div className="landing-container">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#0369a1' }}>Get Started</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#0a1520' }}>Up &amp; Trading in Minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px -translate-x-1/2 z-0"
                       style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.3), transparent)' }} />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0ea5e9' }}>
                      {step.icon}
                    </div>
                    <span className="text-3xl font-black font-mono" style={{ color: '#0ea5e9', opacity: 0.25 }}>
                      {step.n}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#0a1520' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4b6280' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-4xl font-bold text-white">Trusted by Traders Worldwide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl p-6"
                   style={{ background: 'linear-gradient(135deg, #0c1928 0%, #0a1520 100%)', border: '1px solid rgba(14,165,233,0.08)' }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="#f59e0b" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                       style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-text-muted text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-container">
          <div className="relative rounded-3xl overflow-hidden px-10 py-16 text-center"
               style={{ background: 'linear-gradient(135deg, #0b1e3d 0%, #0d1a30 50%, #0b1a38 100%)', border: '1px solid rgba(14,165,233,0.15)' }}>
            {/* Decorative glows */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full"
                 style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full"
                 style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
                   style={{ background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.2)', color: '#00c878' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-bull inline-block" />
                Free forever · No credit card
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Ready to Start Trading?</h2>
              <p className="text-text-secondary text-lg max-w-lg mx-auto mb-8">
                Join thousands of traders who use TradeX Pro to sharpen their edge and master the markets.
              </p>
              <button onClick={goToApp} className="btn-primary text-base px-10 py-4 rounded-xl mx-auto">
                Get Started Free — 30 seconds
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#040710' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={14} height={14} className="text-white">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <span className="font-bold text-white">TradeX<span className="text-brand-400"> Pro</span></span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                Professional trading platform for the modern trader. Master markets with confidence.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {([
                  { label: 'Dashboard',  path: '/dashboard' },
                  { label: 'WebTrader',  path: '/dashboard/trade' },
                  { label: 'Portfolio',  path: '/dashboard/portfolio' },
                  { label: 'Analytics',  path: '/dashboard/analytics' },
                  { label: 'Scanner',    path: '/dashboard/scanner' },
                  { label: 'TradePilot', path: '/dashboard/bots' },
                ] as { label: string; path: string }[]).map(({ label, path }) => (
                  <li key={label}>
                    <a href={path} className="text-text-secondary text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Markets */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Markets</h4>
              <ul className="space-y-2.5">
                {([
                  { label: 'Crypto',      path: '/dashboard/trade?market=crypto' },
                  { label: 'Forex',        path: '/dashboard/trade?market=forex' },
                  { label: 'Stocks',       path: '/dashboard/trade?market=stocks' },
                  { label: 'Commodities',  path: '/dashboard/trade?market=commodities' },
                  { label: 'Indices',      path: '/dashboard/trade?market=indices' },
                ] as { label: string; path: string }[]).map(({ label, path }) => (
                  <li key={label}>
                    <a href={path} className="text-text-secondary text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {([
                  { label: 'Terms of Service', href: '/terms-of-service.html' },
                  { label: 'Privacy Policy',   href: '/privacy-policy.html' },
                  { label: 'Risk Disclosure',  href: '/risk-disclosure.html' },
                  { label: 'Cookie Policy',    href: '/cookie-policy.html' },
                ] as { label: string; href: string }[]).map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="text-text-secondary text-sm hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
               style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-text-muted text-xs">© 2026 TradeX Pro. All rights reserved.</p>
            <p className="text-text-muted text-xs">
              Paper trading platform — for educational purposes only.
              <span className="text-brand-400/60"> Not financial advice.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
