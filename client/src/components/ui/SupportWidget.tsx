import React, { useState, useRef, useEffect } from 'react'

/* Floating support launcher + chat-style help panel.
   Honest by design: instant answers to common questions, with a one-tap
   escalation to a human by email. No fake "agent is typing" theatre. */

const GOLD   = '#f2b84b'
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const NIGHT  = '#141010'
const NIGHT2 = '#1c1717'
const IVORY  = '#f7f2e6'
const BODY   = '#c9bcae'
const DIM    = '#8d7d6a'
const BULL   = '#18c98a'
const HAIR   = 'rgba(242,184,75,0.12)'
const SUPPORT_EMAIL = 'support@tradex.io'

type Msg = { from: 'bot' | 'user'; text: string; email?: boolean }

const TOPICS: { q: string; a: string; email?: boolean }[] = [
  { q: 'How do I fund my account?', a: 'Open the app, go to Deposit, choose bank transfer, card or crypto, and pick an amount. Demo accounts can top up instantly with practice funds — no card needed.' },
  { q: 'Is my money safe?',         a: 'Client funds are held separately from company funds, every trade carries optional stop-loss and margin protection, and practice accounts use virtual money so you can learn risk-free first.' },
  { q: 'I forgot my password',      a: 'On the sign-in screen tap “Forgot password?”, enter your email, and we’ll send a secure reset link. Already signed in? Change it any time under Profile → Security.' },
  { q: 'What are the spreads & fees?', a: 'Raw Spread accounts start from 0.0 pips with a $3.50/lot commission; Standard is commission-free from 1.0 pip. No deposit, withdrawal or inactivity fees.' },
  { q: 'Talk to a human',           a: `Our team replies within a few hours. Email us and we’ll pick it up:`, email: true },
]

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: 'Hi 👋 I’m the TradeX assistant. Pick a question below or email our team any time.' },
  ])
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, open])

  const ask = (t: typeof TOPICS[number]) => {
    setMsgs(m => [...m, { from: 'user', text: t.q }, { from: 'bot', text: t.a, email: t.email }])
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close support' : 'Chat with support'}
        style={{
          position: 'fixed', right: 'clamp(16px, 4vw, 24px)', bottom: 'calc(env(safe-area-inset-bottom) + clamp(16px, 4vw, 24px))',
          zIndex: 400, width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: GOLD_G, color: '#221503',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 26px rgba(242,184,75,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
          transition: 'transform 0.18s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
        ) : (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', right: 'clamp(16px, 4vw, 24px)', bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          zIndex: 400, width: 'min(360px, calc(100vw - 32px))', maxHeight: 'min(560px, calc(100dvh - 130px))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: NIGHT, border: `1px solid ${HAIR}`, borderRadius: 18,
          boxShadow: '0 2px 6px rgba(6,4,4,0.5), 0 30px 80px rgba(6,4,4,0.6)',
          animation: 'sw-rise 0.25s cubic-bezier(0.2,0.7,0.3,1) both',
        }}>
          <style>{`@keyframes sw-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', background: NIGHT2, borderBottom: `1px solid ${HAIR}` }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: GOLD_G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#221503" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: IVORY }}>TradeX Support</div>
              <div style={{ fontSize: 11.5, color: BULL, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: BULL }} /> Typically replies in a few hours
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', fontSize: 13, lineHeight: 1.55, padding: '10px 13px', borderRadius: 14,
                  background: m.from === 'user' ? GOLD_G : NIGHT2,
                  color: m.from === 'user' ? '#221503' : BODY,
                  border: m.from === 'user' ? 'none' : `1px solid ${HAIR}`,
                  borderBottomRightRadius: m.from === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.from === 'user' ? 14 : 4,
                  fontWeight: m.from === 'user' ? 700 : 400,
                }}>
                  {m.text}
                  {m.email && (
                    <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: 'inline-block', marginTop: 6, color: GOLD, fontWeight: 700, textDecoration: 'none' }}>
                      {SUPPORT_EMAIL} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${HAIR}`, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {TOPICS.map(t => (
              <button key={t.q} onClick={() => ask(t)} style={{
                fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                background: 'rgba(242,184,75,0.08)', color: GOLD, border: `1px solid rgba(242,184,75,0.25)`,
              }}>
                {t.q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
