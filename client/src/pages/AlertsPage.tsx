import React, { useMemo, useState } from 'react'
import { useAlertsStore, AlertCondition, PriceAlert } from '../store/alertsStore'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice } from '../utils/formatters'
import AssetIcon from '../components/ui/AssetIcon'

// ── Theme palette (flips with light/dark) ─────────────────────────────────────
const S = {
  surface:  'var(--t-surface)',
  surface2: 'var(--t-surface-2)',
  border:   'var(--t-border)',
  text1:    'var(--t-text-1)',
  text2:    'var(--t-text-2)',
  text3:    'var(--t-text-3)',
  bull:     'var(--t-bull)',
  bear:     'var(--t-bear)',
  accent:   'var(--t-accent)',
}

const QUICK_SYMBOLS = [
  { symbol: 'BTCUSD',  name: 'Bitcoin',    assetClass: 'crypto'    },
  { symbol: 'ETHUSD',  name: 'Ethereum',   assetClass: 'crypto'    },
  { symbol: 'SOLUSD',  name: 'Solana',     assetClass: 'crypto'    },
  { symbol: 'XAUUSD',  name: 'Gold',       assetClass: 'commodity' },
  { symbol: 'XAGUSD',  name: 'Silver',     assetClass: 'commodity' },
  { symbol: 'WTI',     name: 'WTI Oil',    assetClass: 'commodity' },
  { symbol: 'EURUSD',  name: 'EUR/USD',    assetClass: 'forex'     },
  { symbol: 'GBPUSD',  name: 'GBP/USD',    assetClass: 'forex'     },
  { symbol: 'USDJPY',  name: 'USD/JPY',    assetClass: 'forex'     },
  { symbol: 'US500',   name: 'US 500',     assetClass: 'index'     },
  { symbol: 'USTEC',   name: 'US Tech 100',assetClass: 'index'     },
  { symbol: 'US30',    name: 'Wall Street',assetClass: 'index'     },
  { symbol: 'AAPL',    name: 'Apple',      assetClass: 'stock'     },
  { symbol: 'TSLA',    name: 'Tesla',      assetClass: 'stock'     },
  { symbol: 'NVDA',    name: 'NVIDIA',     assetClass: 'stock'     },
  { symbol: 'MSFT',    name: 'Microsoft',  assetClass: 'stock'     },
]

const STATUS = {
  active:    { label: 'Active',    color: S.accent },
  triggered: { label: 'Triggered', color: S.bull   },
  dismissed: { label: 'Done',      color: S.text3  },
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '13px 15px' }}>
      <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 19, fontWeight: 800, color: color ?? S.text1, margin: 0, fontFamily: 'ui-monospace,monospace' }}>{value}</p>
    </div>
  )
}

