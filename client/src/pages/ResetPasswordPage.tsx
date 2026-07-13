import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BrandMark } from '../components/ui/BrandMark'

const NIGHT  = '#121010'
const NIGHT2 = '#1c1717'
const IVORY  = '#f7f2e6'
const BODY   = '#c9bcae'
const DIM    = '#8d7d6a'
const GOLD   = '#f2b84b'
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const BULL   = '#18c98a'
const HAIR   = 'rgba(242,184,75,0.1)'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]   = useState<boolean | null>(null) // null = checking
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]     = useState(false)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const [done, setDone]     = useState(false)

  // The recovery link carries a token; detectSessionInUrl exchanges it for a
  // session. Confirm we have one (or catch the PASSWORD_RECOVERY event).
  useEffect(() => {
    let settled = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) { settled = true; setReady(true) }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (!settled) setReady(!!data.session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setErr('The two passwords don’t match.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 1600)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not update password. The link may have expired.')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1px solid ${HAIR}`, borderRadius: 10,
    fontSize: 14, color: IVORY, background: NIGHT, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,184,75,0.15)' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = HAIR; e.currentTarget.style.boxShadow = 'none' }

  return (
    <div className="theme-dark-scope" style={{ minHeight: '100dvh', background: NIGHT, fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 22, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <BrandMark size={30} />
          <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em' }}>
            <span style={{ color: IVORY }}>Trade</span><span style={{ color: GOLD }}>X</span>
          </span>
        </div>

        <div style={{ background: NIGHT2, border: `1px solid ${HAIR}`, borderRadius: 18, padding: '30px 28px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(24,201,138,0.12)', border: '1px solid rgba(24,201,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={BULL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: IVORY, margin: '0 0 6px' }}>Password updated</h1>
              <p style={{ fontSize: 13.5, color: DIM, margin: 0 }}>Signing you in…</p>
            </div>
          ) : ready === false ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: IVORY, margin: '0 0 8px' }}>Link expired</h1>
              <p style={{ fontSize: 13.5, color: BODY, lineHeight: 1.6, margin: '0 0 20px' }}>
                This password reset link is invalid or has expired. Request a fresh one from the sign-in screen.
              </p>
              <button onClick={() => navigate('/login')} style={{ width: '100%', padding: 13, borderRadius: 12, background: GOLD_G, color: '#221503', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: IVORY, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Set a new password</h1>
              <p style={{ fontSize: 13.5, color: DIM, margin: '0 0 22px' }}>Choose a strong password for your account.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY, marginBottom: 7 }}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      autoComplete="new-password" placeholder="At least 6 characters"
                      style={{ ...inputStyle, paddingRight: 44 }} onFocus={onFocus} onBlur={onBlur} />
                    <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 0, display: 'flex' }}>
                      {show
                        ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY, marginBottom: 7 }}>Confirm password</label>
                  <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required
                    autoComplete="new-password" placeholder="Re-enter your password"
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                {err && (
                  <div style={{ display: 'flex', gap: 8, padding: '10px 13px', background: 'rgba(255,90,114,0.1)', border: '1px solid rgba(255,90,114,0.3)', borderRadius: 10, fontSize: 13, color: '#ff8fa0' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>{err}</span>
                  </div>
                )}
                <button type="submit" disabled={busy || ready === null}
                  style={{ width: '100%', padding: 14, borderRadius: 12, background: (busy || ready === null) ? 'rgba(242,184,75,0.35)' : GOLD_G, color: '#221503', border: 'none', fontSize: 15, fontWeight: 800, cursor: (busy || ready === null) ? 'not-allowed' : 'pointer', boxShadow: (busy || ready === null) ? 'none' : '0 6px 24px rgba(242,184,75,0.3)' }}>
                  {ready === null ? 'Verifying link…' : busy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
