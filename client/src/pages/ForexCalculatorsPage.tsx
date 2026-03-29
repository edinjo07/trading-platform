import React, { useState, useMemo } from 'react'

// ─── Pair definitions ─────────────────────────────────────────────────────────
interface PairDef {
  symbol: string
  base: string
  quote: string
  price: number        // approximate mid price
  pipSize: number      // value of 1 pip movement
  contractSize: number // units per 1.0 lot
  swapLong: number     // usd per lot per day
  swapShort: number
}

const PAIRS: PairDef[] = [
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', price: 1.0850, pipSize: 0.0001, contractSize: 100000, swapLong: -9.80, swapShort:  4.00 },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', price: 1.2640, pipSize: 0.0001, contractSize: 100000, swapLong: -5.20, swapShort:  2.10 },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', price: 149.50, pipSize: 0.01,   contractSize: 100000, swapLong:  3.50, swapShort: -8.90 },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', price: 0.6350, pipSize: 0.0001, contractSize: 100000, swapLong: -4.10, swapShort:  1.60 },
  { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', price: 1.3650, pipSize: 0.0001, contractSize: 100000, swapLong:  1.80, swapShort: -6.50 },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', price: 0.9060, pipSize: 0.0001, contractSize: 100000, swapLong: -2.10, swapShort: -1.50 },
  { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', price: 0.5750, pipSize: 0.0001, contractSize: 100000, swapLong: -5.80, swapShort:  2.30 },
  { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP', price: 0.8590, pipSize: 0.0001, contractSize: 100000, swapLong: -7.10, swapShort:  2.80 },
  { symbol: 'EUR/JPY', base: 'EUR', quote: 'JPY', price: 162.20, pipSize: 0.01,   contractSize: 100000, swapLong: -6.90, swapShort:  1.30 },
  { symbol: 'GBP/JPY', base: 'GBP', quote: 'JPY', price: 188.90, pipSize: 0.01,   contractSize: 100000, swapLong: -9.20, swapShort:  2.60 },
  { symbol: 'XAU/USD', base: 'XAU', quote: 'USD', price: 3110.0, pipSize: 0.01,   contractSize: 100,    swapLong: -28.5, swapShort: -4.20 },
  { symbol: 'XAG/USD', base: 'XAG', quote: 'USD', price: 33.50,  pipSize: 0.001,  contractSize: 5000,   swapLong: -3.50, swapShort: -0.90 },
  { symbol: 'WTI',     base: 'WTI', quote: 'USD', price: 69.50,  pipSize: 0.01,   contractSize: 1000,   swapLong: -6.20, swapShort: -1.10 },
  { symbol: 'BRENT',   base: 'BRT', quote: 'USD', price: 73.10,  pipSize: 0.01,   contractSize: 1000,   swapLong: -6.80, swapShort: -1.30 },
  { symbol: 'US500',   base: 'IDX', quote: 'USD', price: 5600.0, pipSize: 0.1,    contractSize: 1,      swapLong: -8.40, swapShort: -1.80 },
  { symbol: 'USTEC',   base: 'IDX', quote: 'USD', price: 19500,  pipSize: 0.1,    contractSize: 1,      swapLong: -14.2, swapShort: -2.50 },
  { symbol: 'BTC/USD', base: 'BTC', quote: 'USD', price: 85000,  pipSize: 1,      contractSize: 1,      swapLong: -35.0, swapShort: -18.0 },
  { symbol: 'ETH/USD', base: 'ETH', quote: 'USD', price: 1980,   pipSize: 0.01,   contractSize: 1,      swapLong: -12.0, swapShort: -6.50 },
]

const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']

const LEVERAGES = [
  '1:1', '1:2', '1:5', '1:10', '1:20', '1:50',
  '1:100', '1:200', '1:500', '1:1000',
]

// Approximate USD→other rates for account currency conversion
const USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.921, GBP: 0.791, JPY: 149.5,
  AUD: 1.575, CAD: 1.365, CHF: 0.906, NZD: 1.739,
}

