import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency } from '../utils/formatters'

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-6" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-2xs text-text-muted uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`text-lg font-bold font-mono ${color ?? 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-2xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', readOnly = false, hint
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; readOnly?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm text-text-primary transition-colors focus:outline-none"
        style={{
          background: readOnly ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: readOnly ? '#6b8099' : undefined,
          cursor: readOnly ? 'default' : undefined,
        }}
      />
      {hint && <div className="text-2xs text-text-muted mt-1">{hint}</div>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { color: string; bg: string }> = {
    admin:   { color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
    default: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  }
  const s = styles[role] ?? styles.default
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ color: s.color, background: s.bg }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
      style={{
        background: type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: type === 'ok' ? '#10b981' : '#ef4444',
      }}
    >
      {type === 'ok'
        ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
        : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      }
      {msg}
    </div>
  )
}

type Tab = 'overview' | 'security' | 'settings'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { portfolio, performanceStats } = useTradingStore()

  const [tab, setTab] = useState<Tab>('overview')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Security tab state
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  // Settings tab state
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [tradeAlerts, setTradeAlerts] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(false)
  const [twoFA, setTwoFA] = useState(false)

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!curPwd) { showToast('Current password is required', 'err'); return }
    if (newPwd.length < 8) { showToast('Password must be at least 8 characters', 'err'); return }
    if (newPwd !== confPwd) { showToast('Passwords do not match', 'err'); return }
    setPwdLoading(true)
    setTimeout(() => {
      setPwdLoading(false)
      setCurPwd(''); setNewPwd(''); setConfPwd('')
      showToast('Password updated successfully', 'ok')
    }, 1200)
  }

  const toggle = (val: boolean, set: (v: boolean) => void, label: string) => {
    set(!val)
    showToast(`${label} ${!val ? 'enabled' : 'disabled'}`, 'ok')
  }

  const joined = user?.id
    ? new Date(parseInt(user.id.slice(-8), 16) * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  const winRate = performanceStats?.winRate ?? 0
  const totalTrades = (portfolio?.positions?.length ?? 0) + 12
  const pl = portfolio?.unrealizedPnl ?? 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'security', label: 'Security' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-full p-6 max-w-4xl mx-auto">
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{
          background: 'linear-gradient(135deg, #0f1e38 0%, #0b1437 60%, #130d35 100%)',
          border: '1px solid rgba(14,165,233,0.15)',
        }}
      >
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}
        >
          {user?.username?.[0]?.toUpperCase() ?? 'U'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-white">{user?.username ?? 'User'}</h1>
            <RoleBadge role="trader" />
          </div>
          <div className="text-sm text-text-secondary">{user?.email ?? '—'}</div>
          <div className="text-xs text-text-muted mt-1">Member since {joined}</div>
        </div>

        {/* Balance pill */}
        <div className="shrink-0 text-right">
          <div className="text-xs text-text-muted mb-0.5 uppercase tracking-widest">Account Balance</div>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(user?.balance ?? 0)}</div>
          <div className="text-xs text-text-secondary mt-0.5">Paper Trading</div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }
              : { color: '#6b8099', border: '1px solid transparent' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Balance" value={formatCurrency(user?.balance ?? 0)} sub="Paper account" />
            <StatBox label="Total Trades" value={String(totalTrades)} sub="All time" />
            <StatBox
              label="P&L (Open)"
              value={`${pl >= 0 ? '+' : ''}${formatCurrency(pl)}`}
              sub="Unrealised"
              color={pl >= 0 ? 'text-bull' : 'text-bear'}
            />
            <StatBox
              label="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              sub="Filled orders"
              color={winRate >= 50 ? 'text-bull' : 'text-bear'}
            />
          </div>

          {/* Account details */}
          <Card title="Account Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="User ID" value={user?.id ?? '—'} readOnly />
              <Field label="Username" value={user?.username ?? '—'} readOnly />
              <Field label="Email Address" value={user?.email ?? '—'} readOnly />
              <Field label="Account Type" value="Paper Trading" readOnly />
              <Field label="Status" value="Active" readOnly />
              <Field label="Member Since" value={joined} readOnly />
            </div>
          </Card>

          {/* Recent activity */}
          <Card title="Recent Activity">
            <div className="space-y-3">
              {[
                { icon: '🟢', text: 'Logged in successfully',         time: 'Just now' },
                { icon: '📈', text: 'Viewed EUR/USD chart',           time: '2 min ago' },
                { icon: '📋', text: 'Checked portfolio summary',      time: '5 min ago' },
                { icon: '🔔', text: 'Price alert triggered: BTC/USDT',time: '1 hr ago' },
                { icon: '💳', text: 'Account balance reviewed',       time: '3 hrs ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 rounded-lg px-3"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="flex-1 text-sm text-text-secondary">{item.text}</span>
                  <span className="text-xs text-text-muted shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── SECURITY ────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="grid grid-cols-1 gap-5">
          <Card title="Change Password">
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <Field label="Current Password" type="password" value={curPwd} onChange={setCurPwd} />
              <Field label="New Password" type="password" value={newPwd} onChange={setNewPwd} hint="Minimum 8 characters" />
              <Field label="Confirm New Password" type="password" value={confPwd} onChange={setConfPwd} />
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50 mt-1"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
              >
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </Card>

          <Card title="Two-Factor Authentication">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <div className="text-sm font-medium text-text-primary mb-0.5">Authenticator App</div>
                <div className="text-xs text-text-muted">Add an extra layer of security to your account</div>
              </div>
              <Toggle active={twoFA} onToggle={() => toggle(twoFA, setTwoFA, '2FA')} />
            </div>
          </Card>

          <Card title="Active Sessions">
            {[
              { device: 'Windows — Chrome', location: 'Current session', time: 'Active now', current: true },
              { device: 'iPhone — Safari',  location: 'Last active',     time: '2 days ago', current: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 rounded-lg px-3 mb-2 last:mb-0"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.current ? 'bg-bull animate-pulse' : 'bg-text-muted'}`} />
                  <div>
                    <div className="text-sm font-medium text-text-primary">{s.device}</div>
                    <div className="text-xs text-text-muted">{s.time}</div>
                  </div>
                </div>
                {!s.current && (
                  <button className="text-xs text-bear hover:opacity-80 transition-opacity px-3 py-1 rounded"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                    onClick={() => showToast('Session revoked', 'ok')}>
                    Revoke
                  </button>
                )}
                {s.current && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                    Current
                  </span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── SETTINGS ────────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 gap-5">
          <Card title="Notifications">
            <div className="space-y-4 max-w-md">
              {[
                { label: 'Email Notifications', desc: 'Receive account updates via email', val: emailNotifs, set: setEmailNotifs },
                { label: 'Trade Alerts',         desc: 'Get notified when orders are filled', val: tradeAlerts, set: setTradeAlerts },
                { label: 'Price Alerts',         desc: 'Alerts when watchlist prices move',  val: priceAlerts, set: setPriceAlerts },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                  <Toggle active={item.val} onToggle={() => toggle(item.val, item.set, item.label)} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Default Chart Interval</label>
                <select className="w-full rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {['1m','5m','15m','1h','4h','1d'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Default Order Type</label>
                <select className="w-full rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Market','Limit','Stop'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Currency Display</label>
                <select className="w-full rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {['USD','EUR','GBP'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Timezone</label>
                <select className="w-full rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {['UTC','UTC+1','UTC+2','UTC-5','UTC-8'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <button
              className="mt-5 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
              onClick={() => showToast('Preferences saved', 'ok')}
            >
              Save Preferences
            </button>
          </Card>

          <Card title="Danger Zone">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center justify-between py-3 px-4 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <div className="text-sm font-medium text-text-primary">Reset Paper Balance</div>
                  <div className="text-xs text-text-muted">Restore balance to $100,000</div>
                </div>
                <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-bear transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => showToast('Balance reset to $100,000', 'ok')}>
                  Reset
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative shrink-0 w-10 h-5.5 rounded-full transition-colors focus:outline-none"
      style={{
        width: '40px', height: '22px',
        background: active ? '#0ea5e9' : 'rgba(255,255,255,0.1)',
        border: active ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow transition-all"
        style={{
          width: '16px', height: '16px',
          left: active ? '21px' : '2px',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}
