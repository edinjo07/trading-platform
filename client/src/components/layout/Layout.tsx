import React, { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTradingStore } from '../../store/tradingStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useTheme } from '../../context/ThemeContext'

// ─── Bottom Navigation (mobile only) ─────────────────────────────────────────
const BOTTOM_NAV = [
  {
    path: '/dashboard', end: true, label: 'Home',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  },
  {
    path: '/dashboard/trade', end: false, label: 'Trade',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  },
  {
    path: '/dashboard/portfolio', end: false, label: 'Portfolio',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
  },
  {
    path: '/dashboard/orders', end: false, label: 'Orders',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
  },
  {
    path: '/dashboard/alerts', end: false, label: 'Alerts',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/></svg>
  },
]

export default function Layout() {
  const { loadSymbols, loadOrders, loadPortfolio } = useTradingStore()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  useWebSocket()

  // Keep data-theme in sync on the root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    loadSymbols()
    loadOrders()
    loadPortfolio()
  }, [loadSymbols, loadOrders, loadPortfolio])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--t-bg)', fontFamily: "'Inter', system-ui, sans-serif", transition: 'background-color 0.25s ease' }}>
      {/* ── Overlay (mobile sidebar backdrop) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={closeMobile}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-auto" style={{ background: 'var(--t-bg)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)', transition: 'background-color 0.25s ease' }}>
          <div className="p-3 sm:p-5 lg:pb-4 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile / tablet only) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
        style={{
          background: 'var(--t-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--t-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transition: 'background 0.25s ease',
        }}
      >
        {BOTTOM_NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={closeMobile}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[56px] relative"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {({ isActive }) => (
              <>
                {/* active pill indicator */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 28, height: 3, background: 'var(--t-accent)', boxShadow: '0 0 8px var(--t-accent-s)', borderRadius: '0 0 4px 4px' }}
                  />
                )}
                <span style={isActive ? { color: 'var(--t-accent)' } : { color: 'var(--t-text-3)' }}>
                  {item.icon}
                </span>
                <span
                  className="text-[10px] font-semibold tracking-tight"
                  style={{ color: isActive ? 'var(--t-accent)' : 'var(--t-text-3)' }}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* "More" button opens the sidebar drawer */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 min-h-[56px]"
          style={{ color: 'rgba(148,163,184,0.55)', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="text-[10px] font-semibold tracking-tight">More</span>
        </button>
      </nav>
    </div>
  )
}

