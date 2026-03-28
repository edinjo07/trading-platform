import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// ─── Strategy data ────────────────────────────────────────────────────────────
const STRATEGIES = [
  {
    id: 'ma_crossover',
    name: 'MA Crossover',
    tagline: 'Trend Detection Engine',
    color: '#0ea5e9',
    glow: 'rgba(14,165,233,0.25)',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.18)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    desc: 'Two intelligent moving averages constantly monitor momentum. The moment the fast signal crosses above the slow signal, the system enters. When it crosses below, it exits. Clean. Precise. Relentless.',
    bullets: ['Fast & slow MA periods fully customisable', 'AI confirmation via sentiment filter', 'Stop-loss + take-profit automation', 'Works on any asset class'],
    badge: 'TREND FOLLOWING',
    winRate: '61%',
    avgReturn: '+2.4R',
  },
  {
    id: 'rsi',
    name: 'RSI Reversal',
    tagline: 'Overbought / Oversold Detector',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.25)',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.18)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    desc: 'The Relative Strength Index measures market exhaustion. When the crowd has sold too aggressively, Pilot buys the rebound. When euphoria peaks, it sells the top - a discipline no human can maintain.',
    bullets: ['RSI period and threshold fully tunable', 'Anti-whipsaw confirmation bars', 'News sentiment cross-check', 'Daily loss circuit-breaker'],
    badge: 'MEAN REVERSION',
    winRate: '58%',
    avgReturn: '+1.9R',
  },
  {
    id: 'macd',
    name: 'MACD Momentum',
    tagline: 'Momentum Shift Interceptor',
    color: '#00c878',
    glow: 'rgba(0,200,120,0.25)',
    bg: 'rgba(0,200,120,0.06)',
    border: 'rgba(0,200,120,0.18)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
    desc: 'MACD captures the gap between two exponential averages and watches for line convergence. It catches momentum shifts early - often before the rest of the market even notices the move has begun.',
    bullets: ['Fast, slow & signal periods configurable', 'Histogram divergence detection', 'Claude AI news sentiment overlay', 'Max daily trade circuit-breaker'],
    badge: 'MOMENTUM',
    winRate: '63%',
    avgReturn: '+2.7R',
  },
  {
    id: 'momentum',
    name: 'Pure Momentum',
    tagline: 'Trend Continuation Engine',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
    desc: "The simplest truth in markets: a moving object tends to keep moving. Pilot calculates directional strength over a configurable lookback window and rides the trend until it exhausts - no noise, no hesitation.",
    bullets: ['Lookback period fully configurable', 'Directional strength filter', 'Sentiment-weighted position sizing', 'Equity curve stop protection'],
    badge: 'BREAKOUT',
    winRate: '55%',
    avgReturn: '+3.1R',
  },
]

