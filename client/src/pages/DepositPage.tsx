import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency } from '../utils/formatters'
import { depositDemo } from '../api/accounts'
import type { Currency } from '../types'

type Method = 'bank' | 'card' | 'crypto'

/* ── Real payment brand marks ─────────────────────────────────────────────── */

/** Official simplified Mastercard mark — red/orange interlocking circles */
export function MastercardMark({ h = 20 }: { h?: number }) {
  const w = h * 1.6
  return (
    <svg width={w} height={h} viewBox="0 0 48 30" aria-label="Mastercard">
      <circle cx="19" cy="15" r="14" fill="#EB001B" />
      <circle cx="29" cy="15" r="14" fill="#F79E1B" />
      <path d="M24 3.9a14 14 0 010 22.2 14 14 0 010-22.2z" fill="#FF5F00" />
    </svg>
  )
}

/** Visa wordmark on its brand blue */
export function VisaMark({ h = 20 }: { h?: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: h, padding: '0 7px', borderRadius: 4, background: '#fff',
      fontStyle: 'italic', fontWeight: 900, fontSize: h * 0.52, letterSpacing: '-0.02em',
      color: '#1434CB', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1,
    }} aria-label="Visa">VISA</span>
  )
}

const COIN_CDN = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color'
const CRYPTO_ICON: Record<string, string> = {
  'USDT (TRC-20)': 'usdt', 'USDT (ERC-20)': 'usdt',
  'Bitcoin (BTC)': 'btc', 'Ethereum (ETH)': 'eth', 'BNB (BEP-20)': 'bnb',
}

const METHODS: { id: Method; label: string; desc: string; fee: string; time: string; icon: React.ReactNode }[] = [
  {
    id: 'bank',
    label: 'Bank Transfer',
    desc: 'Wire / SEPA transfer directly from your bank account.',
    fee: 'Free',
    time: '1–3 business days',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path d="M3 10h18M3 10V6l9-3 9 3v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8" />
        <path d="M8 14h.01M12 14h.01M16 14h.01" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    desc: 'Instant deposit using Visa or Mastercard.',
    fee: '2.5%',
    time: 'Instant',
    icon: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <MastercardMark h={20} />
        <VisaMark h={20} />
      </span>
    ),
  },
  {
    id: 'crypto',
    label: 'Crypto Wallet',
    desc: 'Deposit USDT, BTC, ETH or other supported coins.',
    fee: 'Network fee',
    time: '10–30 min',
    icon: (
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {['btc', 'eth', 'usdt'].map((c, i) => (
          <img key={c} src={`${COIN_CDN}/${c}.svg`} alt={c.toUpperCase()} width={22} height={22}
            style={{ borderRadius: '50%', marginLeft: i > 0 ? -6 : 0, position: 'relative', zIndex: 3 - i, border: '1.5px solid rgba(0,0,0,0.4)' }} />
        ))}
      </span>
    ),
  },
]

const PRESET_AMOUNTS = [250, 500, 1000, 2500, 5000, 10000]

const CRYPTO_OPTIONS = ['USDT (TRC-20)', 'USDT (ERC-20)', 'Bitcoin (BTC)', 'Ethereum (ETH)', 'BNB (BEP-20)']

