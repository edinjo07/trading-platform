import React, { useEffect, useMemo, useState } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { formatDate, formatPrice, formatCurrency } from '../utils/formatters'
import type { Order } from '../types'

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

function exportOrdersToCSV(orders: Order[]) {
  const headers = ['ID', 'Symbol', 'Type', 'Side', 'Quantity', 'Fill Price', 'Value', 'Commission', 'Status', 'Created']
  const rows = orders.map(o => [
    o.id, o.symbol, o.type, o.side, o.quantity, o.fill_price,
    (o.quantity * (o.fill_price || 0)).toFixed(2), (o.commission ?? 0).toFixed(2),
    o.status, formatDate(o.created_at),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tradex-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '13px 15px' }}>
      <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 19, fontWeight: 800, color: color ?? S.text1, margin: 0, fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  )
}

// ── Segmented control ───────────────────────────────────────────────────────────
function Segment<T extends string>({ options, value, onChange }: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 10, background: 'rgba(var(--ink),0.04)', border: `1px solid ${S.border}` }}>
      {options.map(o => {
        const active = value === o.key
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active ? S.surface : 'transparent', color: active ? S.text1 : S.text3, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: active ? 'var(--t-shadow-sm)' : 'none' }}>
            {o.label}
            {o.count != null && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: active ? S.accent : 'rgba(var(--ink),0.1)', color: active ? '#fff' : S.text3 }}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const COLS = '1.5fr 0.8fr 0.9fr 1.1fr 1.1fr 1fr 1.2fr 0.9fr 1.1fr'
const HEAD: { l: string; align?: 'right' }[] = [
  { l: 'Instrument' }, { l: 'Side' }, { l: 'Qty', align: 'right' }, { l: 'Fill Price', align: 'right' },
  { l: 'Value', align: 'right' }, { l: 'Comm.', align: 'right' }, { l: 'SL / TP' }, { l: 'Status' }, { l: 'Time', align: 'right' },
]

