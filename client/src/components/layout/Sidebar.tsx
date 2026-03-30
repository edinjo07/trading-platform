import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTradingStore } from '../../store/tradingStore'
import { useAuthStore } from '../../store/authStore'
import { formatPrice, formatCurrency } from '../../utils/formatters'
import { Ticker } from '../../types'
import { getKYCStatus } from '../../pages/KYCPage'

// ─── Icons ────────────────────────────────────────────────────────────────────
const SvgBase = ({ children }: { children: React.ReactNode }) => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    {children}
  </svg>
)
const Icon = {
  dashboard:   <SvgBase><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></SvgBase>,
  trade:       <SvgBase><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></SvgBase>,
  portfolio:   <SvgBase><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></SvgBase>,
  orders:      <SvgBase><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></SvgBase>,
  scanner:     <SvgBase><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></SvgBase>,
  analytics:   <SvgBase><path d="M18 20V10M12 20V4M6 20v-6"/></SvgBase>,
  leaderboard: <SvgBase><path d="M8 21H5a2 2 0 01-2-2v-5m0 0V9a2 2 0 012-2h3m0 9H5m13 5h3a2 2 0 002-2v-5m0 0V9a2 2 0 00-2-2h-3m0 9h3M9 3h6a2 2 0 012 2v4H7V5a2 2 0 012-2z"/></SvgBase>,
  alerts:      <SvgBase><path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/></SvgBase>,
  bots:        <SvgBase><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M9 11V7a3 3 0 016 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/><path d="M12 2v2"/></SvgBase>,
  deposit:     <SvgBase><path d="M12 5v14M5 12l7 7 7-7"/><path d="M5 5h14"/></SvgBase>,
  withdraw:    <SvgBase><path d="M12 19V5M5 12l7-7 7 7"/><path d="M5 19h14"/></SvgBase>,
  profile:     <SvgBase><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></SvgBase>,
  kyc:         <SvgBase><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></SvgBase>,
  calendar:    <SvgBase><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></SvgBase>,
  calculator:  <SvgBase><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></SvgBase>,
  tv:          <SvgBase><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></SvgBase>,
  blog:        <SvgBase><path d="M4 6h16M4 12h12M4 18h8"/></SvgBase>,
  warning:     <SvgBase><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></SvgBase>,
  globe:       <SvgBase><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></SvgBase>,
  logout:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevronL:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  chevronR:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  chevronDown: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>,
  close:       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>,
}

const NAV_GROUPS = [
  {
    label: '',
    items: [
      { path: '/dashboard',         label: 'Dashboard',  icon: Icon.dashboard, end: true  },
      { path: '/dashboard/trade',   label: 'WebTrader',  icon: Icon.trade,     end: false },
      { path: '/dashboard/bots',    label: 'TradePilot', icon: Icon.bots,      end: false },
    ],
  },
  {
    label: 'Positions',
    items: [
      { path: '/dashboard/portfolio', label: 'Portfolio',  icon: Icon.portfolio,  end: false },
      { path: '/dashboard/orders',    label: 'Orders',     icon: Icon.orders,     end: false },
      { path: '/dashboard/analytics', label: 'Analytics',  icon: Icon.analytics,  end: false },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/dashboard/scanner',     label: 'Scanner',     icon: Icon.scanner,     end: false },
      { path: '/dashboard/alerts',      label: 'Alerts',      icon: Icon.alerts,      end: false },
      { path: '/dashboard/leaderboard', label: 'Leaderboard', icon: Icon.leaderboard, end: false },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/dashboard/deposit',  label: 'Deposit',  icon: Icon.deposit,  end: false },
      { path: '/dashboard/withdraw', label: 'Withdraw', icon: Icon.withdraw, end: false },
    ],
  },
]

const DISCOVER_ITEMS = [
  { path: '/dashboard/economic-calendar', label: 'Economic Calendar', icon: Icon.calendar   },
  { path: '/dashboard/forex-calculators', label: 'Forex Calculators', icon: Icon.calculator },
  { path: '/dashboard/web-tv',            label: 'Web TV',            icon: Icon.tv         },
  { path: '/dashboard/blog',              label: 'Blog & News',       icon: Icon.blog       },
  { path: '/dashboard/trading-scams',     label: 'Scam Awareness',    icon: Icon.warning    },
]

