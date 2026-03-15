import React, { useState } from 'react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.05)' }}>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {desc && <p className="text-xs text-text-secondary mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0 min-w-[200px]">{children}</div>
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
      style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(56,189,248,0.12)' }} />
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: value ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(107,128,153,0.3)', minHeight: '20px' }}>
      <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}

export default function SiteSettingsPage() {
  const [siteName, setSiteName] = useState('TradeX Platform')
  const [siteUrl, setSiteUrl]   = useState('https://tradex.io')
  const [supportEmail, setSupportEmail] = useState('support@tradex.io')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [demoAccounts, setDemoAccounts] = useState(true)
  const [twoFAEnabled, setTwoFAEnabled] = useState(true)
  const [emailVerify, setEmailVerify] = useState(true)
  const [kycRequired, setKycRequired] = useState(true)
  const [timezone, setTimezone] = useState('UTC')
  const [currency, setCurrency] = useState('USD')
  const [logoUrl, setLogoUrl] = useState('/assets/logo.svg')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Site Settings</h1>
          <p className="text-xs text-text-secondary mt-0.5">Configure global platform settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* General */}
        <Section title="General Settings">
          <Field label="Site Name" desc="Display name of the platform">
            <Input value={siteName} onChange={setSiteName} />
          </Field>
          <Field label="Site URL" desc="Primary domain of the platform">
            <Input value={siteUrl} onChange={setSiteUrl} />
          </Field>
          <Field label="Support Email" desc="Default contact email">
            <Input value={supportEmail} onChange={setSupportEmail} />
          </Field>
          <Field label="Logo URL" desc="Path to the platform logo file">
            <Input value={logoUrl} onChange={setLogoUrl} />
          </Field>
          <Field label="Default Timezone" desc="Server and report timezone">
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(56,189,248,0.12)', colorScheme: 'dark' }}>
              {['UTC', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC-5', 'UTC-8'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Default Currency" desc="Base currency for the platform">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400 w-full"
              style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(56,189,248,0.12)', colorScheme: 'dark' }}>
              {['USD', 'EUR', 'GBP', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </Section>

        {/* Platform controls */}
        <Section title="Platform Controls">
          <Field label="Maintenance Mode" desc="Temporarily disable public access to the site">
            <Toggle value={maintenanceMode} onChange={setMaintenanceMode} />
          </Field>
          <Field label="Open Registration" desc="Allow new users to register">
            <Toggle value={registrationOpen} onChange={setRegistrationOpen} />
          </Field>
          <Field label="Demo Accounts" desc="Allow users to open demo trading accounts">
            <Toggle value={demoAccounts} onChange={setDemoAccounts} />
          </Field>
          <Field label="Two-Factor Authentication" desc="Require 2FA for all admin logins">
            <Toggle value={twoFAEnabled} onChange={setTwoFAEnabled} />
          </Field>
          <Field label="Email Verification" desc="Require email verification on signup">
            <Toggle value={emailVerify} onChange={setEmailVerify} />
          </Field>
          <Field label="Require KYC" desc="Block trading until KYC is verified">
            <Toggle value={kycRequired} onChange={setKycRequired} />
          </Field>
        </Section>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 rounded-lg text-sm text-text-secondary transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Reset to Defaults
        </button>
        <button className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
