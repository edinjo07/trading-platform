import React, { useState } from 'react'

interface Plan { id: string; name: string; price: string; period: string; features: string[]; color: string; popular?: boolean; active: boolean }

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$0',
    period: '/mo',
    color: '#6b8099',
    active: true,
    features: ['5 Instruments', '1:100 Leverage', 'Standard Spreads', 'Email Support', '1 Account'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$29',
    period: '/mo',
    color: '#38bdf8',
    popular: true,
    active: true,
    features: ['50 Instruments', '1:500 Leverage', 'Raw Spreads + $3 comm.', 'Live Chat Support', '3 Accounts', 'API Access'],
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '$99',
    period: '/mo',
    color: '#a78bfa',
    active: true,
    features: ['Unlimited Instruments', '1:1000 Leverage', 'Raw 0.0 pip Spreads', '24/7 Priority Support', 'Unlimited Accounts', 'Full API Access', 'Free VPS', 'Dedicated Manager'],
  },
  {
    id: 'institutional',
    name: 'Institutional',
    price: 'Custom',
    period: '',
    color: '#00c878',
    active: true,
    features: ['All Pro Features', 'Custom Leverage', 'White-Label Solution', 'Dedicated Server', 'SLA Guarantee', 'Custom Integration'],
  },
]

function FeatureCheck() {
  return (
    <svg className="w-3.5 h-3.5 text-bull shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function PricingPlanPage() {
  const [activePlans, setActivePlans] = useState(plans.map(p => ({ ...p })))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Pricing Plans</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage subscription tiers and feature access control</p>
        </div>
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activePlans.map(plan => (
          <div
            key={plan.id}
            className="relative rounded-xl overflow-hidden"
            style={{
              background: '#0c1220',
              border: `1px solid ${plan.popular ? plan.color + '40' : 'rgba(56,189,248,0.08)'}`,
            }}
          >
            {plan.popular && (
              <div className="absolute top-3 right-3 text-2xs font-bold px-2 py-0.5 rounded-full" style={{ background: plan.color + '20', color: plan.color, fontSize: '10px' }}>
                POPULAR
              </div>
            )}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: plan.color }}>{plan.name}</p>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-2xl font-bold text-text-primary font-mono">{plan.price}</span>
                <span className="text-xs text-text-secondary mb-1">{plan.period}</span>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <FeatureCheck />
                  <span className="text-xs text-text-secondary">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 flex flex-col gap-2">
              <button
                className="w-full py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}30` }}
              >
                Edit Plan
              </button>
              <button
                className="w-full py-1.5 rounded-lg text-xs transition-colors"
                style={{ background: 'rgba(255,48,71,0.06)', color: plan.active ? '#ff3047' : '#00c878', border: '1px solid rgba(255,48,71,0.08)' }}
                onClick={() => setActivePlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !p.active } : p))}
              >
                {plan.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
