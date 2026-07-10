import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AccountType, Currency } from '../types'
import { BrandLogo } from '../components/ui/BrandMark'

const ACCENT = '#4f8cff'

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
  // Krug: good defaults beat forced choices — pickers hidden until requested
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
    e.currentTarget.style.borderColor = ACCENT
    e.currentTarget.style.boxShadow  = `0 0 0 3px rgba(79,140,255,0.16)`
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--t-border)'
    e.currentTarget.style.boxShadow  = 'none'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1px solid var(--t-border)',
    borderRadius: 10, fontSize: 14.5, color: 'var(--t-text-1)', background: 'var(--t-surface-2)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t-text-2)', marginBottom: 7,
  }

  return (
    <div className="theme-dark-scope" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--t-bg)', backgroundImage: 'var(--t-bg-glow)',
      backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Centered column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px 32px' }}>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <BrandLogo size={44} tagline={false} />
          <p style={{ fontSize: 11.5, color: 'var(--t-text-3)', margin: 0, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
            Engineered to win · <span style={{ color: '#f6c453' }}>Driven by you</span>
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'var(--t-surface)', border: '1px solid var(--t-border)',
          borderRadius: 18, padding: '32px 30px 28px', boxShadow: 'var(--t-shadow-md)',
        }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--t-text-1)', margin: '0 0 22px', letterSpacing: '-0.01em' }}>
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" placeholder="you@example.com"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Username — register only */}
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  required placeholder="alphatrader"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            )}

            {/* Account defaults summary — one glance, one optional decision */}
            {mode === 'register' && !customizeAccount && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'var(--t-surface-2)', border: '1px solid var(--t-border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--t-text-2)' }}>
                  Raw Spread plan · USD account
                </span>
                <button type="button" onClick={() => setCustomizeAccount(true)}
                  style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                  Change
                </button>
              </div>
            )}

            {/* Account plan — register only, on request */}
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
                          border: `1px solid ${on ? 'rgba(79,140,255,0.5)' : 'var(--t-border)'}`,
                          background: on ? 'var(--t-accent-s)' : 'var(--t-surface-2)',
                        }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: on ? ACCENT : 'var(--t-text-2)' }}>{a.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--t-text-3)', marginTop: 2 }}>{a.sub}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Currency — register only, on request */}
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
                          border: `1px solid ${on ? 'rgba(79,140,255,0.5)' : 'var(--t-border)'}`,
                          background: on ? 'var(--t-accent-s)' : 'var(--t-surface-2)',
                          color: on ? ACCENT : 'var(--t-text-2)',
                        }}>
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  style={{ ...inputStyle, paddingRight: 44 }} onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-text-3)', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPass
                    ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', background: 'var(--t-bear-s)', border: '1px solid rgba(255,90,114,0.3)', borderRadius: 10, fontSize: 12.5, color: 'var(--t-bear)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{err}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px', marginTop: 2,
                background: loading
                  ? 'rgba(242,184,75,0.35)'
                  : 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)',
                color: '#221503', border: 'none', borderRadius: 11,
                fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 6px 24px rgba(242,184,75,0.3), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Take the seat'}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t-text-3)', margin: '18px 0 0' }}>
            {mode === 'login' ? 'New to TradeX? ' : 'Already have an account? '}
            <button type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLocalError('') }}
              style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Demo note */}
        {mode === 'register' && (
          <p style={{ fontSize: 12, color: 'var(--t-text-3)', margin: '16px 0 0', textAlign: 'center' }}>
            Every account starts with a $100,000 practice balance.
          </p>
        )}
      </div>

      {/* ── Risk warning ── */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--t-border)' }}>
        <p style={{ fontSize: 11, color: 'var(--t-text-3)', lineHeight: 1.65, margin: '0 auto', maxWidth: 640, textAlign: 'center' }}>
          <strong style={{ color: 'var(--t-text-2)' }}>Risk warning:</strong>{' '}
          Trading derivatives carries a high risk of losing capital — only trade with money you can afford to lose.
          Derivatives may not be suitable for all investors; make sure you fully understand the risks involved.
        </p>
      </div>
    </div>
  )
}