const RISK_FEATURES = [
  { label: 'Stop-Loss Automation', desc: 'Hard stop on every single trade. No exceptions.', color: '#ff3047', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { label: 'Take-Profit Locking', desc: 'Profit targets set before entry. No emotional hesitation.', color: '#00c878', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Max Daily Loss Limit', desc: 'Bot halts automatically when daily loss threshold is hit.', color: '#f59e0b', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { label: 'Max Daily Trades Cap', desc: 'Prevents overtrading in choppy or volatile conditions.', color: '#8b5cf6', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z' },
  { label: 'Confirmation Bars', desc: 'Signal must hold for N candles before entry. Filters false breakouts.', color: '#0ea5e9', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'Equity Curve Monitor', desc: 'Real-time drawdown tracking with peak-to-trough measurement.', color: '#38bdf8', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Choose Your Strategy',
    desc: 'Pick from four AI-enhanced strategies. Each one has been engineered for a different market condition - trending, ranging, momentum, or reversal.',
    color: '#0ea5e9',
  },
  {
    n: '02',
    title: 'Configure the Parameters',
    desc: 'Set your trade size, stop-loss, take-profit, and confirmation rules. Turn on the Claude AI news filter to align trades with market sentiment in real-time.',
    color: '#8b5cf6',
  },
  {
    n: '03',
    title: 'Activate & Monitor',
    desc: 'Hit start. Pilot monitors every tick. When signal conditions are met, it enters, manages, and exits positions - with zero latency and zero emotion.',
    color: '#00c878',
  },
  {
    n: '04',
    title: 'Review & Optimise',
    desc: 'Every trade is logged with timestamps and reasoning. Equity curve, win rate, and risk metrics update live. Refine your configuration. Let it compound.',
    color: '#f59e0b',
  },
]

// ─── Animated neural dots background ─────────────────────────────────────────
function NeuralGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" style={{ opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0ea5e9" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Pulsing dots */}
      {[
        { cx: '15%', cy: '20%', r: 2 }, { cx: '42%', cy: '8%', r: 1.5 }, { cx: '72%', cy: '15%', r: 2 },
        { cx: '88%', cy: '40%', r: 1.5 }, { cx: '60%', cy: '60%', r: 2 }, { cx: '25%', cy: '75%', r: 1.5 },
        { cx: '80%', cy: '80%', r: 2 }, { cx: '5%', cy: '55%', r: 1.5 },
      ].map((dot, i) => (
        <svg key={i} style={{ position: 'absolute', top: dot.cy, left: dot.cx, overflow: 'visible' }}>
          <circle cx="0" cy="0" r={dot.r} fill="#0ea5e9"
            style={{ animation: `pulse ${2 + i * 0.3}s ease-in-out infinite alternate` }} />
        </svg>
      ))}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'rgba(6,9,15,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            TradeX<span style={{ color: '#38bdf8' }}> Pro</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="text-sm font-medium px-4 py-2 transition-colors"
            style={{ color: '#8899aa' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#8899aa'}>
            ← Back to Home
          </button>
          <button
            onClick={() => navigate(user ? '/dashboard/bots' : '/login')}
            className="text-sm font-semibold px-5 py-2 rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
            Launch Pilot
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TradingPilotPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const heroRef = useRef<HTMLDivElement>(null)

  const goToBots = () => navigate(user ? '/dashboard/bots' : '/login')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{ background: '#06090f', color: '#d4dde8', minHeight: '100vh', fontFamily: 'inherit' }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-24 overflow-hidden" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
        {/* Background glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14,165,233,0.15) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 40% 40% at 80% 60%, rgba(139,92,246,0.08) 0%, transparent 60%)' }} />
        <NeuralGrid />

        <div className="relative max-w-6xl mx-auto px-6 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold mb-8"
               style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8', letterSpacing: '0.08em' }}>
            <div className="w-2 h-2 rounded-full bg-current" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            POWERED BY CLAUDE AI · AUTONOMOUS TRADING INTELLIGENCE
          </div>

          {/* Headline */}
          <h1 className="font-black text-white mb-6"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.05, letterSpacing: '-0.03em', textShadow: '0 0 80px rgba(14,165,233,0.15)' }}>
            Trading Pilot
            <br />
            <span style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #00c878 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              System
            </span>
          </h1>

          <p className="text-xl max-w-3xl mx-auto mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
            The first autonomous trading intelligence engine that fuses <strong style={{ color: '#fff' }}>real-time technical signals</strong> with <strong style={{ color: '#38bdf8' }}>Claude AI news sentiment</strong> - executing trades 24/7 with the discipline no human can sustain.
          </p>

          <p className="text-sm max-w-xl mx-auto mb-12" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Four battle-tested strategies. Institutional risk controls. One click to deploy.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button onClick={goToBots}
              className="flex items-center gap-2 text-base font-semibold px-8 py-4 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', boxShadow: '0 0 40px rgba(14,165,233,0.35)', letterSpacing: '0.01em' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(14,165,233,0.5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(14,165,233,0.35)' }}>
              Activate Pilot Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              onClick={() => document.getElementById('strategies')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 text-base font-medium px-8 py-4 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#d4dde8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
              Explore Strategies
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Live stats bar */}
          <div className="max-w-4xl mx-auto rounded-2xl px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-6"
               style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.12)', backdropFilter: 'blur(10px)' }}>
            {[
              { val: '4',      label: 'AI STRATEGIES',    color: '#0ea5e9' },
              { val: '24/7',   label: 'AUTONOMOUS OPS',   color: '#00c878' },
              { val: '< 1ms', label: 'SIGNAL LATENCY',   color: '#8b5cf6' },
              { val: '6+',     label: 'RISK CONTROLS',    color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black font-mono" style={{ color: s.color, letterSpacing: '-0.02em' }}>{s.val}</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLAUDE AI SECTION ──────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(14,165,233,0.05) 100%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 60% 50%, rgba(139,92,246,0.08) 0%, transparent 50%)' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
                   style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                CLAUDE AI INTEGRATION
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Not Just Signals.<br />
                <span style={{ color: '#a78bfa' }}>Intelligence.</span>
              </h2>
              <p className="text-lg mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Every strategy in Trading Pilot can optionally connect to <strong style={{ color: '#fff' }}>Claude AI</strong> - Anthropic's frontier language model - to analyse live financial news and market commentary in real-time.
              </p>
              <p className="text-base mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Before placing any trade, Pilot checks whether market sentiment aligns with the technical signal. A perfect crossover in a sea of negative headlines? Pilot waits. A confirmed RSI reversal with bullish sentiment? Pilot acts with full conviction.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Real-time news sentiment scoring', desc: 'Headlines scored positive, negative, or neutral per asset' },
                  { label: 'Sentiment-weighted confidence', desc: 'Signal strength blended with news context before entry' },
                  { label: 'Conflict avoidance', desc: 'Opposing sentiment suppresses trades - protecting from news-driven crashes' },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                         style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white">{f.label}</span>
                      <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>- {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: visual card */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />
              <div className="relative rounded-3xl overflow-hidden p-6"
                   style={{ background: 'linear-gradient(135deg,rgba(20,15,40,0.9),rgba(10,8,25,0.95))', border: '1px solid rgba(139,92,246,0.2)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Claude AI Sentiment Engine</div>
                    <div className="text-xs" style={{ color: '#a78bfa' }}>Live news analysis · BTCUSD</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       style={{ background: 'rgba(0,200,120,0.1)', color: '#00c878' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s infinite' }} />
                    LIVE
                  </div>
                </div>
                {/* News items */}
                <div className="space-y-3 mb-5">
                  {[
                    { headline: 'Bitcoin ETF inflows reach $2.1B in single day', sentiment: 'BULLISH', score: 0.87, color: '#00c878' },
                    { headline: 'Fed signals pause in rate hike cycle for Q2', sentiment: 'BULLISH', score: 0.72, color: '#00c878' },
                    { headline: 'SEC review of spot crypto products ongoing', sentiment: 'NEUTRAL', score: 0.50, color: '#f59e0b' },
                    { headline: 'Whale wallet movement detected on-chain', sentiment: 'CAUTION', score: 0.32, color: '#ff6b35' },
                  ].map((n, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{n.headline}</p>
                        <span className="text-2xs font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ background: `${n.color}18`, color: n.color, border: `1px solid ${n.color}30`, fontSize: 10 }}>
                          {n.sentiment}
                        </span>
                      </div>
                      {/* Sentiment bar */}
                      <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-1 rounded-full transition-all" style={{ width: `${n.score * 100}%`, background: `linear-gradient(90deg, ${n.color}88, ${n.color})` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Aggregate score */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(0,200,120,0.06)', border: '1px solid rgba(0,200,120,0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>AGGREGATE SENTIMENT SCORE</span>
                    <span className="text-sm font-black" style={{ color: '#00c878' }}>BULLISH · 0.73</span>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#00c878' }}>
                    ✓ Signal approved - MA crossover trade will execute
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STRATEGIES ────────────────────────────────────────────────────── */}
      <section id="strategies" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                 style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
              STRATEGY SUITE
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
              Four Weapons.<br />One System.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Each strategy is purpose-built for a different market condition. Deploy one - or run multiple pilots simultaneously across different assets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {STRATEGIES.map(s => (
              <div key={s.id}
                   className="relative rounded-2xl p-7 overflow-hidden group transition-all duration-300"
                   style={{ background: s.bg, border: `1px solid ${s.border}` }}
                   onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${s.glow}` }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                {/* Glow backdrop */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none transition-opacity duration-300"
                     style={{ background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }} />

                {/* Header row */}
                <div className="relative flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                         style={{ background: `${s.color}18`, border: `1px solid ${s.color}30`, color: s.color }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: `${s.color}aa` }}>{s.badge}</div>
                      <h3 className="text-xl font-black text-white">{s.name}</h3>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.tagline}</p>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>WIN RATE</div>
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.winRate}</div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>AVG {s.avgReturn}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="relative text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {s.desc}
                </p>

                {/* Bullets */}
                <div className="relative grid grid-cols-1 gap-2">
                  {s.bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-24 relative"
               style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(14,165,233,0.03) 50%, transparent 100%)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                 style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
              HOW IT WORKS
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
              From Zero to Operating<br />
              <span style={{ color: '#38bdf8' }}>in Under 60 Seconds</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.n} className="relative">
                {/* Connector */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px z-0"
                       style={{ background: `linear-gradient(90deg, ${step.color}44, transparent)`, transform: 'translateX(-50%)' }} />
                )}
                <div className="relative z-10 rounded-2xl p-6"
                     style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Number */}
                  <div className="text-5xl font-black font-mono mb-4" style={{ color: step.color, opacity: 0.2, lineHeight: 1 }}>{step.n}</div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                       style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: step.color, boxShadow: `0 0 8px ${step.color}` }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RISK CONTROLS ─────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                 style={{ background: 'rgba(255,48,71,0.08)', border: '1px solid rgba(255,48,71,0.2)', color: '#ff6b6b' }}>
              RISK MANAGEMENT
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
              Your Capital.<br />
              <span style={{ background: 'linear-gradient(135deg,#00c878,#0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Always Protected.
              </span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Six layers of institutional-grade risk controls built into every bot, every trade, every second.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {RISK_FEATURES.map(f => (
              <div key={f.label} className="rounded-2xl p-5"
                   style={{ background: `${f.color}06`, border: `1px solid ${f.color}18` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                       style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={f.color} strokeWidth={1.8}>
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-sm text-white">{f.label}</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE BOT CONSOLE PREVIEW ───────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(14,165,233,0.04) 0%, transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Real-Time Bot Console</h2>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>Every action. Every signal. Every trade. Logged live.</p>
          </div>

          {/* Console mock */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: '#040a12', border: '1px solid rgba(14,165,233,0.15)', boxShadow: '0 0 60px rgba(14,165,233,0.08)' }}>
            {/* Title bar */}
            <div className="flex items-center gap-3 px-4 py-3"
                 style={{ background: '#060d18', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <span className="text-xs font-mono" style={{ color: '#3a5060' }}>TradePilot - BTCUSD · MA Crossover · RUNNING</span>
              <div className="ml-auto flex items-center gap-1.5 text-xs font-bold" style={{ color: '#00c878' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s infinite' }} />
                LIVE
              </div>
            </div>

            {/* Log lines */}
            <div className="p-5 space-y-2 font-mono text-xs" style={{ minHeight: 280 }}>
              {[
                { ts: '14:32:01', level: 'INFO',   color: '#3a5060', msg: 'Bot initialised - Loading 200 candles for BTCUSD 1h...' },
                { ts: '14:32:02', level: 'INFO',   color: '#3a5060', msg: 'Warming up: fast MA (9) = 67,312.40 · slow MA (21) = 67,180.22' },
                { ts: '14:32:02', level: 'INFO',   color: '#3a5060', msg: 'News filter enabled - querying Claude AI for BTCUSD sentiment...' },
                { ts: '14:32:03', level: 'SIGNAL', color: '#0ea5e9', msg: '▲ CROSSOVER DETECTED - fast MA crossed above slow MA' },
                { ts: '14:32:03', level: 'SIGNAL', color: '#a78bfa', msg: 'Claude AI sentiment: BULLISH (0.81) - trade approved' },
                { ts: '14:32:03', level: 'TRADE',  color: '#00c878', msg: '✓ BUY 0.15 BTCUSD @ 67,420.50 - SL: 65,880 | TP: 70,320' },
                { ts: '14:45:12', level: 'INFO',   color: '#3a5060', msg: 'Position monitoring - current price 67,890.20 · unrealised P&L: +$70.46' },
                { ts: '15:02:44', level: 'RISK',   color: '#f59e0b', msg: 'Drawdown check: peak $100,070 · current $100,070 · max DD: 0.0%' },
                { ts: '15:18:30', level: 'TRADE',  color: '#00c878', msg: '✓ TAKE-PROFIT HIT - CLOSED BTCUSD @ 70,320.00 · P&L: +$434.93' },
                { ts: '15:18:30', level: 'INFO',   color: '#0ea5e9', msg: 'Daily stats - Trades: 1 · Wins: 1 · P&L: +$434.93 · Win rate: 100%' },
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span style={{ color: '#2a3a4a', whiteSpace: 'nowrap' }}>{line.ts}</span>
                  <span className="font-bold w-16 shrink-0 text-right" style={{ color: line.color }}>[{line.level}]</span>
                  <span style={{ color: line.color === '#3a5060' ? '#4a6070' : line.color }}>{line.msg}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3">
                <span style={{ color: '#2a3a4a' }}>15:18:31</span>
                <span className="text-current" style={{ color: '#0ea5e9', animation: 'pulse 1s infinite' }}>█</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(14,165,233,0.1) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 40% 40% at 80% 30%, rgba(139,92,246,0.08) 0%, transparent 60%)' }} />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8"
               style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)', color: '#00c878' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 1.5s infinite' }} />
            FREE WITH YOUR TRADEX PRO ACCOUNT
          </div>

          <h2 className="text-5xl md:text-6xl font-black text-white mb-6" style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            The Market Never<br />Sleeps.
            <br />
            <span style={{ color: '#38bdf8' }}>Neither Does Pilot.</span>
          </h2>

          <p className="text-lg mb-12 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '0 auto 3rem' }}>
            While you rest, research, or live your life - Trading Pilot scans every tick, fires precise signals, and manages risk in real time. This is the edge you've been looking for.
          </p>

          <button onClick={goToBots}
            className="inline-flex items-center gap-3 text-lg font-bold px-10 py-5 rounded-2xl transition-all"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', color: '#fff', boxShadow: '0 0 60px rgba(14,165,233,0.3), 0 0 30px rgba(124,58,237,0.2)', letterSpacing: '0.01em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}>
            Activate Trading Pilot
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Included free · No additional setup · Works on all 20+ instruments
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#040710', padding: '2rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={12} height={12} className="text-white">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="font-bold text-sm text-white">TradeX<span style={{ color: '#38bdf8' }}> Pro</span></span>
          </button>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Paper trading only - for educational purposes. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