// ── Create alert bottom sheet ─────────────────────────────────────────────────
function CreateSheet({ onClose }: { onClose: () => void }) {
  const { tickers }  = useTradingStore()
  const { addAlert } = useAlertsStore()

  const [query,       setQuery]       = useState('')
  const [selected,    setSelected]    = useState<typeof QUICK_SYMBOLS[0] | null>(null)
  const [symOpen,     setSymOpen]     = useState(false)
  const [condition,   setCondition]   = useState<AlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [note,        setNote]        = useState('')

  const currentPrice = selected ? tickers[selected.symbol]?.price : undefined
  const filtered = QUICK_SYMBOLS.filter(s =>
    !query || s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 12,
    background: S.surface2, border: `1px solid ${S.border}`,
    color: S.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const p = parseFloat(targetPrice)
    if (!p || p <= 0) return
    addAlert({ symbol: selected.symbol, condition, targetPrice: p, note, currentPrice })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: 'var(--sheet)', borderRadius: '22px 22px 0 0', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(var(--ink),0.18)', margin: '0 auto' }} />
        </div>
        <div style={{ padding: '16px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: S.text1, margin: 0 }}>Create Alert</h3>
              <p style={{ fontSize: 12, color: S.text3, margin: '3px 0 0' }}>Get notified when price hits your target</p>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: S.surface2, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: S.text2 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Instrument */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: S.text2, display: 'block', marginBottom: 8 }}>Instrument</label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Search symbol (BTC, Gold, AAPL…)"
                  value={query || selected?.symbol || ''}
                  onChange={e => { setQuery(e.target.value); setSelected(null); setSymOpen(true) }}
                  onFocus={() => setSymOpen(true)} style={inputStyle} />
                {symOpen && filtered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--sheet)', border: `1px solid ${S.border}`, borderRadius: 12, overflow: 'hidden', zIndex: 10, maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--t-shadow-md)' }}>
                    {filtered.map(s => (
                      <button key={s.symbol} type="button" onClick={() => { setSelected(s); setQuery(''); setSymOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <AssetIcon symbol={s.symbol} assetClass={s.assetClass} size={28} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: S.text1, display: 'block' }}>{s.symbol}</span>
                          <span style={{ fontSize: 11, color: S.text3 }}>{s.name}</span>
                        </div>
                        {tickers[s.symbol] && <span style={{ fontSize: 12, fontFamily: 'ui-monospace,monospace', color: S.text2 }}>{formatPrice(tickers[s.symbol].price, s.symbol)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <AssetIcon symbol={selected.symbol} assetClass={selected.assetClass} size={20} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: S.text1 }}>{selected.name}</span>
                  {currentPrice && <span style={{ fontSize: 12, color: S.text2, fontFamily: 'ui-monospace,monospace', marginLeft: 'auto' }}>{formatPrice(currentPrice, selected.symbol)}</span>}
                </div>
              )}
            </div>

            {/* Direction */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: S.text2, display: 'block', marginBottom: 8 }}>Alert when price goes</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['above', 'below'] as AlertCondition[]).map(c => {
                  const on = condition === c
                  const col = c === 'above' ? S.bull : S.bear
                  return (
                    <button key={c} type="button" onClick={() => setCondition(c)}
                      style={{ padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        background: on ? (c === 'above' ? 'var(--t-bull-s)' : 'var(--t-bear-s)') : S.surface2,
                        color: on ? col : S.text3, border: `1px solid ${on ? col : S.border}` }}>
                      {c === 'above' ? '↑ Above' : '↓ Below'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target price */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>Target Price</label>
                {currentPrice && (
                  <button type="button" onClick={() => setTargetPrice(String(currentPrice))}
                    style={{ fontSize: 11, fontWeight: 600, color: S.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Use current · {formatPrice(currentPrice, selected?.symbol)}
                  </button>
                )}
              </div>
              <input type="number" step="any" min="0" required placeholder="0.00" value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                style={{ ...inputStyle, fontSize: 18, fontFamily: 'ui-monospace,monospace', fontWeight: 700 }} />
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: S.text2, display: 'block', marginBottom: 8 }}>Note (optional)</label>
              <input type="text" maxLength={80} placeholder="e.g. Break of resistance level" value={note}
                onChange={e => setNote(e.target.value)} style={inputStyle} />
            </div>

            <button type="submit" disabled={!selected || !targetPrice}
              style={{ width: '100%', padding: 16, borderRadius: 14, background: (!selected || !targetPrice) ? 'var(--t-accent-s)' : S.accent, color: (!selected || !targetPrice) ? S.text3 : '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: (!selected || !targetPrice) ? 'not-allowed' : 'pointer', marginTop: 4 }}>
              Set Alert
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Alert card ─────────────────────────────────────────────────────────────────
function AlertCard({ alert, onDelete, onDismiss }: { alert: PriceAlert; onDelete: (id: string) => void; onDismiss: (id: string) => void }) {
  const { tickers } = useTradingStore()
  const sc          = STATUS[alert.status]
  const isAbove     = alert.condition === 'above'
  const current     = tickers[alert.symbol]?.price ?? alert.currentPrice
  const distPct     = current && alert.status === 'active' ? ((alert.targetPrice - current) / current * 100) : null
  const symInfo     = QUICK_SYMBOLS.find(s => s.symbol === alert.symbol)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16,
      background: alert.status === 'triggered' ? 'var(--t-bull-s)' : S.surface,
      border: `1px solid ${alert.status === 'triggered' ? `${S.bull}33` : S.border}`,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: isAbove ? 'var(--t-bull-s)' : 'var(--t-bear-s)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={isAbove ? S.bull : S.bear} strokeWidth={2.5}>{isAbove ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}</svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
          {symInfo && <span style={{ marginRight: 2, display: 'flex' }}><AssetIcon symbol={alert.symbol} assetClass={symInfo.assetClass} size={16} /></span>}
          <span style={{ fontSize: 14, fontWeight: 800, color: S.text1 }}>{alert.symbol}</span>
          <span style={{ fontSize: 12, color: isAbove ? S.bull : S.bear, fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
            {isAbove ? '↑ Above' : '↓ Below'} {formatPrice(alert.targetPrice, alert.symbol)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {current !== undefined && <span style={{ fontSize: 11, color: S.text2, fontFamily: 'ui-monospace,monospace' }}>Now {formatPrice(current, alert.symbol)}</span>}
          {distPct !== null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: S.surface2, color: S.text2 }}>
              {distPct > 0 ? '+' : ''}{distPct.toFixed(2)}% to target
            </span>
          )}
          {alert.note && <span style={{ fontSize: 10, color: S.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{alert.note}</span>}
          {alert.triggeredAt && <span style={{ fontSize: 10, color: S.bull }}>Triggered {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        {/* Live proximity bar */}
        {distPct !== null && alert.status === 'active' && (() => {
          const prox = Math.max(0, Math.min(1, 1 - Math.abs(distPct) / 10))
          const col  = isAbove ? S.bull : S.bear
          return (
            <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: S.surface2, overflow: 'hidden' }}>
              <div style={{ width: `${prox * 100}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          )
        })()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${sc.color}22`, color: sc.color, whiteSpace: 'nowrap' }}>{sc.label}</span>
        {alert.status === 'triggered' && (
          <button onClick={() => onDismiss(alert.id)} title="Dismiss"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--t-accent-s)', border: `1px solid ${S.accent}33`, color: S.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        )}
        <button onClick={() => onDelete(alert.id)} title="Delete"
          style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--t-bear-s)', border: `1px solid ${S.bear}33`, color: S.bear, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { alerts, dismissAlert, deleteAlert } = useAlertsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'triggered' | 'dismissed'>('all')
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied')

  const requestNotif = () => {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then(p => setNotifPerm(p)).catch(() => {})
  }

  const counts = useMemo(() => ({
    total:     alerts.length,
    active:    alerts.filter(a => a.status === 'active').length,
    triggered: alerts.filter(a => a.status === 'triggered').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length,
  }), [alerts])

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.status === filter)

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--t-bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 100px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>Price Alerts</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '6px 0 0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: S.bull }}>
                <span className="animate-pulse2" style={{ width: 6, height: 6, borderRadius: '50%', background: S.bull }} />
                Live monitoring
              </span>
              <span style={{ fontSize: 12, color: S.text3 }}>· {counts.active > 0 ? `${counts.active} active` : 'No active alerts'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {notifPerm === 'default' && (
              <button onClick={requestNotif} title="Enable browser notifications"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 9, background: 'var(--t-accent-s)', border: `1px solid ${S.accent}33`, color: S.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span className="hidden sm:inline">Enable</span>
              </button>
            )}
            <button onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, background: S.accent, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Alert
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 18 }}>
          <Kpi label="Total"     value={String(counts.total)} />
          <Kpi label="Active"    value={String(counts.active)}    color={S.accent} />
          <Kpi label="Triggered" value={String(counts.triggered)} color={counts.triggered > 0 ? S.bull : undefined} />
          <Kpi label="Done"      value={String(counts.dismissed)} />
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 14, padding: 3, borderRadius: 10, background: 'rgba(var(--ink),0.04)', border: `1px solid ${S.border}`, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
            {(['all', 'active', 'triggered', 'dismissed'] as const).map(s => {
              const count = s === 'all' ? alerts.length : counts[s]
              const on = filter === s
              return (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                    background: on ? S.surface : 'transparent', color: on ? S.text1 : S.text3, boxShadow: on ? 'var(--t-shadow-sm)' : 'none' }}>
                  {s}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: on ? S.accent : 'rgba(var(--ink),0.1)', color: on ? '#fff' : S.text3 }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── List / empty ────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: S.surface, borderRadius: 18, border: `1px solid ${S.border}` }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--t-accent-s)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: S.accent }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: S.text1, margin: '0 0 8px' }}>{filter === 'all' ? 'No alerts yet' : `No ${filter} alerts`}</p>
            <p style={{ fontSize: 13, color: S.text3, margin: '0 0 24px', lineHeight: 1.5, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
              Set a target price on any instrument and we'll notify you the moment it's reached.
            </p>
            {filter === 'all' && (
              <button onClick={() => setShowCreate(true)}
                style={{ padding: '11px 26px', borderRadius: 10, background: S.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Create your first alert
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 10 }}>
            {filtered.map(a => (
              <AlertCard key={a.id} alert={a} onDelete={deleteAlert} onDismiss={dismissAlert} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateSheet onClose={() => setShowCreate(false)} />}
    </div>
  )
}
