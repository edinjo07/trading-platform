import React, { useState, useEffect } from 'react'
import { useAlertsStore, AlertCondition, PriceAlert } from '../store/alertsStore'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice } from '../utils/formatters'

const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Price rises above',
  below: 'Price falls below',
}

function AlertRow({ alert, onDelete, onDismiss }: {
  alert: PriceAlert
  onDelete: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'rgba(14,165,233,0.12)',  color: '#38bdf8' },
    triggered: { bg: 'rgba(0,200,120,0.12)',   color: '#00c878' },
    dismissed: { bg: 'rgba(107,128,153,0.08)', color: '#6b8099' },
  }
  const sc = statusColors[alert.status]

  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-4"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: alert.condition === 'above' ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
               style={{ color: alert.condition === 'above' ? '#00c878' : '#ff3047' }}>
            {alert.condition === 'above'
              ? <polyline points="18 15 12 9 6 15" />
              : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-text-primary text-sm">{alert.symbol}</span>
            <span className="text-text-muted text-xs">{CONDITION_LABELS[alert.condition]}</span>
            <span className="font-mono font-bold text-sm" style={{ color: alert.condition === 'above' ? '#00c878' : '#ff3047' }}>
              {formatPrice(alert.targetPrice, alert.symbol)}
            </span>
          </div>
          {alert.note && <div className="text-text-muted text-xs mt-0.5 truncate">{alert.note}</div>}
          <div className="text-text-muted text-[10px] mt-0.5">
            Created {new Date(alert.createdAt).toLocaleDateString()}
            {alert.triggeredAt && ` · Triggered ${new Date(alert.triggeredAt).toLocaleTimeString()}`}
            {alert.currentPrice && (
              <span className="ml-2 text-text-secondary">
                Now: {formatPrice(alert.currentPrice, alert.symbol)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize"
              style={{ background: sc.bg, color: sc.color }}>
          {alert.status}
        </span>
        {alert.status === 'triggered' && (
          <button onClick={() => onDismiss(alert.id)}
            className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
            style={{ border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.08)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            Dismiss
          </button>
        )}
        <button onClick={() => onDelete(alert.id)}
          className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
          style={{ border: '1px solid rgba(255,48,71,0.25)', color: '#ff7080' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,48,71,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
          Delete
        </button>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { alerts, addAlert, dismissAlert, deleteAlert } = useAlertsStore()
  const { symbols, tickers } = useTradingStore()

  // New alert form state
  const [symbol, setSymbol]        = useState('BTC/USDT')
  const [condition, setCondition]  = useState<AlertCondition>('above')
  const [price, setPrice]          = useState('')
  const [note, setNote]            = useState('')
  const [filterStatus, setFilter]  = useState<'all' | 'active' | 'triggered' | 'dismissed'>('all')

  // Suggest current price
  const currentPrice = tickers[symbol]?.price
  const symList = symbols.length > 0
    ? symbols.map(s => s.symbol)
    : ['BTC/USDT', 'ETH/USDT', 'AAPL', 'EUR/USD', 'NVDA', 'SOL/USDT', 'TSLA', 'XAU/USD']

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const pNum = parseFloat(price)
    if (!pNum || pNum <= 0) return
    addAlert({ symbol, condition, targetPrice: pNum, note, currentPrice })
    setPrice('')
    setNote('')
  }

  const filtered = filterStatus === 'all' ? alerts : alerts.filter(a => a.status === filterStatus)
  const activeCount    = alerts.filter(a => a.status === 'active').length
  const triggeredCount = alerts.filter(a => a.status === 'triggered').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
          🔔 Price Alerts
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Get notified when prices reach your targets
          {triggeredCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(0,200,120,0.15)', color: '#00c878' }}>
              {triggeredCount} triggered
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Add alert form ── */}
        <div className="card">
          <h2 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/>
            </svg>
            New Alert
          </h2>

          <form onSubmit={handleAdd} className="space-y-3">
            {/* Symbol */}
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Symbol</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)} className="input text-sm w-full">
                {symList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Condition</label>
              <div className="flex gap-2">
                {(['above', 'below'] as AlertCondition[]).map(c => (
                  <button key={c} type="button" onClick={() => setCondition(c)}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize"
                    style={condition === c
                      ? { background: c === 'above' ? 'rgba(0,200,120,0.18)' : 'rgba(255,48,71,0.18)', color: c === 'above' ? '#00c878' : '#ff3047', border: `1px solid ${c === 'above' ? 'rgba(0,200,120,0.35)' : 'rgba(255,48,71,0.35)'}` }
                      : { background: 'rgba(255,255,255,0.04)', color: '#6b8099', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {c === 'above' ? '▲ Above' : '▼ Below'}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-text-muted">Target Price</label>
                {currentPrice && (
                  <button type="button" onClick={() => setPrice(String(currentPrice))}
                    className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors font-medium">
                    Use current {formatPrice(currentPrice, symbol)}
                  </button>
                )}
              </div>
              <input
                type="number" step="any" min="0" required
                placeholder="0.00"
                value={price} onChange={e => setPrice(e.target.value)}
                className="input text-sm w-full font-mono" />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Note (optional)</label>
              <input
                type="text" maxLength={80} placeholder="e.g. Break of support"
                value={note} onChange={e => setNote(e.target.value)}
                className="input text-sm w-full" />
            </div>

            <button type="submit" className="btn-primary w-full text-sm py-2.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Set Alert
            </button>
          </form>

          {/* Stats */}
          <div className="mt-5 pt-4 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <div className="text-xl font-black text-brand-400">{activeCount}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Active</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,200,120,0.07)', border: '1px solid rgba(0,200,120,0.12)' }}>
              <div className="text-xl font-black text-bull">{triggeredCount}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Triggered</div>
            </div>
          </div>
        </div>

        {/* ── Alerts list ── */}
        <div className="lg:col-span-2">
          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['all', 'active', 'triggered', 'dismissed'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all"
                style={filterStatus === s
                  ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }
                  : { color: '#6b8099' }}>
                {s}
                <span className="ml-1.5 text-[10px]" style={{ color: filterStatus === s ? '#38bdf8' : '#3b5070' }}>
                  {s === 'all' ? alerts.length : alerts.filter(a => a.status === s).length}
                </span>
              </button>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/>
                </svg>
                <p className="text-text-muted text-sm">No alerts {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}</p>
                <p className="text-text-muted text-xs">Create an alert using the form on the left</p>
              </div>
            ) : (
              filtered.map(alert => (
                <AlertRow key={alert.id} alert={alert} onDelete={deleteAlert} onDismiss={dismissAlert} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
