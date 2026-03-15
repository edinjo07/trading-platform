import React, { useState } from 'react'

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {desc && <p className="text-xs text-text-secondary mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: value ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(107,128,153,0.3)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 text-xs font-mono text-text-primary rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
        style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(56,189,248,0.12)' }}
      />
      {suffix && <span className="text-xs text-text-secondary">{suffix}</span>}
    </div>
  )
}

export default function WithdrawSettingsPage() {
  const [minAmount, setMinAmount] = useState(10)
  const [maxAmount, setMaxAmount] = useState(50000)
  const [fee, setFee] = useState(1.5)
  const [autoApprove, setAutoApprove] = useState(false)
  const [autoApproveLimit, setAutoApproveLimit] = useState(500)
  const [requireKyc, setRequireKyc] = useState(true)
  const [dailyLimit, setDailyLimit] = useState(3)
  const [bankEnabled, setBankEnabled] = useState(true)
  const [cryptoEnabled, setCryptoEnabled] = useState(true)
  const [skrillEnabled, setSkrillEnabled] = useState(true)
  const [netellerEnabled, setNetellerEnabled] = useState(true)

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary">Withdraw Settings</h1>
        <p className="text-xs text-text-secondary mt-0.5">Configure withdrawal rules, limits and payment methods</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Limits */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Withdrawal Limits</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Minimum Amount" desc="Minimum single withdrawal amount">
              <NumberInput value={minAmount} onChange={setMinAmount} suffix="USD" />
            </SettingRow>
            <SettingRow label="Maximum Amount" desc="Maximum single withdrawal amount">
              <NumberInput value={maxAmount} onChange={setMaxAmount} suffix="USD" />
            </SettingRow>
            <SettingRow label="Withdrawal Fee" desc="Percentage fee applied to withdrawals">
              <NumberInput value={fee} onChange={setFee} suffix="%" />
            </SettingRow>
            <SettingRow label="Daily Request Limit" desc="Maximum withdrawals per user per day">
              <NumberInput value={dailyLimit} onChange={setDailyLimit} suffix="req/day" />
            </SettingRow>
          </div>
        </div>

        {/* Approvals */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Approval Rules</h2>
          </div>
          <div className="px-5">
            <SettingRow label="Auto-Approve Withdrawals" desc="Automatically approve withdrawals below the limit">
              <Toggle value={autoApprove} onChange={setAutoApprove} />
            </SettingRow>
            {autoApprove && (
              <SettingRow label="Auto-Approve Limit" desc="Max amount eligible for automatic approval">
                <NumberInput value={autoApproveLimit} onChange={setAutoApproveLimit} suffix="USD" />
              </SettingRow>
            )}
            <SettingRow label="Require KYC Verification" desc="Only allow withdrawals from KYC-verified users">
              <Toggle value={requireKyc} onChange={setRequireKyc} />
            </SettingRow>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-xl overflow-hidden xl:col-span-2" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Available Payment Methods</h2>
          </div>
          <div className="px-5 grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            {[
              { label: 'Bank Wire',  value: bankEnabled,     set: setBankEnabled },
              { label: 'Crypto',     value: cryptoEnabled,   set: setCryptoEnabled },
              { label: 'Skrill',     value: skrillEnabled,   set: setSkrillEnabled },
              { label: 'Neteller',   value: netellerEnabled, set: setNetellerEnabled },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(56,189,248,0.08)' }}>
                <span className="text-sm text-text-primary">{m.label}</span>
                <Toggle value={m.value} onChange={m.set} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Reset
        </button>
        <button className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
