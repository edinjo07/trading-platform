import React, { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MarketsPanel from '../trading/MarketsPanel'
import { useTradingStore } from '../../store/tradingStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useTheme } from '../../context/ThemeContext'

// ─── Bottom Navigation (mobile only) — Capital.com style ─────────────────────
const BOTTOM_NAV = [
  {
    path: '/dashboard', end: true, label: 'Home',
    icon: (active: boolean) => <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      {!active && <path d="M9 21V12h6v9"/>}
    </svg>
  },
  {
    path: '/dashboard/orders', end: false, label: 'Orders',
    icon: (active: boolean) => <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1" fill={active ? 'currentColor' : 'none'}/>
      {!active && <><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></>}
    </svg>
  },
  {
    path: '/dashboard/portfolio', end: false, label: 'Portfolio',
    icon: (active: boolean) => <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  },
  {
    path: '/dashboard/blog', end: false, label: 'News',
    icon: (active: boolean) => <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  },
]

export default function Layout() {
  const { loadSymbols, loadOrders, loadPortfolio } = useTradingStore()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [marketsOpen, setMarketsOpen] = useState(false)
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
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--t-bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Overlay (mobile sidebar backdrop) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={closeMobile}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} onOpenMarkets={() => setMarketsOpen(true)} />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--t-bg)', backgroundImage: 'var(--t-bg-glow)', backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat', paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
          <div className="p-3 sm:p-5 lg:pb-4 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile / tablet only) — Capital.com style ── */}
      <nav
        className="chrome-dark lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-end"
        style={{
          background: 'rgba(0,0,0,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* First two nav items */}
        {BOTTOM_NAV.slice(0, 2).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={closeMobile}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 min-h-[56px] relative"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.38)' }}>
                  {item.icon(isActive)}
                </span>
                <span className="text-[10.5px] font-medium" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.38)' }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* FAB (+) in the center — opens Markets panel */}
        <div className="flex-1 flex flex-col items-center justify-center pb-1" style={{ position: 'relative' }}>
          <button
            onClick={() => { closeMobile(); setMarketsOpen(true) }}
            style={{ WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255,255,255,0.15)',
              marginBottom: 2,
              marginTop: -8,
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </button>
        </div>

        {/* Last two nav items */}
        {BOTTOM_NAV.slice(2).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={closeMobile}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 min-h-[56px] relative"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.38)' }}>
                  {item.icon(isActive)}
                </span>
                <span className="text-[10.5px] font-medium" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.38)' }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <MarketsPanel open={marketsOpen} onClose={() => setMarketsOpen(false)} />
    </div>
  )
}

