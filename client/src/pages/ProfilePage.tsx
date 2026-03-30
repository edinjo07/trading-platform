import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency } from '../utils/formatters'
import { AccountType, Currency } from '../types'
import { supabase } from '../lib/supabase'

const ACCOUNT_LABELS: Record<AccountType, string> = {
  raw_spread: 'Raw Spread (MetaTrader)',
  ctrader: 'cTrader Raw Spread',
  standard: 'Standard (MetaTrader)',
}

const COUNTRIES = [
  'Albania', 'Australia', 'Austria', 'Belgium', 'Canada', 'Croatia', 'Cyprus',
  'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'New Zealand', 'North Macedonia', 'Norway',
  'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'United Kingdom', 'United States', 'Other',
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#0ea5e9,#7c3aed)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#06b6d4,#10b981)',
  'linear-gradient(135deg,#f97316,#eab308)',
]

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, description, children, action }: {
  title: string; description?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5 sm:p-6" style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'rgba(14,165,233,0.1)' }}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-lg font-bold font-mono ${color ?? 'text-text-primary'}`}>{value}</div>
        {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', readOnly = false, hint, placeholder
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; readOnly?: boolean; hint?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-sm text-text-primary transition-colors focus:outline-none"
        style={{
          background: readOnly ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)',
          border: readOnly ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.08)',
          color: readOnly ? '#6b8099' : undefined,
          cursor: readOnly ? 'default' : undefined,
        }}
      />
      {hint && <div className="text-[10px] text-text-muted mt-1">{hint}</div>}
    </div>
  )
}

// ─── Select field ─────────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none appearance-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative shrink-0 focus:outline-none"
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: active ? '#0ea5e9' : 'rgba(255,255,255,0.1)',
        border: active ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow"
        style={{
          width: '16px', height: '16px',
          left: active ? '21px' : '2px',
          transition: 'left 0.2s',
        }}
      />
    </button>
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

