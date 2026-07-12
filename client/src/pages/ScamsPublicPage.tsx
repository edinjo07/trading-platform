import React from 'react'
import PublicNav from '../components/ui/PublicNav'
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
  return (
    <div className="theme-dark-scope" style={{ background: NIGHT, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PublicNav />

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
