import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AccountType, Currency } from '../types'

const GREEN = '#00a651'

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

  // shared inline-input focus handlers
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GREEN
    e.currentTarget.style.boxShadow  = `0 0 0 3px ${GREEN}28`
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#dde1e7'
    e.currentTarget.style.boxShadow  = 'none'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1px solid #dde1e7',
    borderRadius: 8, fontSize: 15, color: '#1a1a1a', background: '#fff',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '5px 12px', borderRadius: 6, background: 'rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>EN</span>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, padding: mode === 'login' ? '40px 36px' : '32px 36px', boxShadow: '0 4px 32px rgba(0,0,0,0.09)' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: '#f8f9fa', border: '1.5px solid #e8eaed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                <polyline points="3 17 9 11 13 15 21 7" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 7 21 7 21 11" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: GREEN }}>I</span>C
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 21, fontWeight: 700, color: '#1a1a1a', margin: '0 0 26px', letterSpacing: '-0.01em' }}>
            {mode === 'login' ? 'Client Portal Login' : 'Create an Account'}
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 7 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Username — register only */}
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 7 }}>Username</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  required placeholder="AlphaTrader99"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            )}

            {/* Account Type — register only */}
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>Account Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {([
                    { key: 'raw_spread' as AccountType, label: 'Raw Spread', sub: '$3.50/lot' },
                    { key: 'ctrader'    as AccountType, label: 'cTrader',    sub: '$3/lot'    },
                    { key: 'standard'   as AccountType, label: 'Standard',   sub: '$0 commission' },
                  ]).map(a => (
                    <button key={a.key} type="button" onClick={() => setAccountType(a.key)}
                      style={{ padding: '10px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${accountType === a.key ? GREEN : '#dde1e7'}`, background: accountType === a.key ? `${GREEN}12` : '#fff', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: accountType === a.key ? GREEN : '#555' }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{a.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Currency — register only */}
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>Account Currency</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['USD', 'EUR', 'GBP'] as Currency[]).map(c => (
                    <button key={c} type="button" onClick={() => setCurrencyLocal(c)}
                      style={{ padding: '11px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${currency === c ? GREEN : '#dde1e7'}`, background: currency === c ? `${GREEN}12` : '#fff', fontSize: 14, fontWeight: 700, color: currency === c ? GREEN : '#555', transition: 'all 0.15s' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ ...inputStyle, paddingRight: 44 }} onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPass
                    ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Forgot password */}
            {mode === 'login' && (
              <button type="button" style={{ textAlign: 'left', background: 'none', border: 'none', color: GREEN, fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0, marginTop: -6 }}>
                Forgot Password?
              </button>
            )}

            {/* Error */}
            {err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {err}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s', letterSpacing: '0.01em', marginTop: 4 }}>
              {loading
                ? 'Please wait…'
                : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ marginTop: 22, textAlign: 'center', fontSize: 14, color: '#666', margin: '22px 0 0' }}>
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setLocalError('') }}
              style={{ background: 'none', border: 'none', color: GREEN, fontWeight: 600, cursor: 'pointer', fontSize: 14, padding: 0 }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* ── Risk warning ── */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.07)', background: '#f0f2f5' }}>
        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.65, margin: 0, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <strong style={{ color: '#777' }}>Risk warning:</strong>{' '}
          Trading Derivatives carries a high risk of losing capital and you should only trade with money you can afford to lose.
          Trading Derivatives may not be suitable for all investors, so please ensure that you fully understand the risks involved.
        </p>
      </div>
    </div>
  )
}
