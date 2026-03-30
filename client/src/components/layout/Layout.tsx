import React, { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTradingStore } from '../../store/tradingStore'
import { useWebSocket } from '../../hooks/useWebSocket'

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
  const [mobileOpen, setMobileOpen] = useState(false)
  useWebSocket()

  useEffect(() => {
    loadSymbols()
    loadOrders()
    loadPortfolio()
  }, [loadSymbols, loadOrders, loadPortfolio])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: '#06090f', fontFamily: "'Inter', system-ui, sans-serif" }}>
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
        <main className="flex-1 overflow-auto pb-16 lg:pb-0" style={{ background: '#06090f' }}>
          <div className="p-3 sm:p-4 h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
           style={{ background: '#080e1a', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {BOTTOM_NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={closeMobile}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-brand-300' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span style={isActive ? { color: '#38bdf8', filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' } : {}}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