export default function DepositPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { portfolio, loadPortfolio } = useTradingStore()
  const currency = (user?.currency ?? 'USD') as Currency
  const balance = portfolio?.cashBalance ?? user?.balance ?? 0

  const [method, setMethod]   = useState<Method>('bank')
  const [amount, setAmount]   = useState('')
  const [crypto, setCrypto]   = useState(CRYPTO_OPTIONS[0])
  const [step, setStep]       = useState<'form' | 'confirm' | 'done'>('form')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCVC, setCardCVC]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const parsedAmount = parseFloat(amount.replace(/,/g, ''))
  const isValid = !isNaN(parsedAmount) && parsedAmount >= 10

  const selectedMethod = METHODS.find(m => m.id === method)!

  const feeAmount = method === 'card' ? (parsedAmount * 0.025) : 0
  const totalDebit = isValid ? parsedAmount + feeAmount : 0

  const handleSubmit = async () => {
    if (!isValid) return
    if (step === 'form') { setStep('confirm'); return }
    // Confirm step → credit the demo account (fires a deposit notification)
    setSubmitting(true); setError('')
    try {
      await depositDemo(currency, parsedAmount)
      await loadPortfolio()
      setStep('done')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Deposit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="card p-8 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(24,201,138,0.12)', border: '2px solid rgba(24,201,138,0.3)' }}>
            <svg className="w-8 h-8 text-bull" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Deposit Processed</h2>
            <p className="text-text-muted text-sm mt-1">
              Your deposit of <span className="text-bull font-semibold">{formatCurrency(parsedAmount)}</span> has been credited to your account.
            </p>
          </div>
          <div className="w-full rounded-xl p-4 text-sm space-y-2" style={{ background: 'rgba(var(--ink),0.03)', border: '1px solid rgba(var(--ink),0.06)' }}>
            <div className="flex justify-between"><span className="text-text-muted">Method</span><span className="text-text-primary font-medium">{selectedMethod.label}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="text-text-primary font-mono font-semibold">{formatCurrency(parsedAmount)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Processing time</span><span className="text-brand-300 font-medium">{selectedMethod.time}</span></div>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={() => { setStep('form'); setAmount('') }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={{ background: 'rgba(var(--ink),0.06)', color: 'var(--t-text-1)', border: '1px solid rgba(var(--ink),0.1)' }}>
              New Deposit
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1 py-2.5">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="card p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Confirm Deposit</h2>
            <p className="text-text-muted text-sm mt-0.5">Review your deposit details before proceeding.</p>
          </div>
          <div className="rounded-xl p-4 space-y-3 text-sm" style={{ background: 'rgba(var(--ink),0.025)', border: '1px solid rgba(var(--ink),0.05)' }}>
            <div className="flex justify-between"><span className="text-text-muted">Payment method</span><span className="text-text-primary font-medium">{selectedMethod.label}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Deposit amount</span><span className="text-text-primary font-mono font-semibold">{formatCurrency(parsedAmount)}</span></div>
            {feeAmount > 0 && <div className="flex justify-between"><span className="text-text-muted">Processing fee (2.5%)</span><span className="text-bear font-mono">{formatCurrency(feeAmount)}</span></div>}
            <div className="h-px" style={{ background: 'rgba(var(--ink),0.06)' }} />
            <div className="flex justify-between font-bold"><span className="text-text-primary">Total charged</span><span className="text-bull font-mono text-base">{formatCurrency(totalDebit)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Processing time</span><span className="text-brand-300 font-medium">{selectedMethod.time}</span></div>
          </div>
          {error && (
            <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255,90,114,0.08)', border: '1px solid rgba(255,90,114,0.2)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('form')} disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ background: 'rgba(var(--ink),0.06)', color: 'var(--t-text-1)', border: '1px solid rgba(var(--ink),0.1)' }}>
              Back
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-gold flex-1 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? 'Processing…' : 'Confirm Deposit'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-text-muted hover:text-text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Deposit Funds</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Current balance: <span className="text-brand-300 font-semibold font-mono">{formatCurrency(balance)}</span>
          </p>
        </div>
      </div>

      {/* Method selector */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Payment Method</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className="rounded-xl p-4 text-left transition-all"
              style={method === m.id
                ? { background: 'rgba(79,140,255,0.1)', border: '1px solid rgba(79,140,255,0.35)', color: '#7aa7ff' }
                : { background: 'rgba(var(--ink),0.025)', border: '1px solid rgba(var(--ink),0.06)', color: 'var(--t-text-2)' }}
              onMouseEnter={e => method !== m.id && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--ink),0.14)')}
              onMouseLeave={e => method !== m.id && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--ink),0.06)')}
            >
              <div className="mb-2">{m.icon}</div>
              <p className="font-semibold text-sm text-text-primary">{m.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{m.desc}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xs font-bold text-text-secondary">Fee: {m.fee}</span>
                <span className="text-2xs text-text-muted">{m.time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Deposit Amount</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={amount === String(a)
                ? { background: 'rgba(79,140,255,0.2)', color: '#7aa7ff', border: '1px solid rgba(79,140,255,0.3)' }
                : { background: 'rgba(var(--ink),0.04)', color: 'var(--t-text-2)', border: '1px solid rgba(var(--ink),0.06)' }}>
              ${a.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">$</span>
          <input
            type="number"
            min={10}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount (min. $10)"
            className="input pl-8 w-full text-lg font-mono font-semibold py-3"
          />
        </div>
        {isValid && feeAmount > 0 && (
          <p className="text-xs text-text-muted mt-2">Processing fee: <span className="text-bear font-mono">{formatCurrency(feeAmount)}</span> - Total: <span className="text-text-primary font-mono font-semibold">{formatCurrency(totalDebit)}</span></p>
        )}
      </div>

      {/* Method-specific details */}
      {method === 'card' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Card Details</p>
            <span className="inline-flex items-center gap-2">
              <MastercardMark h={18} />
              <VisaMark h={18} />
            </span>
          </div>
          <div className="space-y-3">
            <input
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())}
              placeholder="Card number"
              className="input w-full font-mono"
              maxLength={19}
            />
            <div className="grid grid-cols-2 gap-3">
              <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM / YY" className="input font-mono" maxLength={7} />
              <input value={cardCVC} onChange={e => setCardCVC(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="CVC" className="input font-mono" maxLength={4} />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-bull" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
            Your payment information is encrypted and secure.
          </p>
        </div>
      )}

      {method === 'crypto' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Select Cryptocurrency</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {CRYPTO_OPTIONS.map(c => (
              <button key={c} onClick={() => setCrypto(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-2"
                style={crypto === c
                  ? { background: 'rgba(246,178,74,0.2)', color: '#f6c453', border: '1px solid rgba(246,178,74,0.3)' }
                  : { background: 'rgba(var(--ink),0.04)', color: 'var(--t-text-2)', border: '1px solid rgba(var(--ink),0.06)' }}>
                <img src={`${COIN_CDN}/${CRYPTO_ICON[c] ?? 'generic'}.svg`} alt="" width={16} height={16} style={{ borderRadius: '50%' }} />
                {c}
              </button>
            ))}
          </div>
          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: 'rgba(246,178,74,0.06)', border: '1px solid rgba(246,178,74,0.18)' }}>
            <p className="text-xs text-text-muted">Send {crypto} to this deposit address:</p>
            <p className="font-mono text-xs text-yellow-300 break-all select-all">
              {crypto.includes('BTC') ? '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T' : crypto.includes('ETH') ? '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12' : 'TRX9xYz1234567890abcDEFGHIJKLMNOPQRSTUVW'}
            </p>
            <p className="text-2xs text-text-muted">Minimum deposit: $10 equivalent. Funds credited after network confirmation.</p>
          </div>
        </div>
      )}

      {method === 'bank' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Bank Transfer Details</p>
          <div className="space-y-2 text-sm" style={{ background: 'rgba(var(--ink),0.02)', border: '1px solid rgba(var(--ink),0.05)', borderRadius: 12, padding: '16px' }}>
            {[
              { l: 'Bank Name',       v: 'TradeX Financial Ltd.' },
              { l: 'Account Number',  v: '1234-5678-9012' },
              { l: 'Sort / SWIFT',    v: 'TRADEXUK21' },
              { l: 'IBAN',            v: 'GB29 NWBK 6016 1331 9268 19' },
              { l: 'Reference',       v: user?.username?.toUpperCase() ?? 'YOUR-USER-ID' },
            ].map(r => (
              <div key={r.l} className="flex justify-between gap-4">
                <span className="text-text-muted text-xs">{r.l}</span>
                <span className="font-mono text-xs text-text-primary font-semibold">{r.v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3 flex items-start gap-1.5">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0 mt-0.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            Always include your username as the payment reference so we can credit your account.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        disabled={!isValid}
        onClick={handleSubmit}
        className="btn-gold w-full py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed">
        {method === 'crypto'
          ? 'I Have Sent the Funds'
          : isValid
            ? `Deposit ${formatCurrency(totalDebit, 2, currency)}`
            : 'Enter an amount to deposit'}
      </button>

    </div>
  )
}