export default function OrdersPage() {
  const { orders, loadOrders } = useTradingStore()
  const [status, setStatus] = useState<'all' | 'filled' | 'rejected'>('all')
  const [side, setSide]     = useState<'all' | 'buy' | 'sell'>('all')
  const [query, setQuery]   = useState('')
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())

  const refresh = () => Promise.resolve(loadOrders()).then(() => setLastUpdated(Date.now()))

  useEffect(() => {
    loadOrders(); setLastUpdated(Date.now())
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrders])

  // ── Aggregates ──
  const kpis = useMemo(() => {
    const filled   = orders.filter(o => o.status === 'filled')
    const rejected = orders.filter(o => o.status === 'rejected')
    const buys     = orders.filter(o => o.side === 'buy').length
    const sells    = orders.filter(o => o.side === 'sell').length
    const volume   = filled.reduce((s, o) => s + o.quantity * (o.fill_price || 0), 0)
    const comm     = orders.reduce((s, o) => s + (o.commission ?? 0), 0)
    return { total: orders.length, filled: filled.length, rejected: rejected.length, buys, sells, volume, comm }
  }, [orders])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    return orders.filter(o =>
      (status === 'all' || o.status === status) &&
      (side === 'all' || o.side === side) &&
      (q === '' || o.symbol.toUpperCase().includes(q)))
  }, [orders, status, side, query])

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--t-bg)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 100px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>Orders</h1>
            <p style={{ fontSize: 13, color: S.text3, margin: '3px 0 0' }}>Execution history across this account</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 9, background: 'var(--t-bull-s)', border: `1px solid ${S.bull}33` }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: S.bull }} className="animate-pulse2" />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: S.bull }}>LIVE</span>
              <span style={{ fontSize: 10.5, color: S.text3, fontFamily: 'ui-monospace,monospace' }}>
                {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <button onClick={refresh}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, background: 'var(--t-accent-s)', border: `1px solid ${S.accent}33`, color: S.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
            <button onClick={() => exportOrdersToCSV(orders)} disabled={orders.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, background: 'var(--t-bull-s)', border: `1px solid ${S.bull}33`, color: S.bull, fontSize: 12, fontWeight: 700, cursor: orders.length === 0 ? 'not-allowed' : 'pointer', opacity: orders.length === 0 ? 0.5 : 1 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5" style={{ gap: 12, marginBottom: 18 }}>
          <Kpi label="Total Orders" value={String(kpis.total)} />
          <Kpi label="Filled"       value={String(kpis.filled)}   color={S.bull} />
          <Kpi label="Rejected"     value={String(kpis.rejected)} color={kpis.rejected > 0 ? S.bear : undefined} />
          <Kpi label="Buy / Sell"   value={`${kpis.buys} / ${kpis.sells}`} />
          <Kpi label="Volume Traded" value={formatCurrency(kpis.volume)} />
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Segment value={status} onChange={setStatus} options={[
            { key: 'all', label: 'All', count: kpis.total },
            { key: 'filled', label: 'Filled', count: kpis.filled },
            { key: 'rejected', label: 'Rejected', count: kpis.rejected },
          ]} />
          <Segment value={side} onChange={setSide} options={[
            { key: 'all', label: 'All sides' },
            { key: 'buy', label: 'Buy' },
            { key: 'sell', label: 'Sell' },
          ]} />
          <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={S.text3} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search symbol…"
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, background: S.surface, border: `1px solid ${S.border}`, color: S.text1, fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--ink),0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.text3 }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: S.text1, margin: 0 }}>{orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}</p>
            <p style={{ fontSize: 13, color: S.text3, margin: 0, textAlign: 'center', maxWidth: 280 }}>
              {orders.length === 0 ? 'Orders you place will appear here as an execution log.' : 'Try clearing the status, side, or search filters.'}
            </p>
          </div>
        ) : (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 920 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '12px 18px', borderBottom: `1px solid ${S.border}`, background: 'rgba(var(--ink),0.015)' }}>
                  {HEAD.map((h, i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h.align ?? 'left' }}>{h.l}</span>
                  ))}
                </div>
                {/* Rows */}
                {filtered.map((o, idx) => {
                  const buy = o.side === 'buy'
                  const filled = o.status === 'filled'
                  const value = o.quantity * (o.fill_price || 0)
                  const cellR: React.CSSProperties = { fontSize: 13, color: S.text1, fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }
                  return (
                    <div key={o.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '13px 18px', alignItems: 'center', borderBottom: idx === filtered.length - 1 ? 'none' : `1px solid ${S.border}` }}>
                      {/* Instrument */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span style={{ width: 3, height: 26, borderRadius: 99, background: buy ? S.bull : S.bear, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: S.text1 }}>{o.symbol}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: S.text3, textTransform: 'capitalize' }}>{o.type}{o.leverage > 1 ? ` · ${o.leverage}x` : ''}</div>
                        </div>
                      </div>
                      {/* Side */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 7, background: buy ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: buy ? S.bull : S.bear }}>{o.side.toUpperCase()}</span>
                      </div>
                      <span style={cellR}>{o.quantity.toFixed(o.quantity < 1 ? 4 : 2)}</span>
                      <span style={cellR}>{o.fill_price ? formatPrice(o.fill_price, o.symbol) : '—'}</span>
                      <span style={{ ...cellR, color: S.text2 }}>{formatCurrency(value)}</span>
                      <span style={{ ...cellR, color: S.text3 }}>{o.commission ? formatCurrency(o.commission) : '—'}</span>
                      {/* SL / TP */}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {o.stop_loss != null && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--t-bear-s)', color: S.bear, fontFamily: 'ui-monospace,monospace' }}>SL</span>}
                        {o.take_profit != null && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--t-bull-s)', color: S.bull, fontFamily: 'ui-monospace,monospace' }}>TP</span>}
                        {o.stop_loss == null && o.take_profit == null && <span style={{ fontSize: 11, color: S.text3 }}>—</span>}
                      </div>
                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, textTransform: 'capitalize', background: filled ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: filled ? S.bull : S.bear }}>
                          <span style={{ width: 5, height: 5, borderRadius: 99, background: filled ? S.bull : S.bear }} />
                          {o.status}
                        </span>
                      </div>
                      <span style={{ ...cellR, color: S.text3, fontSize: 11.5, textAlign: 'right' }}>{formatDate(o.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
