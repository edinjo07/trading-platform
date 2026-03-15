import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency } from '../utils/formatters'

type Method = 'bank' | 'crypto'

const CRYPTO_OPTIONS = ['USDT (TRC-20)', 'USDT (ERC-20)', 'Bitcoin (BTC)', 'Ethereum (ETH)', 'BNB (BEP-20)']
const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000]

export default function WithdrawPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { portfolio } = useTradingStore()

  const available = portfolio?.cashBalance ?? user?.balance ?? 0

  const [method, setMethod]       = useState<Method>('bank')
  const [amount, setAmount]       = useState('')
  const [crypto, setCrypto]       = useState(CRYPTO_OPTIONS[0])
  const [walletAddress, setWalletAddress] = useState('')
  const [bankName, setBankName]   = useState('')
  const [iban, setIban]           = useState('')
  const [swift, setSwift]         = useState('')
  const [step, setStep]           = useState<'form' | 'confirm' | 'done'>('form')

  const parsedAmount = parseFloat(amount.replace(/,/g, ''))
  const isValid = !isNaN(parsedAmount) && parsedAmount >= 50 && parsedAmount <= available

  const networkFee = method === 'crypto' ? 2.5 : 0
  const willReceive = isValid ? parsedAmount - networkFee : 0

  const handleSubmit = () => {
    if (!isValid) return
    if (step === 'form') { setStep('confirm'); return }
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="card p-8 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(251,146,60,0.12)', border: '2px solid rgba(251,146,60,0.3)' }}>
            <svg className="w-8 h-8" style={{ color: '#fb923c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Withdrawal Requested</h2>
            <p className="text-text-muted text-sm mt-1">
              Your withdrawal of <span className="font-semibold" style={{ color: '#fb923c' }}>{formatCurrency(parsedAmount)}</span> is pending review.
            </p>
          </div>
          <div className="w-full rounded-xl p-4 text-sm space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between"><span className="text-text-muted">Method</span><span className="text-text-primary font-medium">{method === 'bank' ? 'Bank Transfer' : `Crypto — ${crypto}`}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Requested</span><span className="text-text-primary font-mono font-semibold">{formatCurrency(parsedAmount)}</span></div>
            {networkFee > 0 && <div className="flex justify-between"><span className="text-text-muted">Network fee</span><span className="text-bear font-mono">−{formatCurrency(networkFee)}</span></div>}
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex justify-between font-bold"><span className="text-text-primary">You receive</span><span className="font-mono text-base" style={{ color: '#fb923c' }}>{formatCurrency(willReceive)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>Pending Review</span></div>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={() => { setStep('form'); setAmount('') }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
              New Withdrawal
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
            <h2 className="text-lg font-bold text-text-primary">Confirm Withdrawal</h2>
            <p className="text-text-muted text-sm mt-0.5">Please review your withdrawal request carefully.</p>
          </div>
          <div className="rounded-xl p-4 space-y-3 text-sm" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex justify-between"><span className="text-text-muted">Method</span><span className="text-text-primary font-medium">{method === 'bank' ? 'Bank Transfer' : `Crypto — ${crypto}`}</span></div>
            {method === 'bank' && bankName && <div className="flex justify-between"><span className="text-text-muted">Bank</span><span className="text-text-primary">{bankName}</span></div>}
            {method === 'bank' && iban && <div className="flex justify-between"><span className="text-text-muted">IBAN</span><span className="text-text-primary font-mono text-xs">{iban}</span></div>}
            {method === 'crypto' && walletAddress && <div className="flex justify-between gap-4"><span className="text-text-muted shrink-0">Wallet</span><span className="text-text-primary font-mono text-xs break-all text-right">{walletAddress}</span></div>}
            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex justify-between"><span className="text-text-muted">Withdrawal amount</span><span className="font-mono font-semibold text-text-primary">{formatCurrency(parsedAmount)}</span></div>
            {networkFee > 0 && <div className="flex justify-between"><span className="text-text-muted">Network fee</span><span className="text-bear font-mono">−{formatCurrency(networkFee)}</span></div>}
            <div className="flex justify-between font-bold"><span className="text-text-primary">You will receive</span><span className="font-mono text-base" style={{ color: '#fb923c' }}>{formatCurrency(willReceive)}</span></div>
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}>
            ⚠ Withdrawals are reviewed by our team within 24 hours. Ensure your details are correct — funds sent to wrong addresses cannot be recovered.
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('form')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
              Back
            </button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white' }}>
              Submit Withdrawal
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
          <h1 className="text-2xl font-bold text-text-primary">Withdraw Funds</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Available: <span className="font-semibold font-mono" style={{ color: '#fb923c' }}>{formatCurrency(available)}</span>
          </p>
        </div>
      </div>

      {/* Method selector */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Withdrawal Method</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: 'bank' as Method,
              label: 'Bank Transfer',
              desc: 'Wire transfer to your bank account.',
              fee: 'Free',
              time: '2–5 business days',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M3 10h18M3 10V6l9-3 9 3v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8" />
                </svg>
              ),
            },
            {
              id: 'crypto' as Method,
              label: 'Crypto Wallet',
              desc: 'Withdraw to your personal crypto wallet.',
              fee: '$2.50 network',
              time: '10–60 min',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 8h4a2 2 0 010 4H9v-4zm0 4h5a2 2 0 010 4H9v-4z" />
                </svg>
              ),
            },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className="rounded-xl p-4 text-left transition-all"
              style={method === m.id
                ? { background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.35)' }
                : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="mb-2" style={{ color: method === m.id ? '#fb923c' : '#94a3b8' }}>{m.icon}</div>
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
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Withdrawal Amount</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_AMOUNTS.filter(a => a <= available).map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={amount === String(a)
                ? { background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
              ${a.toLocaleString()}
            </button>
          ))}
          <button onClick={() => setAmount(String(Math.floor(available)))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={amount === String(Math.floor(available))
              ? { background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
            Max
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">$</span>
          <input
            type="number"
            min={50}
            max={available}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Enter amount (min. $50, max. ${formatCurrency(available)})`}
            className="input pl-8 w-full text-lg font-mono font-semibold py-3"
          />
        </div>
        {isValid && (
          <p className="text-xs text-text-muted mt-2">
            You will receive: <span className="font-mono font-semibold" style={{ color: '#fb923c' }}>{formatCurrency(willReceive)}</span>
            {networkFee > 0 && <span className="text-text-muted"> (after ${networkFee} network fee)</span>}
          </p>
        )}
        {!isNaN(parsedAmount) && parsedAmount > available && (
          <p className="text-xs text-bear mt-2">Amount exceeds your available balance of {formatCurrency(available)}.</p>
        )}
      </div>

      {/* Destination details */}
      {method === 'bank' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Bank Details</p>
          <div className="space-y-3">
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" className="input w-full" />
            <input value={iban} onChange={e => setIban(e.target.value)} placeholder="IBAN / Account number" className="input w-full font-mono" />
            <input value={swift} onChange={e => setSwift(e.target.value)} placeholder="BIC / SWIFT code" className="input w-full font-mono" />
          </div>
        </div>
      )}

      {method === 'crypto' && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Crypto Destination</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {CRYPTO_OPTIONS.map(c => (
              <button key={c} onClick={() => setCrypto(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={crypto === c
                  ? { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.06)' }}>
                {c}
              </button>
            ))}
          </div>
          <input value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
            placeholder="Your wallet address"
            className="input w-full font-mono text-xs" />
          <p className="text-xs text-text-muted mt-2">⚠ Double-check your wallet address. Transactions cannot be reversed.</p>
        </div>
      )}

      {/* Open positions warning */}
      {(portfolio?.positions?.length ?? 0) > 0 && (
        <div className="rounded-xl p-4 text-sm flex gap-3 items-start" style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#fb923c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p style={{ color: '#fb923c' }}>
            You have <strong>{portfolio?.positions?.length}</strong> open position(s). Only your free cash balance ({formatCurrency(available)}) is available for withdrawal.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        disabled={!isValid}
        onClick={handleSubmit}
        className="w-full py-3.5 rounded-xl text-base font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white' }}>
        Continue
      </button>

    </div>
  )
}
