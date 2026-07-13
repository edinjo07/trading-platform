import React, { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MarketsPanel from '../trading/MarketsPanel'
import { useTradingStore } from '../../store/tradingStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useTheme } from '../../context/ThemeContext'

// ─── Bottom Navigation (mobile only) ─────────────────────────────────────────
const GOLD = '#f2b84b'
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
    path: '/dashboard/bots', end: false, label: 'Bots',
    icon: (active: boolean) => <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="14" height="11" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor"/>
      <path d="M12 8V4M8 4h8" stroke={active ? '#141010' : 'currentColor'}/>
      <circle cx="9.5" cy="13" r="1" fill={active ? '#141010' : 'currentColor'} stroke="none"/>
      <circle cx="14.5" cy="13" r="1" fill={active ? '#141010' : 'currentColor'} stroke="none"/>
    </svg>
  },
]

function BottomTab({ item, onClick }: { item: typeof BOTTOM_NAV[number]; onClick: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className="lx-tab flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-1.5 min-h-[58px] relative"
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span style={{
              position: 'absolute', top: 0, width: 26, height: 3, borderRadius: '0 0 3px 3px',
              background: GOLD, boxShadow: '0 0 10px rgba(242,184,75,0.6)',
            }} />
          )}
          <span style={{ color: isActive ? GOLD : 'rgba(247,242,230,0.42)', transition: 'color 0.15s' }}>
            {item.icon(isActive)}
          </span>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: isActive ? GOLD : 'rgba(247,242,230,0.42)', transition: 'color 0.15s' }}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )
}

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
          style={{ background: 'rgba(6,4,4,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={closeMobile}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar mobileOpen={mobileOpen} onClose={closeMobile} onOpenMarkets={() => setMarketsOpen(true)} />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(o => !o)} />
        <main
          className="flex-1 overflow-auto"
          style={{
            backgroundColor: 'var(--t-bg)', backgroundImage: 'var(--t-bg-glow)',
            backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 66px)',
            WebkitOverflowScrolling: 'touch',        // native momentum on iOS
            overscrollBehaviorY: 'contain',          // no whole-page rubber-band / pull-refresh
          }}
        >
          <div className="p-3 sm:p-5 lg:pb-4 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile / tablet only) ── */}
      <nav
        className="chrome-dark lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-end"
        style={{
          background: 'rgba(20,16,16,0.94)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderTop: '1px solid rgba(242,184,75,0.12)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <style>{`.lx-tab:active { transform: scale(0.9); transition: transform 0.1s } .lx-fab:active { transform: translateY(-8px) scale(0.94); transition: transform 0.1s }`}</style>

        {/* Left group */}
        <BottomTab item={BOTTOM_NAV[0]} onClick={closeMobile} />
        <BottomTab item={BOTTOM_NAV[1]} onClick={closeMobile} />

        {/* FAB — opens the Markets picker (browse → trade) */}
        <div className="flex-1 flex flex-col items-center justify-center pb-1" style={{ position: 'relative' }}>
          <button
            onClick={() => { closeMobile(); setMarketsOpen(true) }}
            aria-label="Browse markets"
            className="lx-fab"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 22px rgba(242,184,75,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
              marginBottom: 2, marginTop: -10,
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#221503" strokeWidth={2.4} strokeLinecap="round">
                <path d="M3 17l5-5 4 3 7-8" /><path d="M16 4h4v4" />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-wide" style={{ color: GOLD, marginTop: 3 }}>Markets</span>
          </button>
        </div>

        {/* Right group: Portfolio + Bots (the full menu lives in the header ☰) */}
        <BottomTab item={BOTTOM_NAV[2]} onClick={closeMobile} />
        <BottomTab item={BOTTOM_NAV[3]} onClick={closeMobile} />
      </nav>

      <MarketsPanel open={marketsOpen} onClose={() => setMarketsOpen(false)} />
    </div>
  )
}

