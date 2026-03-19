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
  logout:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevronL:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  chevronR:    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  close:       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>,
}

const NAV_GROUPS = [
  {
    label: 'Trading',
    items: [
      { path: '/dashboard',             label: 'Dashboard',   icon: Icon.dashboard,   end: true  },
      { path: '/dashboard/trade',       label: 'WebTrader',   icon: Icon.trade,       end: false },
      { path: '/dashboard/bots',        label: 'TradePilot',  icon: Icon.bots,        end: false },
      { path: '/dashboard/portfolio',   label: 'Portfolio',   icon: Icon.portfolio,   end: false },
      { path: '/dashboard/scanner',     label: 'Scanner',     icon: Icon.scanner,     end: false },
      { path: '/dashboard/orders',      label: 'Orders',      icon: Icon.orders,      end: false },
      { path: '/dashboard/analytics',   label: 'Analytics',   icon: Icon.analytics,   end: false },
      { path: '/dashboard/leaderboard', label: 'Leaderboard', icon: Icon.leaderboard, end: false },
      { path: '/dashboard/alerts',      label: 'Alerts',      icon: Icon.alerts,      end: false },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/dashboard/deposit',  label: 'Deposit',  icon: Icon.deposit,  end: false },
      { path: '/dashboard/withdraw', label: 'Withdraw', icon: Icon.withdraw, end: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/dashboard/profile', label: 'Profile', icon: Icon.profile, end: false },
    ],
  },
]

const WATCHLIST = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'NVDA', 'EURUSD', 'TSLA', 'MSFT']
const ASSET_COLOR: Record<string, string> = { crypto: '#fbbf24', forex: '#7dd3fc', stock: '#38bdf8' }

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { tickers, symbols, selectedSymbol, setSelectedSymbol } = useTradingStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const kycStatus = getKYCStatus()

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

      {/* ── Navigation ── */}
      <nav className="flex flex-col px-2 mt-2 shrink-0">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && (
              <div className="my-1.5 px-1">
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                {!collapsed && (
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2 mb-0.5 px-1.5"
                     style={{ color: 'rgba(100,130,160,0.55)' }}>
                    {group.label}
                  </p>
                )}
              </div>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all
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
      </nav>

      {/* ── Watchlist (scrollable middle area) ── */}
      {!collapsed && (
        <div className="mt-3 flex-1 overflow-y-auto px-2 min-h-0 pb-2">
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

      {/* ── User footer ── */}
      <div className="shrink-0 px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
               style={{ background: 'rgba(255,255,255,0.025)' }}>
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">{user?.username}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-bull shrink-0" />
                <span className="text-[10px] text-text-secondary">Paper Trading</span>
              </div>
            </div>
            <button onClick={logout} title="Sign out"
              className="shrink-0 text-text-muted hover:text-bear transition-colors p-1">
              {Icon.logout}
            </button>
          </div>
        ) : (
          <button onClick={logout} title="Sign out"
            className="w-full flex items-center justify-center py-2 text-text-muted hover:text-bear transition-colors">
            {Icon.logout}
          </button>
        )}
        {!collapsed && (
          <div className="mt-1.5 px-2">
            <span className="text-[10px] font-mono" style={{ color: 'rgba(100,130,160,0.65)' }}>
              Balance: <span className="text-text-primary">{formatCurrency(user?.balance ?? 0)}</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