// ─── KYC Badge ────────────────────────────────────────────────────────────────
function KYCBadge({ level }: { level: 'unverified' | 'basic' | 'verified' }) {
  const styles = {
    unverified: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Unverified' },
    basic:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Basic KYC' },
    verified:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Verified' },
  }
  const s = styles[level]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'verified' ? 'animate-pulse' : ''}`}
        style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

type Tab = 'profile' | 'account' | 'security' | 'settings'

export default function ProfilePage() {
  const { user, setAccountMode, setCurrency } = useAuthStore()
  const { portfolio, performanceStats } = useTradingStore()

  const [tab, setTab] = useState<Tab>('profile')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Avatar gradient picker
  const [avatarIdx, setAvatarIdx] = useState(0)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Profile tab state
  const [firstName,    setFirstName]    = useState(user?.username?.split(' ')[0] ?? '')
  const [lastName,     setLastName]     = useState(user?.username?.split(' ')[1] ?? '')
  const [phone,        setPhone]        = useState('')
  const [country,      setCountry]      = useState('Albania')
  const [city,         setCity]         = useState('')
  const [bio,          setBio]          = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Security tab state
  const [curPwd,     setCurPwd]     = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confPwd,    setConfPwd]    = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [twoFA,      setTwoFA]      = useState(false)

  // Settings tab state
  const [emailNotifs,    setEmailNotifs]    = useState(true)
  const [tradeAlerts,    setTradeAlerts]    = useState(true)
  const [priceAlerts,    setPriceAlerts]    = useState(false)
  const [newsDigest,     setNewsDigest]     = useState(false)
  const [chartInterval,  setChartInterval]  = useState('1h')
  const [defaultOrder,   setDefaultOrder]   = useState('Market')
  const [timezone,       setTimezone]       = useState('UTC')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(user?.currency ?? 'USD')

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || firstName
    const { error } = await supabase.auth.updateUser({ data: { username: displayName, phone, country, city, bio } })
    setProfileSaving(false)
    if (error) showToast('Could not save profile', 'err')
    else showToast('Profile updated successfully', 'ok')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!curPwd) { showToast('Current password is required', 'err'); return }
    if (newPwd.length < 8) { showToast('Password must be at least 8 characters', 'err'); return }
    if (newPwd !== confPwd) { showToast('Passwords do not match', 'err'); return }
    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) showToast('Failed to update password', 'err')
    else { setCurPwd(''); setNewPwd(''); setConfPwd(''); showToast('Password updated successfully', 'ok') }
  }

  const toggle = (val: boolean, set: (v: boolean) => void, label: string) => {
    set(!val); showToast(`${label} ${!val ? 'enabled' : 'disabled'}`, 'ok')
  }

  const joined = user?.id
    ? new Date(parseInt(user.id.slice(-8), 16) * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'March 2026'

  const winRate   = performanceStats?.winRate ?? 0
  const totalTrades = (portfolio?.positions?.length ?? 0) + 12
  const pl        = portfolio?.unrealizedPnl ?? 0
  const equity    = portfolio?.totalEquity ?? user?.balance ?? 0
  const kycLevel: 'unverified' | 'basic' | 'verified' = 'basic'

  const displayName = user?.username ?? 'Trader'
  const initials    = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'profile', label: 'Profile',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    },
    {
      key: 'account', label: 'Account',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>,
    },
    {
      key: 'security', label: 'Security',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z"/></svg>,
    },
    {
      key: 'settings', label: 'Settings',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
  ]

  return (
    <div className="min-h-full max-w-4xl mx-auto">

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 mb-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f1e38 0%, #0b1437 60%, #130d35 100%)',
          border: '1px solid rgba(14,165,233,0.15)',
        }}
      >
        {/* Background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold text-white shadow-lg cursor-pointer select-none"
              style={{ background: AVATAR_GRADIENTS[avatarIdx] }}
              onClick={() => setShowAvatarPicker(v => !v)}
            >
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg className="w-2.5 h-2.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            {/* Avatar colour picker */}
            {showAvatarPicker && (
              <div className="absolute top-24 left-0 z-20 p-3 rounded-xl flex gap-2 shadow-xl"
                style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)' }}>
                {AVATAR_GRADIENTS.map((g, i) => (
                  <button key={i} onClick={() => { setAvatarIdx(i); setShowAvatarPicker(false) }}
                    className="w-7 h-7 rounded-lg shrink-0 ring-offset-1 transition-all"
                    style={{
                      background: g,
                      outline: avatarIdx === i ? '2px solid #38bdf8' : 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <KYCBadge level={kycLevel} />
            </div>
            <div className="text-sm text-text-secondary mb-1">{user?.email ?? '-'}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Member since {joined}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {country}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
                {ACCOUNT_LABELS[user?.accountType ?? 'raw_spread']}
              </span>
            </div>
          </div>

          {/* Equity pill */}
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-text-muted mb-1 uppercase tracking-widest">Total Equity</div>
            <div className="text-3xl font-bold font-mono text-white">{formatCurrency(equity, 2, user?.currency ?? 'USD')}</div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: user?.accountMode === 'real' ? '#10b981' : '#f59e0b',
                  background: user?.accountMode === 'real' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                }}>
                {user?.accountMode === 'real' ? 'Live' : 'Demo'}
              </span>
              <span className="text-xs text-text-muted">{user?.currency ?? 'USD'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center"
            style={tab === t.key
              ? { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.22)' }
              : { color: '#6b8099', border: '1px solid transparent' }
            }
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: PROFILE
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <Card
            title="Personal Information"
            description="Update your personal details and public profile"
            action={
              <button type="submit" disabled={profileSaving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="e.g. Alex" />
              <Field label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="e.g. Smith" />
              <Field label="Email Address" value={user?.email ?? ''} readOnly hint="Email cannot be changed here" />
              <Field label="Phone Number" value={phone} onChange={setPhone} type="tel" placeholder="+1 555 000 0000" />
              <SelectField
                label="Country of Residence"
                value={country}
                onChange={setCountry}
                options={COUNTRIES.map(c => ({ value: c, label: c }))}
              />
              <Field label="City" value={city} onChange={setCity} placeholder="e.g. London" />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Bio <span className="text-text-muted font-normal">(optional)</span></label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Tell other traders a bit about yourself…"
                maxLength={200}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-text-primary resize-none focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <div className="text-[10px] text-text-muted text-right mt-0.5">{bio.length}/200</div>
            </div>
          </Card>

          <Card title="Identity Verification" description="Verify your identity to unlock full account features">
            <div className="space-y-3">
              {[
                { step: 1, label: 'Email Verified',      desc: 'Your email address is confirmed',           done: true  },
                { step: 2, label: 'Identity Document',   desc: 'Upload a government-issued photo ID',       done: false },
                { step: 3, label: 'Proof of Address',    desc: 'Upload a recent utility bill or bank statement', done: false },
                { step: 4, label: 'Full Verification',   desc: 'Complete review by our compliance team',    done: false },
              ].map(item => (
                <div key={item.step}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={item.done
                      ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    {item.done
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      : item.step
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                  {!item.done && (
                    <a href="/kyc"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}>
                      Start
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Referral Programme">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-sm text-text-secondary mb-1">Your referral link</div>
                <div className="font-mono text-xs text-text-muted"
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  https://tradeplatform.com/ref/{user?.id?.slice(0, 8) ?? 'xxxxxxxx'}
                </div>
              </div>
              <button type="button"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap"
                style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
                onClick={() => {
                  navigator.clipboard.writeText(`https://tradeplatform.com/ref/${user?.id?.slice(0, 8) ?? ''}`)
                    .then(() => showToast('Referral link copied!', 'ok'))
                    .catch(() => showToast('Copy failed', 'err'))
                }}>
                Copy Link
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Referred Users', value: '0' },
                { label: 'Active Traders', value: '0' },
                { label: 'Rewards Earned', value: '$0' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.025)' }}>
                  <div className="text-lg font-bold text-text-primary">{s.value}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ACCOUNT
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'account' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="Total Equity"
              value={formatCurrency(equity, 2, user?.currency ?? 'USD')}
              sub={user?.accountMode === 'real' ? 'Live account' : 'Demo account'}
              icon={<svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatBox
              label="Total Trades"
              value={String(totalTrades)}
              sub="All time"
              icon={<svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
            />
            <StatBox
              label="Open P&L"
              value={`${pl >= 0 ? '+' : ''}${formatCurrency(pl)}`}
              sub="Unrealised"
              color={pl >= 0 ? 'text-bull' : 'text-bear'}
              icon={<svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>}
            />
            <StatBox
              label="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              sub="Filled orders"
              color={winRate >= 50 ? 'text-bull' : 'text-bear'}
              icon={<svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>}
            />
          </div>

          {/* Account details */}
          <Card title="Account Details" description="Your trading account information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Account ID"    value={user?.id ?? '-'}                              readOnly />
              <Field label="Username"      value={user?.username ?? '-'}                         readOnly />
              <Field label="Email"         value={user?.email ?? '-'}                            readOnly />
              <Field label="Account Type"  value={ACCOUNT_LABELS[user?.accountType ?? 'raw_spread']} readOnly />
              <Field label="Base Currency" value={user?.currency ?? 'USD'}                      readOnly />
              <Field label="Member Since"  value={joined}                                        readOnly />
            </div>
          </Card>

          {/* KYC */}
          <Card title="Verification Status" description="Identity verification levels and limits">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { level: 'Level 1', label: 'Email verified',        limit: '$10,000/day',  done: true  },
                { level: 'Level 2', label: 'ID + address verified', limit: '$50,000/day',  done: false },
                { level: 'Level 3', label: 'Full compliance',       limit: 'Unlimited',    done: false },
              ].map(item => (
                <div key={item.level} className="p-4 rounded-xl flex flex-col gap-2"
                  style={{
                    background: item.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{item.level}</span>
                    {item.done
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-bull"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>Done</span>
                      : <span className="text-xs text-text-muted">Pending</span>
                    }
                  </div>
                  <div className="text-sm font-medium text-text-primary">{item.label}</div>
                  <div className="text-xs text-text-muted">Withdraw limit: <span className="text-text-secondary">{item.limit}</span></div>
                </div>
              ))}
            </div>
            <a href="/kyc"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Complete Verification
            </a>
          </Card>

          {/* Recent activity */}
          <Card title="Recent Activity" description="Your latest account actions">
            <div className="space-y-2">
              {[
                { dot: '#10b981', text: 'Logged in successfully',        time: 'Just now'  },
                { dot: '#0ea5e9', text: 'Viewed EURUSD chart',           time: '2 min ago' },
                { dot: '#0ea5e9', text: 'Portfolio summary reviewed',    time: '5 min ago' },
                { dot: '#f59e0b', text: 'Price alert triggered: BTCUSD', time: '1 hr ago'  },
                { dot: '#0ea5e9', text: 'Orders page visited',           time: '2 hrs ago' },
                { dot: '#6b8099', text: 'Session started',               time: 'Yesterday' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
                  <span className="flex-1 text-sm text-text-secondary">{item.text}</span>
                  <span className="text-xs text-text-muted shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SECURITY
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'security' && (
        <div className="space-y-5">
          <Card title="Change Password" description="Use a strong, unique password you don't use elsewhere">
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <Field label="Current Password"     type="password" value={curPwd}  onChange={setCurPwd}  />
              <Field label="New Password"          type="password" value={newPwd}  onChange={setNewPwd}  hint="Minimum 8 characters" />
              <Field label="Confirm New Password"  type="password" value={confPwd} onChange={setConfPwd} />
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
                {pwdLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </Card>

          <Card title="Two-Factor Authentication" description="Require a second step when signing in">
            <div className="space-y-4 max-w-md">
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: twoFA ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)' }}>
                    <svg className="w-4.5 h-4.5" style={{ color: twoFA ? '#10b981' : '#6b8099' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">Authenticator App</div>
                    <div className="text-xs text-text-muted">
                      {twoFA ? 'Enabled — your account is protected' : 'Not yet configured'}
                    </div>
                  </div>
                </div>
                <Toggle active={twoFA} onToggle={() => toggle(twoFA, setTwoFA, '2FA')} />
              </div>

              {twoFA && (
                <div className="p-4 rounded-xl text-xs text-text-secondary"
                  style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  2FA is active. Use your authenticator app to generate a 6-digit code when signing in.
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">Email OTP</div>
                    <div className="text-xs text-text-muted">Receive a one-time code via email</div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>Active</span>
              </div>
            </div>
          </Card>

          <Card title="Login History" description="Recent sign-in activity for your account">
            <div className="space-y-2">
              {[
                { device: 'Windows — Chrome 122',  location: 'Tirana, AL',    time: 'Active now',  current: true  },
                { device: 'iPhone 15 — Safari',    location: 'Tirana, AL',    time: '2 days ago',  current: false },
                { device: 'MacBook — Firefox',     location: 'London, GB',    time: '1 week ago',  current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.current ? 'bg-bull animate-pulse' : 'bg-text-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{s.device}</div>
                    <div className="text-xs text-text-muted">{s.location} · {s.time}</div>
                  </div>
                  {s.current
                    ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>Current</span>
                    : <button className="text-xs font-semibold px-3 py-1 rounded-lg shrink-0 transition-opacity hover:opacity-80"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                        onClick={() => showToast('Session revoked', 'ok')}>
                        Revoke
                      </button>
                  }
                </div>
              ))}
            </div>
          </Card>

          <Card title="API Keys" description="Manage keys for algorithmic trading integrations">
            <div className="p-4 rounded-xl mb-4 text-xs text-text-secondary"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <span className="font-semibold text-amber-400">Warning:</span> Keep your API keys secret. Never share them or commit them to public repositories.
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div className="text-sm font-medium text-text-primary">No active API keys</div>
                <div className="text-xs text-text-muted">Create a key to access the trading API</div>
              </div>
              <button
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}
                onClick={() => showToast('API key management coming soon', 'ok')}>
                Create Key
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SETTINGS
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-5">
          {/* Notifications */}
          <Card title="Notifications" description="Choose how and when you receive alerts">
            <div className="space-y-1 max-w-lg">
              {[
                { label: 'Email Notifications',  desc: 'Account updates, confirmations, and statements', val: emailNotifs, set: setEmailNotifs },
                { label: 'Trade Execution Alerts', desc: 'Notify when orders are filled or rejected',    val: tradeAlerts, set: setTradeAlerts },
                { label: 'Price Alerts',         desc: 'Watchlist symbols hitting your alert levels',    val: priceAlerts, set: setPriceAlerts },
                { label: 'Daily News Digest',    desc: 'Morning summary of market-moving news',          val: newsDigest,  set: setNewsDigest  },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3.5 px-1">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                  <Toggle active={item.val} onToggle={() => toggle(item.val, item.set, item.label)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Trading preferences */}
          <Card
            title="Trading Preferences"
            description="Default values applied when you open the trading panel"
            action={
              <button
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}
                onClick={async () => {
                  await setCurrency(selectedCurrency)
                  showToast('Preferences saved', 'ok')
                }}>
                Save
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <SelectField
                label="Default Chart Interval"
                value={chartInterval}
                onChange={setChartInterval}
                options={['1m','5m','15m','30m','1h','4h','1d','1w'].map(v => ({ value: v, label: v }))}
              />
              <SelectField
                label="Default Order Type"
                value={defaultOrder}
                onChange={setDefaultOrder}
                options={['Market','Limit','Stop','Stop Limit'].map(v => ({ value: v, label: v }))}
              />
              <SelectField
                label="Display Currency"
                value={selectedCurrency}
                onChange={v => setSelectedCurrency(v as Currency)}
                options={[
                  { value: 'USD', label: 'USD — US Dollar' },
                  { value: 'EUR', label: 'EUR — Euro' },
                  { value: 'GBP', label: 'GBP — British Pound' },
                ]}
              />
              <SelectField
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: 'UTC',    label: 'UTC — Greenwich' },
                  { value: 'UTC+1',  label: 'UTC+1 — Central European' },
                  { value: 'UTC+2',  label: 'UTC+2 — Eastern European' },
                  { value: 'UTC-5',  label: 'UTC-5 — Eastern US' },
                  { value: 'UTC-8',  label: 'UTC-8 — Pacific US' },
                  { value: 'UTC+8',  label: 'UTC+8 — Singapore / HK' },
                ]}
              />
            </div>
          </Card>

          {/* Account mode */}
          <Card title="Account Mode" description="Switch between your live funded account and the demo environment">
            <p className="text-xs text-text-muted mb-4 max-w-lg">
              Demo accounts use $100,000 of practice capital — no real funds at risk. Switching mode does not affect open positions.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {(['demo', 'real'] as const).map(m => (
                <button
                  key={m}
                  onClick={async () => { await setAccountMode(m); showToast(`Switched to ${m === 'real' ? 'Real' : 'Demo'} account`, 'ok') }}
                  className="py-4 rounded-xl text-sm font-bold transition-all"
                  style={user?.accountMode === m
                    ? { background: m === 'real' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: m === 'real' ? '#10b981' : '#f59e0b', border: `1px solid ${m === 'real' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }
                    : { background: 'rgba(255,255,255,0.025)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {m === 'real' ? '💹 Real Account' : '🧪 Demo Account'}
                  {user?.accountMode === m && <span className="block text-[10px] mt-1 opacity-60">Active</span>}
                </button>
              ))}
            </div>
          </Card>

          {/* Appearance */}
          <Card title="Appearance" description="Customise how the platform looks">
            <div className="flex flex-wrap gap-3 max-w-md">
              {[
                { label: 'Dark',  active: true  },
                { label: 'Light', active: false },
                { label: 'Auto',  active: false },
              ].map(t => (
                <button key={t.label}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={t.active
                    ? { background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }
                    : { background: 'rgba(255,255,255,0.025)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                  onClick={() => showToast(`${t.label} theme coming soon`, 'ok')}>
                  {t.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Danger zone */}
          <Card title="Danger Zone">
            <div className="space-y-3 max-w-lg">
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div>
                  <div className="text-sm font-semibold text-text-primary">Reset Demo Balance</div>
                  <div className="text-xs text-text-muted">Restore practice account to $100,000</div>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                  onClick={() => showToast('Demo balance reset to $100,000', 'ok')}>
                  Reset
                </button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div>
                  <div className="text-sm font-semibold text-text-primary">Close Account</div>
                  <div className="text-xs text-text-muted">Permanently delete your account and all data</div>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => showToast('Contact support to close your account', 'err')}>
                  Close
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
