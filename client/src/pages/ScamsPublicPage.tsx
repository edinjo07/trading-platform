import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark'
import TradingScamsPage from './TradingScamsPage'

/* Public wrapper for the Trading Scams education page.
   Trust content belongs outside the login wall — brokers get judged on it.
   Minimal golden-hour shell: warm nav, the content, a short footer. */

const NIGHT = '#1a1310'
const IVORY = '#f7f2e6'
const GOLD  = '#f2b84b'
const DIM   = '#8d7d6a'
const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'

export default function ScamsPublicPage() {
  const navigate = useNavigate()

  return (
    <div className="theme-dark-scope" style={{ background: NIGHT, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px clamp(18px, 4vw, 44px)',
        background: 'rgba(26,19,16,0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(242,184,75,0.08)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <BrandMark size={30} />
          <span className="font-extrabold tracking-tight text-lg">
            <span style={{ color: IVORY }}>Trade</span>
            <span style={{ color: GOLD }}>X</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#c7b8a5', fontSize: 14, fontWeight: 500,
          }}>
            Home
          </button>
          <button onClick={() => navigate('/login?mode=register')} style={{
            background: GOLD_G, color: '#221503', border: 'none', cursor: 'pointer',
            borderRadius: 999, fontWeight: 800, fontSize: 13, padding: '10px 20px',
            boxShadow: '0 2px 6px rgba(20,10,4,0.35), 0 10px 30px rgba(242,184,75,0.18)',
          }}>
            Open account
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px clamp(16px, 4vw, 40px) 64px' }}>
        <TradingScamsPage />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(242,184,75,0.08)', padding: '28px clamp(18px, 4vw, 44px)' }}>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: DIM, margin: 0, maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
          If something claiming to be TradeX ever asks for your password, your card details,
          or promises guaranteed returns, it is not us. When in doubt, type the address yourself.
          © {new Date().getFullYear()} TradeX. Engineered to win. Driven by you.
        </p>
      </footer>
    </div>
  )
}
