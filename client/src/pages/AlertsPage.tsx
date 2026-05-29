import React, { useState } from 'react'
import { useAlertsStore, AlertCondition, PriceAlert } from '../store/alertsStore'
import { useTradingStore } from '../store/tradingStore'
import { formatPrice } from '../utils/formatters'
import AssetIcon from '../components/ui/AssetIcon'

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
  active:    { label: 'Active',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'   },
  triggered: { label: 'Triggered', color: '#00c878', bg: 'rgba(0,200,120,0.12)'    },
  dismissed: { label: 'Done',      color: '#6b7280', bg: 'rgba(107,114,128,0.10)'  },
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
    !query || s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const p = parseFloat(targetPrice)
    if (!p || p <= 0) return
    addAlert({ symbol: selected.symbol, condition, targetPrice: p, note, currentPrice })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: '#111', borderRadius: '22px 22px 0 0', padding: '0 0 env(safe-area-inset-bottom)', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto' }} />
        </div>

        <div style={{ padding: '16px 20px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>Create Alert</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>Get notified when price hits your target</p>
            </div>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Instrument */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 8 }}>Instrument</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search symbol (BTC, Gold, AAPL…)"
                  value={query || selected?.symbol || ''}
                  onChange={e => { setQuery(e.target.value); setSelected(null); setSymOpen(true) }}
                  onFocus={() => setSymOpen(true)}
                  style={{
                    width: '100%', padding: '13px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {symOpen && filtered.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, overflow: 'hidden', zIndex: 10, maxHeight: 220, overflowY: 'auto',
                  }}>
                    {filtered.map(s => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => { setSelected(s); setQuery(''); setSymOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <AssetIcon symbol={s.symbol} assetClass={s.assetClass} size={28} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'block' }}>{s.symbol}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.name}</span>
                        </div>
                        {tickers[s.symbol] && (
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)' }}>
                            {formatPrice(tickers[s.symbol].price, s.symbol)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <AssetIcon symbol={selected.symbol} assetClass={selected.assetClass} size={20} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{selected.name}</span>
                  {currentPrice && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                      {formatPrice(currentPrice, selected.symbol)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Direction */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 8 }}>Alert when price goes</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['above', 'below'] as AlertCondition[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    style={{
                      padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      background: condition === c
                        ? (c === 'above' ? 'rgba(0,200,120,0.15)' : 'rgba(255,48,71,0.15)')
                        : 'rgba(255,255,255,0.04)',
                      color: condition === c
                        ? (c === 'above' ? '#00c878' : '#ff3047')
                        : 'rgba(255,255,255,0.35)',
                      border: `1px solid ${condition === c
                        ? (c === 'above' ? 'rgba(0,200,120,0.35)' : 'rgba(255,48,71,0.35)')
                        : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {c === 'above' ? '↑ Above' : '↓ Below'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target price */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Target Price</label>
                {currentPrice && (
                  <button
                    type="button"
                    onClick={() => setTargetPrice(String(currentPrice))}
                    style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Use current · {formatPrice(currentPrice, selected?.symbol)}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="0.00"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 18, fontFamily: 'monospace', fontWeight: 700,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 8 }}>Note (optional)</label>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g. Break of resistance level"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!selected || !targetPrice}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: (!selected || !targetPrice)
                  ? 'rgba(14,165,233,0.2)'
                  : 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                color: '#fff', fontSize: 15, fontWeight: 800,
                border: 'none', cursor: (!selected || !targetPrice) ? 'not-allowed' : 'pointer',
                boxShadow: (!selected || !targetPrice) ? 'none' : '0 2px 12px rgba(14,165,233,0.35)',
                marginTop: 4,
              }}
            >
              Set Alert
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Alert card row ────────────────────────────────────────────────────────────
function AlertCard({ alert, onDelete, onDismiss }: {
  alert: PriceAlert
  onDelete: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const { tickers }  = useTradingStore()
  const sc           = STATUS[alert.status]
  const isAbove      = alert.condition === 'above'
  const ticker       = tickers[alert.symbol]
  const current      = ticker?.price ?? alert.currentPrice
  const distPct      = current && alert.status === 'active'
    ? ((alert.targetPrice - current) / current * 100)
    : null

  const symInfo = QUICK_SYMBOLS.find(s => s.symbol === alert.symbol)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 16,
      background: alert.status === 'triggered'
        ? 'rgba(0,200,120,0.04)'
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${alert.status === 'triggered' ? 'rgba(0,200,120,0.15)' : 'rgba(255,255,255,0.07)'}`,
    }}>
      {/* Direction icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: isAbove ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke={isAbove ? '#00c878' : '#ff3047'} strokeWidth={2.5}>
          {isAbove ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
          {symInfo && (
            <span style={{ marginRight: 2 }}>
              <AssetIcon symbol={alert.symbol} assetClass={symInfo.assetClass} size={16} />
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{alert.symbol}</span>
          <span style={{ fontSize: 12, color: isAbove ? '#00c878' : '#ff3047', fontWeight: 600 }}>
            {isAbove ? '↑ Above' : '↓ Below'} {formatPrice(alert.targetPrice, alert.symbol)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {current !== undefined && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              Now {formatPrice(current, alert.symbol)}
            </span>
          )}
          {distPct !== null && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
            }}>
              {distPct > 0 ? '+' : ''}{distPct.toFixed(2)}% to target
            </span>
          )}
          {alert.note && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {alert.note}
            </span>
          )}
          {alert.triggeredAt && (
            <span style={{ fontSize: 10, color: 'rgba(0,200,120,0.7)' }}>
              Triggered {new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Status + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: sc.bg, color: sc.color, whiteSpace: 'nowrap',
        }}>
          {sc.label}
        </span>
        {alert.status === 'triggered' && (
          <button
            onClick={() => onDismiss(alert.id)}
            title="Dismiss"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
              color: '#38bdf8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          title="Delete"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,48,71,0.07)', border: '1px solid rgba(255,48,71,0.18)',
            color: '#ff7080', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { alerts, dismissAlert, deleteAlert } = useAlertsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter]         = useState<'all' | 'active' | 'triggered' | 'dismissed'>('all')

  const activeCount    = alerts.filter(a => a.status === 'active').length
  const triggeredCount = alerts.filter(a => a.status === 'triggered').length
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.status === filter)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t-text-1)', margin: 0 }}>Price Alerts</h1>
          <p style={{ fontSize: 13, color: 'var(--t-text-2)', margin: '4px 0 0' }}>
            {activeCount > 0 ? `${activeCount} active` : 'No active alerts'}
            {triggeredCount > 0 && (
              <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: 'rgba(0,200,120,0.15)', color: '#00c878', fontSize: 11, fontWeight: 700 }}>
                {triggeredCount} triggered
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 24,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(14,165,233,0.3)',
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Alert
        </button>
      </div>

      {/* ── Filter tabs ── */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {(['all', 'active', 'triggered', 'dismissed'] as const).map(s => {
            const count   = s === 'all' ? alerts.length : alerts.filter(a => a.status === s).length
            const isActive = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  flexShrink: 0, cursor: 'pointer', textTransform: 'capitalize',
                  background: isActive ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.04)',
                  color:      isActive ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${isActive ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                {s}&nbsp;<span style={{ opacity: 0.65 }}>({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Alert list / empty state ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          background: 'rgba(255,255,255,0.02)', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="rgba(14,165,233,0.6)" strokeWidth={1.5}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            {filter === 'all' ? 'No alerts yet' : `No ${filter} alerts`}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 28px', lineHeight: 1.5 }}>
            Set a target price on any instrument and we'll notify you the moment it's reached.
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '11px 28px', borderRadius: 24,
                background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
                color: '#38bdf8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Create your first alert
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => (
            <AlertCard
              key={a.id}
              alert={a}
              onDelete={deleteAlert}
              onDismiss={dismissAlert}
            />
          ))}
        </div>
      )}

      {/* ── Create sheet ── */}
      {showCreate && <CreateSheet onClose={() => setShowCreate(false)} />}
    </div>
  )
}
