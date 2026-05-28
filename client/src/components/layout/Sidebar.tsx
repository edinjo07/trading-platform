import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Bot, Briefcase, ClipboardList,
  BarChart3, ScanLine, Bell, Trophy, ArrowDownToLine, ArrowUpFromLine,
  Globe, Calendar, Calculator, Tv2, BookOpen, ShieldAlert,
  User, CreditCard, Shield, Settings2, BadgeCheck, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, X, ShieldCheck,
} from '../ui/Icons'
import { useAuthStore } from '../../store/authStore'
import { getKYCStatus } from '../../pages/KYCPage'

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: '',
    items: [
      { path: '/dashboard',         label: 'Dashboard',  icon: LayoutDashboard, end: true,  trade: false },
      { path: '/dashboard/trade',   label: 'WebTrader',  icon: TrendingUp,      end: false, trade: true  },
      { path: '/dashboard/bots',    label: 'TradePilot', icon: Bot,             end: false, trade: false },
    ],
  },
  {
    label: 'Positions',
    items: [
      { path: '/dashboard/portfolio', label: 'Portfolio',  icon: Briefcase,     end: false, trade: false },
      { path: '/dashboard/orders',    label: 'Orders',     icon: ClipboardList, end: false, trade: false },
      { path: '/dashboard/analytics', label: 'Analytics',  icon: BarChart3,     end: false, trade: false },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/dashboard/scanner',     label: 'Scanner',     icon: ScanLine, end: false, trade: false },
      { path: '/dashboard/alerts',      label: 'Alerts',      icon: Bell,     end: false, trade: false },
      { path: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy,   end: false, trade: false },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/dashboard/deposit',  label: 'Deposit',  icon: ArrowDownToLine,  end: false, trade: false },
      { path: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine,  end: false, trade: false },
    ],
  },
]

const DISCOVER_ITEMS = [
  { path: '/dashboard/economic-calendar', label: 'Economic Calendar', icon: Calendar    },
  { path: '/dashboard/forex-calculators', label: 'Forex Calculators', icon: Calculator  },
  { path: '/dashboard/web-tv',            label: 'Web TV',            icon: Tv2         },
  { path: '/dashboard/blog',              label: 'Blog & News',       icon: BookOpen    },
  { path: '/dashboard/trading-scams',     label: 'Scam Awareness',    icon: ShieldAlert },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
  onOpenMarkets: () => void
}

