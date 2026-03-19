import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// ─── Icon helpers ──────────────────────────────────────────────────────────────
const Ic = {
  dashboard: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  transactions: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
  users: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  leads: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  trade: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  site: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  server: (
    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

// ─── Nav structure ─────────────────────────────────────────────────────────────
interface NavItem { label: string; path?: string; children?: NavItem[] }

const NAV_GROUPS: { label: string; icon: React.ReactNode; items: NavItem[] }[] = [
  {
    label: 'Analytics',
    icon: Ic.trade,
    items: [
      { label: 'Overview', path: '/admin/analytics' },
    ],
  },
  {
    label: 'Transactions',
    icon: Ic.transactions,
    items: [
      { label: 'All Trades',          path: '/admin/transactions/all' },
      { label: 'Open Trades',         path: '/admin/transactions/open' },
      { label: 'Closed Trades',       path: '/admin/transactions/closed' },
      { label: 'Deposit History',     path: '/admin/transactions/deposits' },
      { label: 'Automatic Gateways',  path: '/admin/transactions/auto-gateways' },
      { label: 'External Payments',   path: '/admin/transactions/external' },
      { label: 'Manual Gateways',     path: '/admin/transactions/manual-gateways' },
      { label: 'Pending Withdraws',   path: '/admin/transactions/pending-withdraws' },
      { label: 'Withdraw History',    path: '/admin/transactions/withdraw-history' },
      { label: 'Withdraw Settings',   path: '/admin/transactions/withdraw-settings' },
    ],
  },
  {
    label: 'User Management',
    icon: Ic.users,
    items: [
      { label: 'All Customers',       path: '/admin/users/all' },
      { label: 'Inactive Customers',  path: '/admin/users/inactive' },
      { label: 'Admin & Staffs',      path: '/admin/users/staff' },
    ],
  },
  {
    label: 'Leads Management',
    icon: Ic.leads,
    items: [
      { label: 'Clients',             path: '/admin/leads/clients' },
      { label: 'Sales',               path: '/admin/leads/sales' },
      { label: 'Retention',           path: '/admin/leads/retention' },
      { label: 'Live Leads',          path: '/admin/leads/live' },
      { label: 'Manual Leads',        path: '/admin/leads/manual' },
      { label: 'Affiliate Leads',     path: '/admin/leads/affiliate' },
      { label: 'Archived',            path: '/admin/leads/archived' },
      { label: 'All Sales Leads',     path: '/admin/leads/all-sales' },
      { label: 'Manual Sales Leads',  path: '/admin/leads/manual-sales' },
      { label: 'Live Sales Leads',    path: '/admin/leads/live-sales' },
      { label: 'KYC',                 path: '/admin/leads/kyc' },
      { label: 'Sales Statuses',      path: '/admin/leads/statuses' },
      { label: 'Promo Code',          path: '/admin/leads/promo' },
      { label: 'Teams',               path: '/admin/leads/teams' },
    ],
  },
  {
    label: 'Trade Management',
    icon: Ic.trade,
    items: [
      { label: 'Forex',               path: '/admin/trade/forex' },
      { label: 'Commodities',         path: '/admin/trade/commodities' },
      { label: 'Index',               path: '/admin/trade/index' },
      { label: 'Crypto',              path: '/admin/trade/crypto' },
      { label: 'Stock',               path: '/admin/trade/stock' },
      { label: 'Trading Pairs',       path: '/admin/trade/pairs' },
      { label: 'Spread Settings',     path: '/admin/trade/spread-settings' },
      { label: 'Lot Settings',        path: '/admin/trade/lot-settings' },
      { label: 'APIs',                path: '/admin/trade/apis' },
      { label: 'Pricing Plan',        path: '/admin/trade/pricing' },
    ],
  },
  {
    label: 'Site Management',
    icon: Ic.site,
    items: [
      { label: 'Site Settings',       path: '/admin/site/settings' },
      { label: 'Languages Settings',  path: '/admin/site/languages' },
    ],
  },
  {
    label: 'Server Management',
    icon: Ic.server,
    items: [
      { label: 'API Status',          path: '/admin/server/api-status' },
      { label: 'Server Info',         path: '/admin/server/info' },
    ],
  },
]

// ─── NavGroup collapse ──────────────────────────────────────────────────────────
function NavGroup({ group, collapsed }: { group: typeof NAV_GROUPS[0]; collapsed: boolean }) {
  const location = useLocation()
  const isActive = group.items.some(i => i.path && location.pathname.startsWith(i.path))
  const [open, setOpen] = useState(isActive)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center w-full gap-2.5 px-3 py-2 rounded-lg transition-colors text-left"
        style={{
          color: isActive ? '#38bdf8' : '#6b8099',
          background: isActive && !open ? 'rgba(14,165,233,0.08)' : 'transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#d4dde8' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#6b8099' }}
      >
        <span style={{ color: isActive ? '#38bdf8' : 'currentColor' }}>{group.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-xs font-medium tracking-wide">{group.label}</span>
            <span style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: '#6b8099',
            }}>
              {Ic.chevronDown}
            </span>
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="ml-[26px] mt-0.5 mb-1 border-l" style={{ borderColor: 'rgba(56,189,248,0.12)' }}>
          {group.items.map(item => (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) =>
                `flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs rounded-r-lg transition-colors ml-px ${
                  isActive ? 'text-brand-300 bg-brand-400/10' : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-200 overflow-hidden"
      style={{
        width: collapsed ? '60px' : '240px',
        background: 'linear-gradient(180deg, #080d18 0%, #060a14 100%)',
        borderRight: '1px solid rgba(56,189,248,0.07)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(56,189,248,0.07)', height: '56px' }}
      >
        <div
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary tracking-wider uppercase">TradeX</p>
            <p className="text-2xs font-semibold" style={{ color: '#0ea5e9', fontSize: '10px' }}>ADMIN PANEL</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto shrink-0 text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed
              ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
              : <><path d="M15 18l-6-6 6-6" /></>
            }
          </svg>
        </button>
      </div>

      {/* Dashboard link */}
      <div className="px-2 pt-3 pb-1">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-brand-400/15 text-brand-300' : 'text-text-secondary hover:text-text-primary'
            }`
          }
        >
          {Ic.dashboard}
          {!collapsed && <span className="text-xs font-medium">Dashboard</span>}
        </NavLink>
      </div>

      {/* Divider */}
      {!collapsed && (
        <p className="text-2xs font-semibold uppercase tracking-widest px-4 pb-1.5" style={{ color: '#3b5070', fontSize: '9px' }}>
          Management
        </p>
      )}

      {/* Scrollable nav groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-0.5 scrollbar-thin">
        {NAV_GROUPS.map(g => (
          <NavGroup key={g.label} group={g} collapsed={collapsed} />
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 px-2 py-2" style={{ borderTop: '1px solid rgba(56,189,248,0.07)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1"
            style={{ background: 'rgba(14,165,233,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff' }}>
              {user?.username?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.username ?? 'Admin'}</p>
              <p className="text-2xs text-text-secondary truncate" style={{ fontSize: '10px' }}>{user?.email ?? 'admin@tradex.io'}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-bear transition-colors"
        >
          {Ic.logout}
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
