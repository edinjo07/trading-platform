import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BrandMark } from './BrandMark'

/* Shared public-site header with a mobile dropdown that lists every page.
   Used by every public page except the homepage (which has its own hero
   nav + full-screen drawer). Golden-hour skin, gold CTA, one source of
   truth for the page map. */

const IVORY  = '#f7f2e6'
const BODY   = '#c9bcae'
const DIM    = '#8d7d6a'
const GOLD   = '#f2b84b'
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
const HAIR   = 'rgba(242,184,75,0.09)'

export default function PublicNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()
  const [open, setOpen] = useState(false)

  // Close the dropdown whenever the route changes
  useEffect(() => { setOpen(false) }, [location.pathname])

  const go = () => { setOpen(false); navigate(token ? '/dashboard' : '/login?mode=register') }
  const goTo = (path: string) => { setOpen(false); navigate(path) }

  const PAGES: [string, () => void][] = [
    ['Home', () => goTo('/')],
    ['TradePilot in depth', () => goTo('/trading-pilot')],
    ['Account types & plans', () => goTo('/account-types')],
    ['Trading scams & safety', () => goTo('/trading-scams')],
    ['Sign in', () => goTo('/login')],
  ]
  const PLATFORM: string[] = [
    'WebTrader', 'Market scanner', 'Analytics', 'Leaderboard',
    'Economic calendar', 'Forex calculators', 'Trading Web TV', 'Blog & insights',
  ]

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <style>{`
        .pnav-links { display: flex; gap: 22px; align-items: center }
        .pnav-burger { display: none; background: none; border: 1px solid rgba(242,184,75,0.25); border-radius: 10px;
          width: 40px; height: 40px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0 }
        .pnav-link { background: none; border: none; cursor: pointer; padding: 0;
          color: ${BODY}; font-size: 13.5px; font-weight: 500; transition: color 0.15s }
        .pnav-link:hover { color: ${IVORY} }
        .pnav-drop { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.25s ease }
        .pnav-drop.pnav-on { max-height: 640px; opacity: 1 }
        @media (max-width: 720px) {
          .pnav-links { display: none }
          .pnav-burger { display: flex }
        }
      `}</style>

      {/* Bar */}
      <div style={{
        background: 'rgba(22,16,17,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${HAIR}`,
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => goTo('/')}>
            <BrandMark size={28} />
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
              <span style={{ color: IVORY }}>Trade</span>
              <span style={{ color: GOLD }}>X</span>
            </span>
          </div>

          <div className="pnav-links">
            <button className="pnav-link" onClick={() => goTo('/')}>Home</button>
            <button className="pnav-link" onClick={() => goTo('/trading-pilot')}>TradePilot</button>
            <button className="pnav-link" onClick={() => goTo('/account-types')}>Account types</button>
            <button className="pnav-link" onClick={() => goTo('/trading-scams')}>Safety</button>
            <button className="pnav-link" onClick={() => goTo('/login')}>Sign in</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={go} style={{
              background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
              borderRadius: 999, fontWeight: 800, fontSize: 13, padding: '9px 20px',
              boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 8px 24px rgba(242,184,75,0.16)',
              whiteSpace: 'nowrap',
            }}>
              Open account
            </button>
            <button className="pnav-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
              {open ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={2} strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown: every page */}
        <div className={`pnav-drop${open ? ' pnav-on' : ''}`} style={{
          borderTop: open ? `1px solid ${HAIR}` : '1px solid transparent',
          background: 'rgba(22,16,17,0.97)',
        }}>
          <div style={{ padding: '14px clamp(16px, 4vw, 40px) 20px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, margin: '6px 0 4px' }}>
              Company
            </div>
            {PAGES.map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', padding: '11px 0', fontSize: 16, fontWeight: 650, color: IVORY,
                borderBottom: '1px solid rgba(242,184,75,0.06)',
              }}>
                {label}
              </button>
            ))}

            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, margin: '18px 0 8px' }}>
              Inside the platform
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' }}>
              {PLATFORM.map(label => (
                <button key={label} onClick={go} style={{
                  textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0', fontSize: 14, fontWeight: 550, color: BODY,
                }}>
                  {label}
                </button>
              ))}
            </div>

            <button onClick={go} style={{
              background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
              borderRadius: 12, fontWeight: 800, fontSize: 15, padding: '14px 0', width: '100%', marginTop: 16,
              boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.18)',
            }}>
              Open account · free $100k demo
            </button>
            <p style={{ fontSize: 11.5, color: DIM, textAlign: 'center', margin: '8px 0 0' }}>
              60 seconds · no card · practice on live prices
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}
