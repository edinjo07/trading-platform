import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AccountType, Currency } from '../types'

const FEATURES = [
  { icon: '⚡', title: 'Real-time Data', desc: 'Live quotes on 159+ instruments' },
  { icon: '📊', title: 'Advanced Charts', desc: 'Candlestick + depth + volume' },
  { icon: '🛡️', title: 'Risk Management', desc: 'TP/SL on every order' },
  { icon: '🔎', title: 'Market Scanner', desc: 'Scan all markets at once' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, loading, error } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  )
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>('raw_spread')
  const [currency, setCurrencyLocal] = useState<Currency>('USD')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, username, password, accountType, currency)
      navigate('/dashboard')
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const err = localError || error

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#06090f' }}>
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
           style={{ background: 'linear-gradient(145deg, #060e1c 0%, #06090f 60%, #020508 100%)' }}>
        {/* decorative circles */}
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(0,200,120,0.07) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full px-16 py-14">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              TradeX<span className="text-brand-400"> Pro</span>
            </span>
          </div>

          {/* Headline */}
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-white leading-tight mb-5">
              Trade Like a<br />
              <span className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }}>
                Professional
              </span>
            </h1>
            <p className="text-text-secondary text-lg mb-12 max-w-md leading-relaxed">
              Institutional-grade trading platform with deep liquidity, advanced charts, and real-time execution.
            </p>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {FEATURES.map(f => (
                <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-2xl leading-none mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-text-secondary text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini ticker tape */}
          <div className="flex items-center gap-5 mt-8 pt-6 border-t border-white/[0.05]">
            {[
              { sym: 'BTC', price: '67,420', chg: '+2.4%', up: true },
              { sym: 'ETH', price: '3,512',  chg: '+1.8%', up: true },
              { sym: 'AAPL', price: '189.2', chg: '-0.6%', up: false },
              { sym: 'EUR/USD', price: '1.0842', chg: '+0.1%', up: true },
            ].map(t => (
              <div key={t.sym} className="flex items-center gap-2">
                <span className="text-text-secondary text-xs font-mono">{t.sym}</span>
                <span className="text-white text-xs font-mono font-semibold">{t.price}</span>
                <span className={`text-2xs font-mono font-semibold ${t.up ? 'text-bull' : 'text-bear'}`}>{t.chg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel – form ──────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[480px] lg:shrink-0 px-8 py-12"
           style={{ background: '#08101a', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">TradeX<span className="text-brand-400"> Pro</span></span>
        </div>

        <div className="w-full max-w-sm">
          {/* Title */}
          <h2 className="text-white font-bold text-2xl mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-text-secondary text-sm mb-8">
            {mode === 'login'
              ? 'Sign in to access your trading account'
              : 'Start trading with a $100,000 demo account. No risk, real platform.'}
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-lg p-1 mb-7"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  mode === m
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" placeholder="you@example.com"
                className="input" />
            </div>

            {/* Username (register only) */}
            {mode === 'register' && (
              <div className="animate-fadeUp">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  required placeholder="AlphaTrader99"
                  className="input" />
              </div>
            )}

            {/* Account Type (register only) */}
            {mode === 'register' && (
              <div className="animate-fadeUp">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'raw_spread' as AccountType, label: 'Raw Spread', sub: '$3.50/lot', desc: 'MetaTrader · 0.0 pips', popular: true },
                    { key: 'ctrader' as AccountType, label: 'cTrader', sub: '$3/100k', desc: 'cTrader/TV · 0.0 pips', popular: false },
                    { key: 'standard' as AccountType, label: 'Standard', sub: '$0', desc: 'MetaTrader · 0.8 pips', popular: false },
                  ]).map(a => (
                    <button key={a.key} type="button" onClick={() => setAccountType(a.key)}
                      className="relative flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-center transition-all"
                      style={accountType === a.key
                        ? { background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.4)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6b8099' }
                      }>
                      {a.popular && (
                        <span className="absolute -top-2 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(14,165,233,0.2)', color: '#38bdf8' }}>POPULAR</span>
                      )}
                      <span className="text-xs font-semibold">{a.label}</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: accountType === a.key ? '#38bdf8' : '#4b6070' }}>{a.sub}</span>
                      <span className="text-[9px] opacity-60">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Currency (register only) */}
            {mode === 'register' && (
              <div className="animate-fadeUp">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Account Currency</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'USD' as Currency, label: 'USD', symbol: '$', sub: 'US Dollar' },
                    { key: 'EUR' as Currency, label: 'EUR', symbol: '€', sub: 'Euro' },
                    { key: 'GBP' as Currency, label: 'GBP', symbol: '£', sub: 'Pound Sterling' },
                  ]).map(c => (
                    <button key={c.key} type="button" onClick={() => setCurrencyLocal(c.key)}
                      className="flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-center transition-all"
                      style={currency === c.key
                        ? { background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.4)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#6b8099' }
                      }>
                      <span className="text-lg font-bold leading-none" style={{ color: currency === c.key ? '#38bdf8' : '#4b6070' }}>{c.symbol}</span>
                      <span className="text-xs font-semibold">{c.label}</span>
                      <span className="text-[9px] opacity-60">{c.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-secondary">Password</label>
                {mode === 'login' && (
                  <button type="button" className="text-2xs text-brand-400 hover:text-brand-300 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••" className="input pr-10" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              <div className="flex items-center gap-2 text-xs bg-bear-muted text-bear rounded-lg px-3 py-2.5 animate-fadeUp">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {err}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:shadow-glow-brand active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Please wait...
                  </span>
                : mode === 'login' ? 'Sign In to TradeX' : 'Create Free Account'
              }
            </button>
          </form>

          {/* Demo hint */}
          {mode === 'login' && (
            <div className="mt-5 rounded-lg px-4 py-3 text-center"
                 style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <p className="text-2xs text-text-secondary">
                <span className="text-brand-400 font-medium">Demo:</span> register any email + password
              </p>
              <p className="text-2xs text-text-secondary mt-0.5">
                Virtual balance: <span className="font-mono text-white font-semibold">$100,000.00</span>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-2xs text-text-muted">
            By continuing you agree to our{' '}
            <span className="text-brand-400 cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-brand-400 cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
