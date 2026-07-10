import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useKYCStore } from '../../store/kycStore'
import { BrandMark } from '../ui/BrandMark'
import {
  LayoutDashboard, TrendingUp, Bot, Briefcase, ClipboardList,
  BarChart3, ScanLine, Bell, Trophy, ArrowDownToLine, ArrowUpFromLine,
  Globe, Calendar, Calculator, Tv2, BookOpen, ShieldAlert,
  User, CreditCard, Shield, Settings2, BadgeCheck, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, X, ShieldCheck,
} from '../ui/Icons'

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: '',
    items: [
      { path: '/dashboard',         end: true,  trade: false, label: 'Dashboard',  icon: LayoutDashboard, color: '#4f8cff' },
      { path: '/dashboard/trade',   end: false, trade: true,  label: 'WebTrader',  icon: TrendingUp,      color: '#18c98a' },
      { path: '/dashboard/bots',    end: false, trade: false, label: 'TradePilot', icon: Bot,             color: '#a78bfa' },
    ],
  },
  {
    label: 'Positions',
    items: [
      { path: '/dashboard/portfolio', end: false, trade: false, label: 'Portfolio',  icon: Briefcase,     color: '#f6b24a' },
      { path: '/dashboard/orders',    end: false, trade: false, label: 'Orders',     icon: ClipboardList, color: '#4f8cff' },
      { path: '/dashboard/analytics', end: false, trade: false, label: 'Analytics',  icon: BarChart3,     color: '#e879f9' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/dashboard/scanner',     end: false, trade: false, label: 'Scanner',     icon: ScanLine, color: '#7aa7ff' },
      { path: '/dashboard/alerts',      end: false, trade: false, label: 'Alerts',      icon: Bell,     color: '#fb923c' },
      { path: '/dashboard/leaderboard', end: false, trade: false, label: 'Leaderboard', icon: Trophy,   color: '#f6c453' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/dashboard/deposit',  end: false, trade: false, label: 'Deposit',  icon: ArrowDownToLine, color: '#18c98a' },
      { path: '/dashboard/withdraw', end: false, trade: false, label: 'Withdraw', icon: ArrowUpFromLine, color: '#f43f5e' },
    ],
  },
]

const DISCOVER_ITEMS = [
  { path: '/dashboard/economic-calendar', label: 'Economic Calendar', icon: Calendar,    color: '#4f8cff' },
  { path: '/dashboard/forex-calculators', label: 'Forex Calculators', icon: Calculator,  color: '#18c98a' },
  { path: '/dashboard/web-tv',            label: 'Web TV',            icon: Tv2,         color: '#a78bfa' },
  { path: '/dashboard/blog',              label: 'Blog & News',       icon: BookOpen,    color: '#f6b24a' },
  { path: '/dashboard/trading-scams',     label: 'Scam Awareness',    icon: ShieldAlert, color: '#f43f5e' },
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
  const { record: kycRecord, start: startKyc } = useKYCStore()
  const kycStatus = kycRecord.status
  const isOnTrade = location.pathname === '/dashboard/trade'

  React.useEffect(() => { startKyc() }, [startKyc])

  React.useEffect(() => {
    if (!profileOpen) return
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [profileOpen])

  return (
    <aside
      className={`chrome-dark sidebar-aside flex flex-col h-full overflow-hidden
                  transition-[transform,width] duration-300 ease-in-out
                  fixed inset-y-0 left-0 z-50 w-[270px]
                  ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                  ${collapsed ? 'lg:w-[68px]' : 'lg:w-[232px]'}`}
      style={{ background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center shrink-0 px-3"
           style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <BrandMark size={32} />
          {!collapsed && (
            <span className="font-bold text-sm tracking-tight select-none">
              <span style={{ color: '#e9eef8' }}>Trade</span>
              <span style={{ color: '#4f8cff' }}>X</span>
              <span style={{ color: '#5f6d85' }}> Pro</span>
            </span>
          )}
        </div>
        <button onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <button onClick={onClose}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={15} />
        </button>
      </div>

      {/* ── KYC strip ────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 shrink-0">
        <NavLink to="/dashboard/verify" onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 w-full"
          style={kycStatus === 'verified'
            ? { background: 'rgba(24,201,138,0.08)', border: '1px solid rgba(24,201,138,0.2)' }
            : kycStatus === 'pending'
            ? { background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)' }
            : { background: 'rgba(246,178,74,0.09)', border: '1px solid rgba(246,178,74,0.3)' }
          }>
          <ShieldCheck size={14} strokeWidth={2}
            color={kycStatus === 'verified' ? '#18c98a' : kycStatus === 'pending' ? '#7aa7ff' : '#f6b24a'} />
          {!collapsed && (
            <span className="text-xs font-semibold flex-1 min-w-0 truncate"
                  style={{ color: kycStatus === 'verified' ? '#18c98a' : kycStatus === 'pending' ? '#7aa7ff' : '#f6b24a' }}>
              {kycStatus === 'verified' ? 'Account Verified' : kycStatus === 'pending' ? 'Verification Pending' : 'Verify Account'}
            </span>
          )}
          {!collapsed && kycStatus !== 'verified' && (
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: kycStatus === 'pending' ? 'rgba(79,140,255,0.2)' : 'rgba(246,178,74,0.22)', color: kycStatus === 'pending' ? '#7aa7ff' : '#f6b24a' }}>
              {kycStatus === 'pending' ? 'PENDING' : '!'}
            </span>
          )}
        </NavLink>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="flex flex-col px-3 mt-3 flex-1 overflow-y-auto min-h-0 pb-2 gap-0.5"
           style={{ scrollbarWidth: 'none' }}>

        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 4px 10px' }} />
            )}
            {group.label && !collapsed && (
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', paddingLeft: 10, marginBottom: 4 }}>
                {group.label}
              </p>
            )}

            {group.items.map(item => {
              const Icon = item.icon

              // ── WebTrader button (opens markets picker) ──
              if (item.trade) {
                return (
                  <button key={item.path} onClick={() => { onOpenMarkets(); onClose() }}
                    title={collapsed ? item.label : undefined}
                    className="flex items-center w-full rounded-xl transition-all duration-150"
                    style={{
                      gap: collapsed ? 0 : 12, padding: collapsed ? 10 : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isOnTrade ? `rgba(24,201,138,0.12)` : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isOnTrade) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if (!isOnTrade) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div className="shrink-0 flex items-center justify-center rounded-lg"
                         style={{ width: 32, height: 32, background: isOnTrade ? 'rgba(24,201,138,0.2)' : 'rgba(255,255,255,0.06)' }}>
                      <Icon size={16} strokeWidth={2} color={isOnTrade ? item.color : 'rgba(255,255,255,0.6)'} />
                    </div>
                    {!collapsed && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: isOnTrade ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                        {item.label}
                      </span>
                    )}
                  </button>
                )
              }

              // ── Standard NavLink ──
              return (
                <NavLink key={item.path} to={item.path} end={item.end} onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', width: '100%',
                    gap: collapsed ? 0 : 12, padding: collapsed ? 10 : '9px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 12, textDecoration: 'none', transition: 'all 0.15s',
                    background: isActive ? `${item.color}14` : 'transparent',
                  })}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    if (!el.style.background.includes('14)')) el.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    if (!el.style.background.includes('14)')) el.style.background = 'transparent'
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <div className="shrink-0 flex items-center justify-center rounded-lg"
                           style={{ width: 32, height: 32, background: isActive ? `${item.color}22` : 'rgba(255,255,255,0.06)', transition: 'all 0.15s' }}>
                        <Icon size={16} strokeWidth={2} color={isActive ? item.color : 'rgba(255,255,255,0.6)'} />
                      </div>
                      {!collapsed && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }}>
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* ── Discover ─────────────────────────────────────────────────────── */}
        <div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 4px 10px' }} />
          <button onClick={() => setDiscoverOpen(o => !o)}
            title={collapsed ? 'Discover' : undefined}
            className="flex items-center w-full rounded-xl transition-all duration-150"
            style={{ gap: collapsed ? 0 : 12, padding: collapsed ? 10 : '9px 12px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="shrink-0 flex items-center justify-center rounded-lg"
                 style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)' }}>
              <Globe size={16} strokeWidth={2} color="rgba(255,255,255,0.6)" />
            </div>
            {!collapsed && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'left' }}>Discover</span>
                <ChevronDown size={12} strokeWidth={2.5} color="rgba(255,255,255,0.3)"
                  style={{ transition: 'transform 0.2s', transform: discoverOpen ? 'rotate(180deg)' : 'none' }} />
              </>
            )}
          </button>

          {discoverOpen && DISCOVER_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink key={item.path} to={item.path} onClick={onClose}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', width: '100%',
                  gap: collapsed ? 0 : 12, padding: collapsed ? 10 : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 12, textDecoration: 'none', transition: 'all 0.15s',
                  background: isActive ? `${item.color}14` : 'transparent',
                })}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.style.background.includes('14)')) el.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.style.background.includes('14)')) el.style.background = 'transparent' }}
              >
                {({ isActive }) => (
                  <>
                    <div className="shrink-0 flex items-center justify-center rounded-lg"
                         style={{ width: 32, height: 32, background: isActive ? `${item.color}22` : 'rgba(255,255,255,0.06)' }}>
                      <Icon size={16} strokeWidth={2} color={isActive ? item.color : 'rgba(255,255,255,0.6)'} />
                    </div>
                    {!collapsed && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ── Profile footer ───────────────────────────────────────────────────── */}
      <div ref={profileRef} className="shrink-0 px-3 py-3 relative"
           style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {profileOpen && (
          <div className="absolute left-3 right-3 bottom-full mb-2 z-50 rounded-2xl overflow-hidden"
               style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -20px 60px rgba(0,0,0,0.9)' }}>
            {/* User header */}
            <div className="flex items-center gap-3 px-4 py-3.5"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                   style={{ background: 'linear-gradient(135deg,#4f8cff,#3b78f0)', boxShadow: '0 0 12px rgba(79,140,255,0.3)' }}>
                {user?.username?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
            </div>

            {/* Profile links */}
            {[
              { label: 'Profile',          path: '/dashboard/profile',              icon: User       },
              { label: 'Account',          path: '/dashboard/profile?tab=account',  icon: CreditCard },
              { label: 'Security',         path: '/dashboard/profile?tab=security', icon: Shield     },
              { label: 'Settings',         path: '/dashboard/profile?tab=settings', icon: Settings2  },
              { label: 'KYC Verification', path: '/dashboard/verify',               icon: BadgeCheck },
            ].map(item => {
              const Icon = item.icon
              return (
                <button key={item.label}
                  onClick={() => { navigate(item.path); setProfileOpen(false); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                  style={{ color: 'rgba(255,255,255,0.65)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.04)'; el.style.color = '#fff' }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.background = ''; el.style.color = 'rgba(255,255,255,0.65)' }}
                >
                  <Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                </button>
              )
            })}

            {/* Mode switcher */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 8 }}>Account Mode</p>
              <div className="flex gap-2">
                {(['demo', 'real'] as const).map(m => (
                  <button key={m} onClick={() => { setAccountMode(m); setProfileOpen(false) }}
                    className="flex-1 py-2 rounded-xl transition-all"
                    style={user?.accountMode === m
                      ? { background: m === 'real' ? 'rgba(24,201,138,0.15)' : 'rgba(246,178,74,0.15)', color: m === 'real' ? '#18c98a' : '#f6b24a', border: `1px solid ${m === 'real' ? 'rgba(24,201,138,0.3)' : 'rgba(246,178,74,0.3)'}`, fontSize: 12, fontWeight: 600 }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600 }
                    }>
                    {m === 'real' ? 'Live' : 'Demo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button onClick={() => { logout(); setProfileOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all"
              style={{ color: '#f43f5e', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <LogOut size={14} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        )}

        {/* Trigger */}
        {!collapsed ? (
          <button onClick={() => setProfileOpen(o => !o)}
            className="w-full flex items-center gap-3 rounded-xl transition-all px-3 py-2.5"
            style={{ background: profileOpen ? 'rgba(79,140,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { if (!profileOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#4f8cff,#3b78f0)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: user?.accountMode === 'real' ? '#18c98a' : '#f6b24a' }} />
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)' }}>{user?.accountMode === 'real' ? 'Live' : 'Demo'}</span>
              </div>
            </div>
            <ChevronDown size={12} strokeWidth={2.5} color="rgba(255,255,255,0.28)"
              style={{ flexShrink: 0, transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
        ) : (
          <button onClick={() => setProfileOpen(o => !o)} title={user?.username ?? 'Profile'}
            className="w-full flex items-center justify-center py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg,#4f8cff,#3b78f0)' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