const WATCHLIST = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'NVDA', 'EURUSD', 'TSLA', 'MSFT']
const ASSET_COLOR: Record<string, string> = { crypto: '#fbbf24', forex: '#7dd3fc', stock: '#38bdf8' }

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { tickers, symbols, selectedSymbol, setSelectedSymbol } = useTradingStore()
  const { user, logout, setAccountMode } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = React.useRef<HTMLDivElement>(null)
  const kycStatus = getKYCStatus()

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  const handleSymbolClick = (sym: string) => {
    setSelectedSymbol(sym)
    navigate('/dashboard/trade')
    onClose()
  }

  // Mobile: fixed drawer (slides left/right via translate classes)
  // Desktop: in-flow element (overridden by .sidebar-aside CSS in index.css)
  return (
    <aside
      className={`sidebar-aside flex flex-col h-full overflow-hidden
                  transition-[transform,width] duration-300 ease-in-out
                  fixed inset-y-0 left-0 z-50 w-[270px]
                  ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                  ${collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]'}`}
      style={{ background: '#080e1a', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* ── Logo / header ── */}
      <div className="flex items-center gap-2.5 px-4 shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '56px' }}>
        <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-white font-bold text-sm tracking-tight">TradeX</span>
            <span className="text-brand-400 font-bold text-sm"> Pro</span>
          </div>
        )}
        {/* Desktop: collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex ml-auto p-1 rounded text-text-secondary hover:text-white transition-colors shrink-0">
          {collapsed ? Icon.chevronR : Icon.chevronL}
        </button>
        {/* Mobile: close button */}
        <button onClick={onClose}
          className="lg:hidden ml-auto p-1 rounded text-text-secondary hover:text-white transition-colors shrink-0">
          {Icon.close}
        </button>
      </div>

      {/* ── KYC verify strip ── */}
      <div className="px-2 pt-2 shrink-0">
        <NavLink
          to="/dashboard/verify"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full transition-all"
          style={
            kycStatus === 'verified'
              ? { background: 'rgba(0,200,120,0.08)',   border: '1px solid rgba(0,200,120,0.18)' }
              : kycStatus === 'pending'
              ? { background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)' }
              :   { background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }
          }
        >
          <span className="shrink-0" style={{ color: kycStatus === 'verified' ? '#22d3a0' : kycStatus === 'pending' ? '#38bdf8' : '#fbbf24' }}>
            {Icon.kyc}
          </span>
          {!collapsed && (
            <>
              <span className="text-xs font-semibold flex-1 min-w-0 truncate"
                    style={{ color: kycStatus === 'verified' ? '#22d3a0' : kycStatus === 'pending' ? '#38bdf8' : '#fbbf24' }}>
                {kycStatus === 'verified' ? 'Account Verified' : kycStatus === 'pending' ? 'Verification Pending' : 'Verify Account'}
              </span>
              {kycStatus !== 'verified' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: kycStatus === 'pending' ? 'rgba(14,165,233,0.18)' : 'rgba(245,158,11,0.22)',
                        color:      kycStatus === 'pending' ? '#38bdf8' : '#fbbf24',
                      }}>
                  {kycStatus === 'pending' ? 'PENDING' : '!'}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>

      {/* ── Navigation + Watchlist (scrollable) ── */}
      <nav className="flex flex-col px-2 mt-2 flex-1 overflow-y-auto min-h-0 pb-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="h-px my-1.5 mx-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
            )}
            {group.label && !collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 mt-0.5 px-2.5"
                 style={{ color: 'rgba(100,130,160,0.5)' }}>
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all
                   ${isActive ? 'text-brand-300' : 'text-text-secondary hover:text-text-primary'}`
                }
                style={({ isActive }) => isActive
                  ? { background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.18)' }
                  : { border: '1px solid transparent' }
                }
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {/* ── Discover (collapsible) ── */}
        <div>
          <div className="h-px my-1.5 mx-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <button
            onClick={() => setDiscoverOpen(o => !o)}
            title={collapsed ? 'Discover' : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg w-full text-text-secondary hover:text-text-primary transition-all"
            style={{ border: '1px solid transparent' }}
          >
            <span className="shrink-0">{Icon.globe}</span>
            {!collapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left">Discover</span>
                <span style={{ display: 'flex', transition: 'transform 0.2s', transform: discoverOpen ? 'rotate(180deg)' : 'none' }}>
                  {Icon.chevronDown}
                </span>
              </>
            )}
          </button>
          {discoverOpen && DISCOVER_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all
                 ${isActive ? 'text-brand-300' : 'text-text-secondary hover:text-text-primary'}`
              }
              style={({ isActive }) => isActive
                ? { background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.18)' }
                : { border: '1px solid transparent' }
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* ── Watchlist ── */}
        {!collapsed && (
          <div className="mt-3 px-0 pb-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(100,130,160,0.55)' }}>Watchlist</span>
              <span className="text-[10px]" style={{ color: 'rgba(100,130,160,0.55)' }}>{WATCHLIST.length}</span>
            </div>
            <div className="flex flex-col gap-px">
              {WATCHLIST.map(sym => {
                const ticker: Ticker | undefined = tickers[sym]
                const symInfo = symbols.find(s => s.symbol === sym)
                const isSelected = selectedSymbol === sym
                const isUp = (ticker?.changePercent ?? 0) >= 0
                return (
                  <button
                    key={sym}
                    onClick={() => handleSymbolClick(sym)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left w-full transition-all
                      ${isSelected ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    style={isSelected
                      ? { background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }
                      : { border: '1px solid transparent' }
                    }
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-[11px] text-text-primary truncate">{sym}</div>
                      {symInfo && (
                        <div className="text-[9px] font-semibold mt-0.5"
                             style={{ color: ASSET_COLOR[symInfo.assetClass] ?? '#6b8099' }}>
                          {symInfo.assetClass.toUpperCase()}
                        </div>
                      )}
                    </div>
                    {ticker ? (
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-mono text-[11px] text-text-primary">{formatPrice(ticker.price, sym)}</div>
                        <div className={`text-[10px] font-semibold ${isUp ? 'text-bull' : 'text-bear'}`}>
                          {isUp ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── User footer / profile dropdown ── */}
      <div ref={profileRef} className="shrink-0 px-2 py-3 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Dropdown menu — opens upward */}
        {profileOpen && (
          <div
            className="absolute left-2 right-2 bottom-full mb-2 z-50 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header row */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-sm font-semibold text-text-primary truncate">{user?.username}</div>
              <div className="text-xs text-text-muted truncate">{user?.email}</div>
            </div>

            {/* Nav items */}
            {[
              { label: 'Profile',         path: '/dashboard/profile', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
              { label: 'Account',         path: '/dashboard/profile?tab=account', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg> },
              { label: 'Security',        path: '/dashboard/profile?tab=security', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z"/></svg> },
              { label: 'Settings',        path: '/dashboard/profile?tab=settings', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
              { label: 'KYC Verification', path: '/dashboard/kyc', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setProfileOpen(false); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors text-left"
              >
                <span className="shrink-0 text-text-muted">{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Mode switcher */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Account Mode</div>
              <div className="flex gap-2">
                {(['demo', 'real'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAccountMode(m); setProfileOpen(false) }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={user?.accountMode === m
                      ? { background: m === 'real' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: m === 'real' ? '#10b981' : '#f59e0b', border: `1px solid ${m === 'real' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }
                      : { background: 'rgba(255,255,255,0.04)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {m === 'real' ? 'Live' : 'Demo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { logout(); setProfileOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-bear hover:bg-white/[0.03] transition-colors"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {Icon.logout}
              Sign Out
            </button>
          </div>
        )}

        {/* Trigger button */}
        {!collapsed ? (
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-white/[0.04]"
            style={{ background: profileOpen ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.025)' }}
          >
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-semibold text-text-primary truncate">{user?.username}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user?.accountMode === 'real' ? 'bg-bull' : 'bg-amber-400'}`} />
                <span className="text-[10px] text-text-secondary">
                  {user?.accountMode === 'real' ? 'Live' : 'Demo'}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-text-muted transition-transform" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }}>
              {Icon.chevronDown}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setProfileOpen(o => !o)}
            title={user?.username ?? 'Profile'}
            className="w-full flex items-center justify-center py-1.5 rounded-lg transition-colors"
            style={{ background: profileOpen ? 'rgba(14,165,233,0.1)' : undefined }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
