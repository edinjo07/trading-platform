import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { adminCheck } from '../../api/admin'
import { BrandMark } from '../ui/BrandMark'
import { NIGHT, NIGHT2, IVORY, BODY, DIM, GOLD, GOLD_G, HAIR } from './ui'

const NAV = [
  { to: '/admin', end: true, label: 'Overview',
    icon: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></> },
  { to: '/admin/users', end: false, label: 'Users',
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
  { to: '/admin/transactions', end: false, label: 'Deposits & Withdrawals',
    icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></> },
  { to: '/admin/kyc', end: false, label: 'KYC Review',
    icon: <><path d="M9 12l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z"/></> },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => { adminCheck().then(setOk) }, [])

  if (ok === null) {
    return (
      <div style={{ minHeight: '100dvh', background: NIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ animation: 'a-pulse 1.2s ease-in-out infinite' }}><BrandMark size={44} /></div>
        <style>{`@keyframes a-pulse{0%,100%{opacity:.4;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    )
  }
  if (!ok) {
    return (
      <div style={{ minHeight: '100dvh', background: NIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <BrandMark size={40} />
        <h1 style={{ color: IVORY, fontSize: 22, fontWeight: 800, margin: 0 }}>Admins only</h1>
        <p style={{ color: BODY, fontSize: 14, maxWidth: 340, margin: 0 }}>Your account isn’t on the admin allowlist. If this is a mistake, contact the platform owner.</p>
        <button onClick={() => navigate('/dashboard')} style={{ background: GOLD_G, color: '#221503', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Back to app</button>
      </div>
    )
  }

  return (
    <div className="theme-dark-scope" style={{ minHeight: '100dvh', background: NIGHT, color: BODY, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .adm-shell { display: grid; grid-template-columns: 236px 1fr; min-height: 100dvh }
        .adm-side { position: sticky; top: 0; height: 100dvh }
        .adm-link { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 10px; text-decoration: none; font-size: 13.5px; font-weight: 600; color: ${BODY}; transition: background .15s, color .15s }
        .adm-link:hover { background: rgba(242,184,75,0.06); color: ${IVORY} }
        .adm-link.on { background: rgba(242,184,75,0.12); color: ${GOLD} }
        @media (max-width: 860px) {
          .adm-shell { grid-template-columns: 1fr }
          .adm-side { position: static; height: auto; flex-direction: row !important; overflow-x: auto }
          .adm-navwrap { flex-direction: row !important; gap: 6px !important }
          .adm-link span { display: none }
          .adm-foot { display: none !important }
          .adm-brand { display: none !important }
        }
      `}</style>

      <div className="adm-shell">
        {/* Sidebar */}
        <aside className="adm-side" style={{ background: NIGHT2, borderRight: `1px solid ${HAIR}`, display: 'flex', flexDirection: 'column', padding: 14 }}>
          <div className="adm-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px' }}>
            <BrandMark size={28} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
                <span style={{ color: IVORY }}>Trade</span><span style={{ color: GOLD }}>X</span>
              </div>
              <div style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: DIM }}>Superadmin</div>
            </div>
          </div>

          <nav className="adm-navwrap" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `adm-link${isActive ? ' on' : ''}`}>
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="adm-foot" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 12, borderTop: `1px solid ${HAIR}` }}>
            <button onClick={() => navigate('/dashboard')} className="adm-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back to app</span>
            </button>
            <button onClick={() => { logout(); navigate('/login') }} className="adm-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', color: '#ff8fa0' }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={{ minWidth: 0, overflowX: 'hidden', backgroundImage: 'var(--t-bg-glow)', backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px clamp(16px, 4vw, 32px) 80px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
