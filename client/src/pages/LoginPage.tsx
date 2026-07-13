import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AccountType, Currency } from '../types'
import { BrandMark } from '../components/ui/BrandMark'

// ── Homepage palette ──────────────────────────────────────────────────────────
const NIGHT  = '#121010'
const NIGHT2 = '#1c1717'
const IVORY  = '#f7f2e6'
const BODY   = '#c9bcae'
const DIM    = '#8d7d6a'
const GOLD   = '#f2b84b'
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const BULL   = '#18c98a'
const HAIR   = 'rgba(242,184,75,0.1)'
const SERIF  = "'Fraunces', Georgia, serif"

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <BrandMark size={30} />
      <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>
        <span style={{ color: IVORY }}>Trade</span>
        <span style={{ color: GOLD }}>X</span>
      </span>
    </div>
  )
}

function StartLights({ lit = 5, size = 8 }: { lit?: number; size?: number }) {
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

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register, loading, error } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  )
  const [email,       setEmail]       = useState('')
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [accountType, setAccountType] = useState<AccountType>('raw_spread')
  const [currency,    setCurrencyLocal] = useState<Currency>('USD')
  const [customizeAccount, setCustomizeAccount] = useState(false)
  const [localError,  setLocalError]  = useState('')

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

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GOLD
    e.currentTarget.style.boxShadow  = '0 0 0 3px rgba(242,184,75,0.15)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = HAIR
    e.currentTarget.style.boxShadow  = 'none'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1px solid ${HAIR}`,
    borderRadius: 10, fontSize: 14, color: IVORY, background: NIGHT,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: BODY, marginBottom: 7,
  }

  return (
    <div className="theme-dark-scope" style={{ minHeight: '100dvh', background: NIGHT, fontFamily: "'Inter', system-ui, sans-serif", color: BODY }}>
      <style>{`
        .au-split { display: grid; grid-template-columns: 1.05fr 1fr; min-height: 100dvh }
        .au-backlink { display: none }
        @media (max-width: 900px) {
          .au-split { grid-template-columns: 1fr }
          .au-hero { display: none }
          .au-backlink { display: flex }
        }
        .au-in::placeholder { color: #6e6353 }
      `}</style>

      <div className="au-split">

        {/* ═══ Left: brand / marketing panel ═══ */}
        <div className="au-hero" style={{
          position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: 'clamp(32px, 4vw, 56px)',
          background: `
            linear-gradient(180deg, rgba(18,16,16,0.78), rgba(18,16,16,0.92)),
            radial-gradient(900px 500px at 20% 15%, rgba(242,184,75,0.12), transparent 60%),
            url(/hero-bg.jpg) center / cover no-repeat, ${NIGHT}`,
          borderRight: `1px solid ${HAIR}`,
        }}>
          <Wordmark onClick={() => navigate('/')} />

          <div>
            <div style={{ marginBottom: 22 }}><StartLights /></div>
            <h1 style={{
              fontFamily: SERIF, fontWeight: 550, fontSize: 'clamp(30px, 3.4vw, 46px)',
              lineHeight: 1.08, letterSpacing: '-0.015em', color: IVORY, margin: '0 0 20px', maxWidth: 460,
            }}>
              Engineered to win.{' '}
              <span style={{ background: GOLD_G, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                Driven by you.
              </span>
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
              {[
                '250+ markets — crypto, forex, stocks, gold, indices',
                'Raw spreads from 0.0 pips, leverage up to 1:1000',
                'Free $100,000 practice account — no card needed',
              ].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: 'rgba(24,201,138,0.14)', border: '1px solid rgba(24,201,138,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={BULL} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5, color: BODY }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: DIM, margin: 0 }}>
            The X is the apex
          </p>
        </div>

        {/* ═══ Right: form ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(28px, 4vw, 48px) clamp(18px, 4vw, 40px)' }}>

          {/* Mobile-only top bar (brand + back to site) */}
          <div className="au-backlink" style={{ width: '100%', maxWidth: 420, alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
            <Wordmark onClick={() => navigate('/')} />
            <button onClick={() => navigate('/')} style={{ background: 'none', border: `1px solid ${HAIR}`, borderRadius: 999, color: BODY, fontSize: 12.5, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}>
              ← Site
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: IVORY, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 14, color: DIM, margin: '0 0 26px' }}>
              {mode === 'login' ? 'Sign in to your trading account.' : 'Sixty seconds and the seat is yours.'}
            </p>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: NIGHT2, border: `1px solid ${HAIR}`, marginBottom: 24 }}>
              {(['login', 'register'] as const).map(m => {
                const on = mode === m
                return (
                  <button key={m} type="button" onClick={() => { setMode(m); setLocalError('') }}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 13.5, fontWeight: 700,
                      background: on ? GOLD_G : 'transparent', color: on ? '#221503' : BODY,
                    }}>
                    {m === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="au-in" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="you@example.com"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {mode === 'register' && (
                <div>
                  <label style={labelStyle}>Username</label>
                  <input className="au-in" type="text" value={username} onChange={e => setUsername(e.target.value)}
                    required placeholder="alphatrader"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
              )}

              {/* Account defaults — one glance, one optional decision */}
              {mode === 'register' && !customizeAccount && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 10, background: NIGHT2, border: `1px solid ${HAIR}` }}>
                  <span style={{ fontSize: 13, color: BODY }}>Raw Spread plan · USD account</span>
                  <button type="button" onClick={() => setCustomizeAccount(true)}
                    style={{ background: 'none', border: 'none', color: GOLD, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                    Change
                  </button>
                </div>
              )}

              {mode === 'register' && customizeAccount && (
                <div>
                  <label style={labelStyle}>Account plan</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {([
                      { key: 'raw_spread' as AccountType, label: 'Raw Spread', sub: '$3.50/lot' },
                      { key: 'ctrader'    as AccountType, label: 'cTrader',    sub: '$3/lot'    },
                      { key: 'standard'   as AccountType, label: 'Standard',   sub: '$0 comm.'  },
                    ]).map(a => {
                      const on = accountType === a.key
                      return (
                        <button key={a.key} type="button" onClick={() => setAccountType(a.key)}
                          style={{
                            padding: '10px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                            border: `1px solid ${on ? 'rgba(242,184,75,0.5)' : HAIR}`,
                            background: on ? 'rgba(242,184,75,0.1)' : NIGHT2,
                          }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: on ? GOLD : BODY }}>{a.label}</div>
                          <div style={{ fontSize: 10.5, color: DIM, marginTop: 2 }}>{a.sub}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {mode === 'register' && customizeAccount && (
                <div>
                  <label style={labelStyle}>Account currency</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {(['USD', 'EUR', 'GBP'] as Currency[]).map(c => {
                      const on = currency === c
                      return (
                        <button key={c} type="button" onClick={() => setCurrencyLocal(c)}
                          style={{
                            padding: '10px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                            fontSize: 13, fontWeight: 700,
                            border: `1px solid ${on ? 'rgba(242,184,75,0.5)' : HAIR}`,
                            background: on ? 'rgba(242,184,75,0.1)' : NIGHT2,
                            color: on ? GOLD : BODY,
                          }}>
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="au-in"
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                    style={{ ...inputStyle, paddingRight: 44 }} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 0, display: 'flex', alignItems: 'center' }}>
                    {showPass
                      ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {err && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', background: 'rgba(255,90,114,0.1)', border: '1px solid rgba(255,90,114,0.3)', borderRadius: 10, fontSize: 13, color: '#ff8fa0' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{err}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px', marginTop: 2,
                  background: loading ? 'rgba(242,184,75,0.35)' : GOLD_G,
                  color: '#221503', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 6px 24px rgba(242,184,75,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Take the seat'}
              </button>
            </form>

            {mode === 'login' && (
              <p style={{ textAlign: 'center', fontSize: 13, color: DIM, margin: '18px 0 0' }}>
                New to TradeX?{' '}
                <button type="button" onClick={() => { setMode('register'); setLocalError('') }}
                  style={{ background: 'none', border: 'none', color: GOLD, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  Create an account
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p style={{ textAlign: 'center', fontSize: 12.5, color: DIM, margin: '16px 0 0' }}>
                Every account starts with a $100,000 practice balance.
              </p>
            )}

            {/* Risk warning */}
            <p style={{ fontSize: 11.5, color: DIM, lineHeight: 1.6, margin: '26px 0 0', textAlign: 'center' }}>
              <strong style={{ color: BODY }}>Risk warning:</strong>{' '}
              Trading derivatives carries a high risk of losing capital. Only trade with money you can
              afford to lose and make sure you fully understand the risks involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