type CalcTab = 'allinone' | 'pip' | 'margin' | 'position'

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── Input component ─────────────────────────────────────────────────────────
function CalcInput({
  label, value, onChange, type = 'number', min, step, children,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  min?: number
  step?: number
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      {children ?? (
        <input
          type={type}
          value={value}
          min={min}
          step={step}
          onChange={e => onChange(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm font-mono text-text-primary focus:outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.5)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-xl text-sm font-mono text-text-primary focus:outline-none transition-all appearance-none cursor-pointer"
        style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-text-muted text-sm">{label}</span>
      <span className="font-mono font-bold text-sm" style={{ color: color ?? '#e2eaf0' }}>{value}</span>
    </div>
  )
}

// ─── All-in-One Calculator ────────────────────────────────────────────────────
function AllInOneCalc() {
  const [pairSym, setPairSym] = useState('EUR/USD')
  const [acctCur, setAcctCur] = useState('USD')
  const [leverage, setLeverage] = useState('1:1000')
  const [lots, setLots] = useState('0.1')
  const [direction, setDirection] = useState<'long' | 'short'>('long')

  const pair = PAIRS.find(p => p.symbol === pairSym)!
  const levNum = parseFloat(leverage.split(':')[1])
  const lotsNum = parseFloat(lots) || 0
  const acctRate = USD_RATES[acctCur] ?? 1

  const results = useMemo(() => {
    if (!pair || lotsNum <= 0) return null
    const positionInBase = lotsNum * pair.contractSize
    const notionalUSD = positionInBase * pair.price
    const marginUSD = notionalUSD / levNum
    const marginInAcct = marginUSD * acctRate

    // Pip value: how much does 1 pip move cost in account currency?
    // For USD-quoted pairs: pip_value_usd = pip_size * contract_size * lots
    // For non-USD-quoted: divide by exchange rate first
    let pipValueUSD: number
    if (pair.quote === 'USD') {
      pipValueUSD = pair.pipSize * pair.contractSize * lotsNum
    } else if (pair.base === 'USD') {
      pipValueUSD = (pair.pipSize / pair.price) * pair.contractSize * lotsNum
    } else {
      // Cross pair — approximate using quote rate
      const quoteToUSD = 1 / pair.price
      pipValueUSD = pair.pipSize * pair.contractSize * lotsNum * quoteToUSD * pair.price
    }
    const pipValueAcct = pipValueUSD * acctRate

    // Commission: $3.50 per standard lot per side
    const commissionUSD = 3.5 * lotsNum
    const commissionAcct = commissionUSD * acctRate

    const swapUSD = direction === 'long' ? pair.swapLong * lotsNum : pair.swapShort * lotsNum
    const swapAcct = swapUSD * acctRate

    return { marginInAcct, pipValueAcct, commissionAcct, swapAcct }
  }, [pair, lotsNum, levNum, acctCur, direction, acctRate])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <Select label="Currency Pair" value={pairSym} onChange={setPairSym} options={PAIRS.map(p => p.symbol)} />
        <Select label="Account Currency" value={acctCur} onChange={setAcctCur} options={ACCOUNT_CURRENCIES} />
        <Select label="Leverage" value={leverage} onChange={setLeverage} options={LEVERAGES} />
        <CalcInput label="Position Size (Lots)" value={lots} onChange={setLots} min={0.01} step={0.01} />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Trade Direction</label>
          <div className="flex gap-2">
            {(['long', 'short'] as const).map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
                style={direction === d
                  ? d === 'long'
                    ? { background: 'rgba(0,200,120,0.12)', color: '#00c878', border: '1px solid rgba(0,200,120,0.3)' }
                    : { background: 'rgba(255,48,71,0.12)', color: '#ff3047', border: '1px solid rgba(255,48,71,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {d === 'long' ? '▲ Buy / Long' : '▼ Sell / Short'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-bull animate-pulse" />
          <span className="text-text-primary font-semibold text-sm">Calculation Results</span>
          <span className="text-text-muted text-xs ml-auto">{acctCur}</span>
        </div>
        {!results || lotsNum <= 0 ? (
          <p className="text-text-muted text-sm text-center py-8">Enter a position size to see results.</p>
        ) : (
          <>
            <ResultRow label="Required Margin" value={`${fmt(results.marginInAcct)} ${acctCur}`} color="#38bdf8" />
            <ResultRow label="Commission (per side)" value={`${fmt(results.commissionAcct)} ${acctCur}`} />
            <ResultRow label="Pip Value" value={`${fmt(results.pipValueAcct)} ${acctCur}`} color="#00c878" />
            <ResultRow
              label={`Swap (${direction === 'long' ? 'Long' : 'Short'}) / day`}
              value={`${results.swapAcct >= 0 ? '+' : ''}${fmt(results.swapAcct)} ${acctCur}`}
              color={results.swapAcct >= 0 ? '#00c878' : '#ff3047'}
            />
            <div className="mt-4 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-text-muted text-xs leading-relaxed">
                Based on approx. price <strong className="text-text-secondary">{fmt(pair.price, pair.price > 100 ? 2 : 4)}</strong> for {pairSym}.
                Commission reflects cTrader Raw spread account ($3.50/lot/side).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pip Value Calculator ─────────────────────────────────────────────────────
function PipCalc() {
  const [pairSym, setPairSym] = useState('EUR/USD')
  const [acctCur, setAcctCur] = useState('USD')
  const [lots, setLots] = useState('1')
  const [pips, setPips] = useState('10')

  const pair = PAIRS.find(p => p.symbol === pairSym)!
  const lotsNum = parseFloat(lots) || 0
  const pipsNum = parseFloat(pips) || 0
  const acctRate = USD_RATES[acctCur] ?? 1

  const perPip = useMemo(() => {
    if (!pair || lotsNum <= 0) return 0
    let pipValueUSD: number
    if (pair.quote === 'USD') {
      pipValueUSD = pair.pipSize * pair.contractSize * lotsNum
    } else if (pair.base === 'USD') {
      pipValueUSD = (pair.pipSize / pair.price) * pair.contractSize * lotsNum
    } else {
      pipValueUSD = pair.pipSize * pair.contractSize * lotsNum / pair.price
    }
    return pipValueUSD * acctRate
  }, [pair, lotsNum, acctCur, acctRate])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Select label="Currency Pair" value={pairSym} onChange={setPairSym} options={PAIRS.map(p => p.symbol)} />
        <Select label="Account Currency" value={acctCur} onChange={setAcctCur} options={ACCOUNT_CURRENCIES} />
        <CalcInput label="Position Size (Lots)" value={lots} onChange={setLots} min={0.01} step={0.01} />
        <CalcInput label="Number of Pips" value={pips} onChange={setPips} min={1} step={1} />
      </div>
      <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-bull animate-pulse" />
          <span className="text-text-primary font-semibold text-sm">Pip Value Results</span>
          <span className="text-text-muted text-xs ml-auto">{acctCur}</span>
        </div>
        <ResultRow label="Pip Value (per pip)" value={`${fmt(perPip)} ${acctCur}`} color="#38bdf8" />
        <ResultRow label={`P&L for ${pipsNum} pips`} value={`${fmt(perPip * pipsNum)} ${acctCur}`} color="#00c878" />
        <ResultRow label="P&L if price reverses" value={`-${fmt(perPip * pipsNum)} ${acctCur}`} color="#ff3047" />
      </div>
    </div>
  )
}

// ─── Margin Calculator ────────────────────────────────────────────────────────
function MarginCalc() {
  const [pairSym, setPairSym] = useState('EUR/USD')
  const [acctCur, setAcctCur] = useState('USD')
  const [leverage, setLeverage] = useState('1:100')
  const [lots, setLots] = useState('1')

  const pair = PAIRS.find(p => p.symbol === pairSym)!
  const levNum = parseFloat(leverage.split(':')[1])
  const lotsNum = parseFloat(lots) || 0
  const acctRate = USD_RATES[acctCur] ?? 1

  const { margin, notional } = useMemo(() => {
    if (!pair || lotsNum <= 0) return { margin: 0, notional: 0 }
    const notional = lotsNum * pair.contractSize * pair.price
    return { margin: (notional / levNum) * acctRate, notional: notional * acctRate }
  }, [pair, lotsNum, levNum, acctCur, acctRate])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Select label="Currency Pair" value={pairSym} onChange={setPairSym} options={PAIRS.map(p => p.symbol)} />
        <Select label="Account Currency" value={acctCur} onChange={setAcctCur} options={ACCOUNT_CURRENCIES} />
        <Select label="Leverage" value={leverage} onChange={setLeverage} options={LEVERAGES} />
        <CalcInput label="Position Size (Lots)" value={lots} onChange={setLots} min={0.01} step={0.01} />
      </div>
      <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-bull animate-pulse" />
          <span className="text-text-primary font-semibold text-sm">Margin Results</span>
          <span className="text-text-muted text-xs ml-auto">{acctCur}</span>
        </div>
        <ResultRow label="Required Margin" value={`${fmt(margin)} ${acctCur}`} color="#38bdf8" />
        <ResultRow label="Position Notional Value" value={`${fmt(notional)} ${acctCur}`} />
        <ResultRow label="Leverage Used" value={leverage} />
        <ResultRow label="Margin Level (if only trade)" value={lotsNum > 0 ? `${fmt((notional / margin) * 100)}%` : '—'} color="#00c878" />
      </div>
    </div>
  )
}

// ─── Position Size Calculator ─────────────────────────────────────────────────
function PositionCalc() {
  const [pairSym, setPairSym] = useState('EUR/USD')
  const [acctCur, setAcctCur] = useState('USD')
  const [balance, setBalance] = useState('10000')
  const [riskPct, setRiskPct] = useState('1')
  const [stopPips, setStopPips] = useState('20')

  const pair = PAIRS.find(p => p.symbol === pairSym)!
  const acctRate = USD_RATES[acctCur] ?? 1

  const { riskAmt, lots, units } = useMemo(() => {
    const balNum = parseFloat(balance) || 0
    const riskNum = parseFloat(riskPct) || 0
    const stopNum = parseFloat(stopPips) || 1
    if (!pair || balNum <= 0) return { riskAmt: 0, lots: 0, units: 0 }

    const riskAmt = (balNum * riskNum) / 100
    // Convert risk amount to USD
    const riskUSD = riskAmt / acctRate
    // Pip value per 1 lot in USD
    let pipValueUSD: number
    if (pair.quote === 'USD') {
      pipValueUSD = pair.pipSize * pair.contractSize
    } else if (pair.base === 'USD') {
      pipValueUSD = (pair.pipSize / pair.price) * pair.contractSize
    } else {
      pipValueUSD = pair.pipSize * pair.contractSize / pair.price
    }
    const lots = riskUSD / (stopNum * pipValueUSD)
    return { riskAmt, lots: Math.max(0, lots), units: Math.max(0, lots * pair.contractSize) }
  }, [pair, balance, riskPct, stopPips, acctCur, acctRate])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Select label="Currency Pair" value={pairSym} onChange={setPairSym} options={PAIRS.map(p => p.symbol)} />
        <Select label="Account Currency" value={acctCur} onChange={setAcctCur} options={ACCOUNT_CURRENCIES} />
        <CalcInput label={`Account Balance (${acctCur})`} value={balance} onChange={setBalance} min={1} step={100} />
        <CalcInput label="Risk % per Trade" value={riskPct} onChange={setRiskPct} min={0.1} step={0.1} />
        <CalcInput label="Stop Loss (Pips)" value={stopPips} onChange={setStopPips} min={1} step={1} />
      </div>
      <div className="rounded-xl p-5" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-bull animate-pulse" />
          <span className="text-text-primary font-semibold text-sm">Position Size Results</span>
        </div>
        <ResultRow label="Risk Amount" value={`${fmt(riskAmt)} ${acctCur}`} color="#f59e0b" />
        <ResultRow label="Recommended Lot Size" value={`${fmt(lots, 4)} lots`} color="#38bdf8" />
        <ResultRow label="Position Units" value={`${fmt(units, 0)} units`} />
        <ResultRow label={`Stop Loss (${stopPips} pips)`} value={`${fmt(riskAmt)} ${acctCur} max loss`} color="#ff3047" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const CALC_TABS: { id: CalcTab; label: string; desc: string }[] = [
  { id: 'allinone', label: 'All in One',     desc: 'Margin, pip value, commission & swap' },
  { id: 'pip',      label: 'Pip Value',      desc: 'Value per pip movement' },
  { id: 'margin',   label: 'Margin',         desc: 'Required margin for a position' },
  { id: 'position', label: 'Position Size',  desc: 'Optimal size based on risk %' },
]

export default function ForexCalculatorsPage() {
  const [tab, setTab] = useState<CalcTab>('allinone')

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
            <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M13 3h8v8M13 11L21 3" />
          </svg>
          <h1 className="text-text-primary text-2xl font-bold">Forex Trading Calculators</h1>
        </div>
        <p className="text-text-muted text-sm">
          Calculate pip values, required margin, commissions and optimal position sizes across all instruments.
        </p>
      </div>

      {/* Calculator type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CALC_TABS.map(ct => (
          <button
            key={ct.id}
            onClick={() => setTab(ct.id)}
            className="rounded-xl p-4 text-left transition-all"
            style={tab === ct.id
              ? { background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)' }
              : { background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            <div className="text-sm font-semibold mb-0.5"
                 style={{ color: tab === ct.id ? '#38bdf8' : '#e2eaf0' }}>
              {ct.label}
            </div>
            <div className="text-xs text-text-muted leading-snug">{ct.desc}</div>
          </button>
        ))}
      </div>

      {/* Active calculator */}
      <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#0a1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-text-primary font-semibold mb-5">{CALC_TABS.find(t => t.id === tab)!.label} Calculator</h2>
        {tab === 'allinone'  && <AllInOneCalc />}
        {tab === 'pip'       && <PipCalc />}
        {tab === 'margin'    && <MarginCalc />}
        {tab === 'position'  && <PositionCalc />}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl px-4 py-3.5 flex gap-3 items-start"
           style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth={1.8}>
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-text-muted text-xs leading-relaxed">
          Results are indicative and based on approximate mid-market prices. Actual values may vary with live spreads,
          swap rates, and account type. Trading CFDs carries significant risk. Commission shown is for Raw Spread / cTrader accounts ($3.50/lot/side).
        </p>
      </div>
    </div>
  )
}