export default function Sidebar({ mobileOpen, onClose, onOpenMarkets }: SidebarProps) {
  const { user, logout, setAccountMode } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = React.useRef<HTMLDivElement>(null)
  const kycStatus = getKYCStatus()

  React.useEffect(() => {
    if (!profileOpen) return
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [profileOpen])

  const isOnTrade = location.pathname === '/dashboard/trade'

  // ── Nav item shared styles ──
  const baseItem = 'flex items-center rounded-lg transition-all duration-150 cursor-pointer w-full'
  const itemPad  = collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'

  return (
    <aside
      className={`sidebar-aside flex flex-col h-full overflow-hidden
                  transition-[transform,width] duration-300 ease-in-out
                  fixed inset-y-0 left-0 z-50 w-[270px]
                  ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                  ${collapsed ? 'lg:w-[64px]' : 'lg:w-[230px]'}`}
      style={{ background: '#090909', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center shrink-0 px-4"
        style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
            <TrendingUp size={15} color="#fff" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight" style={{ color: '#fff' }}>TradeX</span>
              <span className="font-bold text-sm tracking-tight" style={{ color: '#0ea5e9' }}> Pro</span>
            </div>
          )}
        </div>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all"
          style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all"
          style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── KYC strip ── */}
      <div className="px-2.5 pt-2.5 shrink-0">
        <NavLink
          to="/dashboard/verify"
          onClick={onClose}
          className="flex items-center rounded-xl px-3 py-2 w-full transition-all"
          style={
            kycStatus === 'verified'
              ? { background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }
              : kycStatus === 'pending'
              ? { background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)' }
              : { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }
          }
        >
          <span style={{ color: kycStatus === 'verified' ? '#10b981' : kycStatus === 'pending' ? '#38bdf8' : '#f59e0b', flexShrink: 0 }}>
            <ShieldCheck size={15} strokeWidth={2} />
          </span>
          {!collapsed && (
            <div className="flex items-center justify-between flex-1 ml-2 min-w-0">
              <span className="text-xs font-semibold truncate"
                    style={{ color: kycStatus === 'verified' ? '#10b981' : kycStatus === 'pending' ? '#38bdf8' : '#f59e0b' }}>
                {kycStatus === 'verified' ? 'Account Verified' : kycStatus === 'pending' ? 'Verification Pending' : 'Verify Account'}
              </span>
              {kycStatus !== 'verified' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0"
                      style={{
                        background: kycStatus === 'pending' ? 'rgba(14,165,233,0.18)' : 'rgba(245,158,11,0.2)',
                        color:      kycStatus === 'pending' ? '#38bdf8' : '#f59e0b',
                      }}>
                  {kycStatus === 'pending' ? 'PENDING' : '!'}
                </span>
              )}
            </div>
          )}
        </NavLink>
      </div>

      {/* ── Scrollable nav ── */}
      <nav className="flex flex-col px-2.5 mt-2 flex-1 overflow-y-auto min-h-0 pb-2" style={{ scrollbarWidth: 'none' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
            {gi > 0 && <div className="my-1.5 mx-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />}
            {group.label && !collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1 mt-1"
                 style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>
                {group.label}
              </p>
            )}
            {group.items.map(item => {
              const Icon = item.icon

              // WebTrader — opens pair picker
              if (item.trade) {
                return (
                  <button
                    key={item.path}
                    onClick={() => { onOpenMarkets(); onClose() }}
                    title={collapsed ? item.label : undefined}
                    className={`${baseItem} ${itemPad}`}
                    style={isOnTrade
                      ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', borderLeft: '2px solid #0ea5e9', paddingLeft: collapsed ? undefined : '10px' }
                      : { color: 'rgba(255,255,255,0.55)', borderLeft: '2px solid transparent', paddingLeft: collapsed ? undefined : '10px' }
                    }
                    onMouseEnter={e => { if (!isOnTrade) (e.currentTarget as HTMLElement).style.color = '#fff' }}
                    onMouseLeave={e => { if (!isOnTrade) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)' }}
                  >
                    <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `${baseItem} ${itemPad}`}
                  style={({ isActive }) => isActive
                    ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', borderLeft: '2px solid #0ea5e9', paddingLeft: collapsed ? undefined : '10px' }
                    : { color: 'rgba(255,255,255,0.55)', borderLeft: '2px solid transparent', paddingLeft: collapsed ? undefined : '10px' }
                  }
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.style.color.includes('38bdf8')) el.style.color = '#fff' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.style.color.includes('38bdf8')) el.style.color = 'rgba(255,255,255,0.55)' }}
                >
                  <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* ── Discover ── */}
        <div className="mt-1">
          <div className="my-1.5 mx-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <button
            onClick={() => setDiscoverOpen(o => !o)}
            title={collapsed ? 'Discover' : undefined}
            className={`${baseItem} ${itemPad}`}
            style={{ color: 'rgba(255,255,255,0.55)', borderLeft: '2px solid transparent', paddingLeft: collapsed ? undefined : '10px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          >
            <Globe size={18} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left">Discover</span>
                <ChevronDown size={13} strokeWidth={2.5} style={{ transition: 'transform 0.2s', transform: discoverOpen ? 'rotate(180deg)' : 'none', opacity: 0.5 }} />
              </>
            )}
          </button>
          {discoverOpen && DISCOVER_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => `${baseItem} ${itemPad}`}
                style={({ isActive }) => isActive
                  ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', borderLeft: '2px solid #0ea5e9', paddingLeft: collapsed ? undefined : '10px' }
                  : { color: 'rgba(255,255,255,0.45)', borderLeft: '2px solid transparent', paddingLeft: collapsed ? undefined : '10px' }
                }
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.style.color.includes('38bdf8')) el.style.color = '#fff' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.style.color.includes('38bdf8')) el.style.color = 'rgba(255,255,255,0.45)' }}
              >
                <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ── Profile footer ── */}
      <div
        ref={profileRef}
        className="shrink-0 px-2.5 py-3 relative"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Dropdown — opens upward */}
        {profileOpen && (
          <div
            className="absolute left-2.5 right-2.5 bottom-full mb-2 z-50 rounded-2xl overflow-hidden"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -12px 40px rgba(0,0,0,0.8)' }}
          >
            {/* User info */}
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
                     style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
                  {user?.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#f0f0f0' }}>{user?.username}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            {[
              { label: 'Profile',           path: '/dashboard/profile',             icon: User },
              { label: 'Account',           path: '/dashboard/profile?tab=account', icon: CreditCard },
              { label: 'Security',          path: '/dashboard/profile?tab=security',icon: Shield },
              { label: 'Settings',          path: '/dashboard/profile?tab=settings',icon: Settings2 },
              { label: 'KYC Verification',  path: '/dashboard/kyc',                 icon: BadgeCheck },
            ].map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setProfileOpen(false); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                  style={{ color: 'rgba(255,255,255,0.65)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.cssText += ';color:#fff;background:rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}

            {/* Mode switcher */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Account Mode</p>
              <div className="flex gap-2">
                {(['demo', 'real'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAccountMode(m); setProfileOpen(false) }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={user?.accountMode === m
                      ? { background: m === 'real' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: m === 'real' ? '#10b981' : '#f59e0b', border: `1px solid ${m === 'real' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {m === 'real' ? 'Live' : 'Demo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { logout(); setProfileOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all"
              style={{ color: '#f43f5e', borderTop: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <LogOut size={15} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        )}

        {/* Trigger */}
        {!collapsed ? (
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{ background: profileOpen ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { if (!profileOpen) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)' )}}
            onMouseLeave={e => { if (!profileOpen) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}}
          >
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate" style={{ color: '#f0f0f0' }}>{user?.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: user?.accountMode === 'real' ? '#10b981' : '#f59e0b' }} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {user?.accountMode === 'real' ? 'Live' : 'Demo'}
                </span>
              </div>
            </div>
            <ChevronDown size={13} strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
        ) : (
          <button
            onClick={() => setProfileOpen(o => !o)}
            title={user?.username ?? 'Profile'}
            className="w-full flex items-center justify-center py-2 rounded-xl transition-all"
            style={{ background: profileOpen ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.03)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
