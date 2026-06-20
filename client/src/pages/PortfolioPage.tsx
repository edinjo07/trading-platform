import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice, formatPnl } from '../utils/formatters'
import type { Position, Order } from '../types'

// ── Theme palette (all tokens flip with light/dark) ───────────────────────────
const S = {
  surface:  'var(--t-surface)',
  surface2: 'var(--t-surface-2)',
  border:   'var(--t-border)',
  borderH:  'var(--t-border-hover)',
  text1:    'var(--t-text-1)',
  text2:    'var(--t-text-2)',
  text3:    'var(--t-text-3)',
  bull:     'var(--t-bull)',
  bear:     'var(--t-bear)',
  warn:     'var(--t-warn)',
  accent:   'var(--t-accent)',
}
const pnlCol = (v: number) => (v >= 0 ? S.bull : S.bear)
const sign   = (v: number) => (v >= 0 ? '+' : '')

// Distinct hues for the exposure breakdown
const HUES = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#14b8a6', '#f43f5e', '#a3e635']

// ───────────────────────────────────────────────────────────────────────────────
// Small metric tile
// ───────────────────────────────────────────────────────────────────────────────
function Metric({ label, value, color, mono = true, sub }: {
  label: string; value: string; color?: string; mono?: boolean; sub?: string
}) {
  return (
    <div>
      <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: color ?? S.text1, margin: 0, fontFamily: mono ? 'ui-monospace,monospace' : 'inherit', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: S.text3, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Margin-level health gauge
// ───────────────────────────────────────────────────────────────────────────────
function MarginGauge({ level }: { level: number | null }) {
  if (level === null) {
    return (
      <div>
        <p style={{ fontSize: 10.5, color: S.text3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Margin Level</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: S.text2, margin: 0 }}>—</p>
        <p style={{ fontSize: 10.5, color: S.text3, margin: '3px 0 0' }}>No leverage in use</p>
      </div>
    )
  }
  // Health: ≥200% comfortable, 100–200% caution, <100% danger (closeout ≤50%)
  const color = level >= 200 ? S.bull : level >= 100 ? S.warn : S.bear
  const label = level >= 200 ? 'Healthy' : level >= 100 ? 'Caution' : level > 50 ? 'At risk' : 'Closeout'
  const fill  = Math.max(4, Math.min(100, (level / 300) * 100))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 10.5, color: S.text3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Margin Level</p>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color, margin: '0 0 6px', fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums' }}>
        {level >= 1000 ? `${Math.round(level)}%` : `${level.toFixed(1)}%`}
      </p>
      <div style={{ position: 'relative', height: 5, borderRadius: 99, background: 'rgba(var(--ink),0.08)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${fill}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
        {/* 100% caution marker */}
        <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${(100 / 300) * 100}%`, width: 1.5, background: 'rgba(var(--ink),0.35)' }} />
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Exposure / allocation breakdown
// ───────────────────────────────────────────────────────────────────────────────
function ExposureCard({ positions, currency }: { positions: Position[]; currency: string }) {
  const items = useMemo(() => {
    const total = positions.reduce((s, p) => s + Math.abs(p.notionalValue || 0), 0)
    if (total <= 0) return null
    return {
      total,
      rows: positions
        .map((p, i) => ({
          symbol: p.symbol,
          side: p.side,
          notional: Math.abs(p.notionalValue || 0),
          pct: (Math.abs(p.notionalValue || 0) / total) * 100,
          hue: HUES[i % HUES.length],
        }))
        .sort((a, b) => b.notional - a.notional),
    }
  }, [positions])

  if (!items) return null

  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: S.text1, margin: 0 }}>Exposure by instrument</p>
        <span style={{ fontSize: 11, color: S.text3, fontFamily: 'ui-monospace,monospace' }}>
          {formatCurrency(items.total, 2, currency)} notional
        </span>
      </div>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
        {items.rows.map(r => (
          <div key={r.symbol} title={`${r.symbol} · ${r.pct.toFixed(1)}%`}
            style={{ width: `${r.pct}%`, background: r.hue, minWidth: 3 }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
        {items.rows.map(r => (
          <div key={r.symbol} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: r.hue, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: S.text1 }}>{r.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6, color: r.side === 'long' ? S.bull : S.bear, background: r.side === 'long' ? 'var(--t-bull-s)' : 'var(--t-bear-s)' }}>
              {r.side === 'long' ? 'LONG' : 'SHORT'}
            </span>
            <span style={{ fontSize: 11, color: S.text3, fontFamily: 'ui-monospace,monospace' }}>{r.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Inline SL / TP editor (expands under a position row)
// ───────────────────────────────────────────────────────────────────────────────
function SltpEditor({ pos, currency, onDone }: { pos: Position; currency: string; onDone: () => void }) {
  const { updatePositionSltp } = useTradingStore()
  const isLong = pos.side === 'long'
  const price  = pos.currentPrice
  const entry  = pos.avg_price

  const [slVal, setSlVal] = useState(pos.stop_loss   != null ? String(pos.stop_loss)   : '')
  const [tpVal, setTpVal] = useState(pos.take_profit != null ? String(pos.take_profit) : '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const slNum = slVal.trim() === '' ? null : parseFloat(slVal)
  const tpNum = tpVal.trim() === '' ? null : parseFloat(tpVal)

  const slError = slNum !== null && !isNaN(slNum)
    ? isLong ? (slNum >= price ? `Must be below ${formatPrice(price, pos.symbol)}` : '')
             : (slNum <= price ? `Must be above ${formatPrice(price, pos.symbol)}` : '')
    : ''
  const tpError = tpNum !== null && !isNaN(tpNum)
    ? isLong ? (tpNum <= price ? `Must be above ${formatPrice(price, pos.symbol)}` : '')
             : (tpNum >= price ? `Must be below ${formatPrice(price, pos.symbol)}` : '')
    : ''

  const canSave = !slError && !tpError && !saving
  const estSlPnl = slNum != null && !isNaN(slNum) ? (isLong ? slNum - entry : entry - slNum) * pos.quantity : null
  const estTpPnl = tpNum != null && !isNaN(tpNum) ? (isLong ? tpNum - entry : entry - tpNum) * pos.quantity : null

  const handleSave = async () => {
    setSaveError('')
    if (slError || tpError) return
    setSaving(true)
    try {
      await updatePositionSltp(pos.id, tpNum, slNum)
      onDone()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const field = (val: string, set: (v: string) => void, err: string, est: number | null, accent: string, label: string, hint: string) => {
    const invalid = err !== ''
    const valid   = val.trim() !== '' && !invalid
    return (
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{label}</span>
          <span style={{ fontSize: 10, color: S.text3 }}>{hint}</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="—"
            style={{
              flex: 1, minWidth: 0, background: 'rgba(var(--ink),0.05)',
              border: `1px solid ${invalid ? S.bear : valid ? accent : S.border}`,
              borderRadius: 9, color: S.text1, fontSize: 14, padding: '9px 12px',
              outline: 'none', fontFamily: 'ui-monospace,monospace',
            }} />
          {val.trim() !== '' && (
            <button onClick={() => set('')} title="Remove"
              style={{ background: 'rgba(var(--ink),0.05)', border: `1px solid ${S.border}`, borderRadius: 7, color: S.text3, fontSize: 14, padding: '0 11px', cursor: 'pointer' }}>✕</button>
          )}
        </div>
        {invalid ? (
          <p style={{ fontSize: 10.5, color: S.bear, margin: '4px 0 0' }}>{err}</p>
        ) : est != null ? (
          <p style={{ fontSize: 10.5, margin: '4px 0 0', color: pnlCol(est), fontFamily: 'ui-monospace,monospace' }}>
            est. {sign(est)}{formatCurrency(est, 2, currency)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(var(--ink),0.025)', border: `1px solid ${S.border}` }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {field(slVal, setSlVal, slError, estSlPnl, S.bear, 'Stop Loss', isLong ? 'below market' : 'above market')}
        {field(tpVal, setTpVal, tpError, estTpPnl, S.bull, 'Take Profit', isLong ? 'above market' : 'below market')}
      </div>
      {saveError && (
        <p style={{ fontSize: 11, color: S.bear, margin: '0 0 10px', padding: '6px 10px', background: 'var(--t-bear-s)', borderRadius: 6 }}>{saveError}</p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={!canSave}
          style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: canSave ? S.accent : 'rgba(var(--ink),0.06)',
            color: canSave ? '#fff' : S.text3, fontSize: 13, fontWeight: 700,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button onClick={onDone}
          style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(var(--ink),0.05)', border: `1px solid ${S.border}`, color: S.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Positions table (desktop) — horizontal scroll on narrow screens
// ───────────────────────────────────────────────────────────────────────────────
const COLS = '1.4fr 0.9fr 1fr 1fr 1.3fr 1fr 1.2fr auto'
const HEAD: { l: string; align?: 'right' }[] = [
  { l: 'Instrument' }, { l: 'Units', align: 'right' }, { l: 'Open', align: 'right' },
  { l: 'Current', align: 'right' }, { l: 'SL / TP' }, { l: 'Margin', align: 'right' },
  { l: 'P&L', align: 'right' }, { l: '' },
]

function PositionsTable({ positions, currency, onClose, closingId }: {
  positions: Position[]; currency: string; onClose: (id: string) => void; closingId: string | null
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const cell: React.CSSProperties = { fontSize: 13, color: S.text1, fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center' }

  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 820 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '12px 18px', borderBottom: `1px solid ${S.border}`, background: 'rgba(var(--ink),0.015)' }}>
            {HEAD.map((h, i) => (
              <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h.align ?? 'left' }}>{h.l}</span>
            ))}
          </div>
          {/* Rows */}
          {positions.map((pos, idx) => {
            const isLong = pos.side === 'long'
            const closing = closingId === pos.id
            const editing = editingId === pos.id
            return (
              <div key={pos.id} style={{ borderBottom: idx === positions.length - 1 ? 'none' : `1px solid ${S.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 14, padding: '13px 18px', alignItems: 'center' }}>
                  {/* Instrument */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 3, height: 26, borderRadius: 99, background: isLong ? S.bull : S.bear, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: S.text1 }}>{pos.symbol}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: isLong ? S.bull : S.bear }}>{isLong ? 'BUY' : 'SELL'}</span>
                        {pos.leverage > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: S.text3 }}>· {pos.leverage}x</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{ ...cell, justifyContent: 'flex-end' }}>{pos.quantity.toFixed(pos.quantity < 1 ? 4 : 2)}</span>
                  <span style={{ ...cell, justifyContent: 'flex-end' }}>{formatPrice(pos.avg_price, pos.symbol)}</span>
                  <span style={{ ...cell, justifyContent: 'flex-end' }}>{formatPrice(pos.currentPrice, pos.symbol)}</span>
                  {/* SL/TP chips */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {pos.stop_loss != null && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: 'var(--t-bear-s)', color: S.bear, fontFamily: 'ui-monospace,monospace' }}>SL {formatPrice(pos.stop_loss, pos.symbol)}</span>
                    )}
                    {pos.take_profit != null && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: 'var(--t-bull-s)', color: S.bull, fontFamily: 'ui-monospace,monospace' }}>TP {formatPrice(pos.take_profit, pos.symbol)}</span>
                    )}
                    {pos.stop_loss == null && pos.take_profit == null && <span style={{ fontSize: 11, color: S.text3 }}>—</span>}
                  </div>
                  <span style={{ ...cell, justifyContent: 'flex-end', color: S.text2 }}>{formatCurrency(pos.margin, 2, currency)}</span>
                  {/* P&L */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: pnlCol(pos.unrealizedPnl), fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {sign(pos.unrealizedPnl)}{formatCurrency(pos.unrealizedPnl, 2, currency)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pnlCol(pos.unrealizedPnl), fontFamily: 'ui-monospace,monospace' }}>
                      {sign(pos.unrealizedPnlPct)}{pos.unrealizedPnlPct.toFixed(2)}%
                    </span>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingId(editing ? null : pos.id)} title="Edit SL / TP"
                      style={{ padding: '7px 9px', borderRadius: 8, background: editing ? S.accent : 'rgba(var(--ink),0.05)', border: `1px solid ${editing ? S.accent : S.border}`, color: editing ? '#fff' : S.text2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button disabled={closing} onClick={() => onClose(pos.id)}
                      style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--t-bear-s)', border: `1px solid ${S.bear}`, color: S.bear, fontSize: 12, fontWeight: 700, cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.5 : 1 }}>
                      {closing ? '…' : 'Close'}
                    </button>
                  </div>
                </div>
                {editing && (
                  <div style={{ padding: '0 18px 16px' }}>
                    <SltpEditor pos={pos} currency={currency} onDone={() => setEditingId(null)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Order row
// ───────────────────────────────────────────────────────────────────────────────
function OrderRow({ order, last }: { order: Order; last: boolean }) {
  const isBuy = order.side === 'buy'
  const filled = order.status === 'filled'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: last ? 'none' : `1px solid ${S.border}` }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: isBuy ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: isBuy ? S.bull : S.bear, fontSize: 10, fontWeight: 800 }}>
        {order.side.toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0 }}>{order.symbol}</p>
        <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0', fontFamily: 'ui-monospace,monospace' }}>
          {order.quantity} units · {order.fill_price ? formatPrice(order.fill_price, order.symbol) : 'market'}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: filled ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: filled ? S.bull : S.bear, textTransform: 'capitalize' }}>{order.status}</span>
        <p style={{ fontSize: 10.5, color: S.text3, margin: '5px 0 0', whiteSpace: 'nowrap' }}>
          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Empty state
// ───────────────────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, desc, cta, onCta }: { icon: React.ReactNode; title: string; desc: string; cta?: string; onCta?: () => void }) {
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--ink),0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.text3 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: S.text1, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: S.text3, margin: 0, textAlign: 'center', maxWidth: 280 }}>{desc}</p>
      {cta && (
        <button onClick={onCta}
          style={{ marginTop: 6, padding: '10px 22px', borderRadius: 10, background: S.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{cta}</button>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────────────────
type Tab = 'positions' | 'orders' | 'alerts'

export default function PortfolioPage() {
  const navigate = useNavigate()
  const { portfolio, orders, loadPortfolio, loadOrders, closePosition } = useTradingStore()
  const { user } = useAuthStore()
  const currency = user?.currency ?? 'USD'

  const [tab, setTab] = useState<Tab>('positions')
  const [closingId, setClosingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())

  const refresh = useCallback(() => {
    Promise.resolve(loadPortfolio()).then(() => setLastUpdated(Date.now()))
  }, [loadPortfolio])

  useEffect(() => {
    loadPortfolio(); loadOrders(); setLastUpdated(Date.now())
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders, refresh])

  const positions = portfolio?.positions ?? []
  const equity     = portfolio?.totalEquity  ?? user?.balance ?? 0
  const cash       = portfolio?.cashBalance  ?? 0
  const marginUsed = portfolio?.totalMargin  ?? 0
  const upnl       = portfolio?.unrealizedPnl ?? 0
  const rpnl       = portfolio?.realizedPnl   ?? 0
  const marginLevel = marginUsed > 0 ? (equity / marginUsed) * 100 : null
  const totalPnl   = upnl + rpnl

  const handleClose = async (id: string) => {
    if (closingId) return
    setClosingId(id)
    try { await closePosition(id) } finally { setClosingId(null) }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'positions', label: 'Open Positions', count: positions.length },
    { key: 'orders',    label: 'Order History',  count: orders.length },
    { key: 'alerts',    label: 'Price Alerts' },
  ]

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 100px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>Portfolio</h1>
            <p style={{ fontSize: 13, color: S.text3, margin: '3px 0 0' }}>Open positions, exposure &amp; account health</p>
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
            <button onClick={() => navigate('/dashboard/analytics')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, background: 'rgba(var(--ink),0.05)', border: `1px solid ${S.border}`, color: S.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Analytics
            </button>
          </div>
        </div>

        {/* ── Equity hero ─────────────────────────────────────────────────── */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, padding: 22, marginBottom: 16, boxShadow: 'var(--t-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: S.text3, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Total Equity</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: S.text1, fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {formatCurrency(equity, 2, currency)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: totalPnl >= 0 ? 'var(--t-bull-s)' : 'var(--t-bear-s)', color: pnlCol(totalPnl), fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace,monospace' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    {totalPnl >= 0 ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                  {sign(totalPnl)}{formatCurrency(totalPnl, 2, currency)}
                </span>
              </div>
            </div>
            {(upnl !== 0 || positions.length > 0) && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: S.text3, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Open P&amp;L · {positions.length} pos</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 20, fontWeight: 800, color: pnlCol(upnl), fontFamily: 'ui-monospace,monospace', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: pnlCol(upnl) }} className="animate-pulse2" />
                  {sign(upnl)}{formatCurrency(upnl, 2, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Metric strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 22, paddingTop: 20, borderTop: `1px solid ${S.border}` }}>
            <Metric label="Available" value={formatCurrency(cash, 2, currency)} sub="Free to trade" />
            <Metric label="Margin Used" value={formatCurrency(marginUsed, 2, currency)} sub={`${positions.length} open`} />
            <Metric label="Unrealised P&L" value={`${sign(upnl)}${formatCurrency(upnl, 2, currency)}`} color={pnlCol(upnl)} />
            <Metric label="Realised P&L" value={`${sign(rpnl)}${formatCurrency(rpnl, 2, currency)}`} color={pnlCol(rpnl)} />
            <MarginGauge level={marginLevel} />
          </div>
        </div>

        {/* ── Exposure ────────────────────────────────────────────────────── */}
        {positions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <ExposureCard positions={positions} currency={currency} />
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: 4, borderRadius: 12, background: 'rgba(var(--ink),0.035)', border: `1px solid ${S.border}`, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: active ? S.surface : 'transparent',
                  color: active ? S.text1 : S.text3, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  boxShadow: active ? 'var(--t-shadow-sm)' : 'none', transition: 'all 0.15s',
                }}>
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: active ? S.accent : 'rgba(var(--ink),0.12)', color: active ? '#fff' : S.text2 }}>{t.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        {tab === 'positions' && (
          positions.length === 0
            ? <EmptyState
                icon={<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="4"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                title="No open positions"
                desc="Explore the markets and place your first trade to start building your portfolio."
                cta="Browse markets" onCta={() => navigate('/dashboard/trade')} />
            : <PositionsTable positions={positions} currency={currency} onClose={handleClose} closingId={closingId} />
        )}

        {tab === 'orders' && (
          orders.length === 0
            ? <EmptyState
                icon={<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
                title="No orders yet"
                desc="Your executed and pending orders will appear here." />
            : <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, overflow: 'hidden' }}>
                {orders.slice(0, 50).map((o: Order, i, arr) => (
                  <OrderRow key={o.id} order={o} last={i === arr.length - 1} />
                ))}
              </div>
        )}

        {tab === 'alerts' && (
          <EmptyState
            icon={<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>}
            title="Manage your price alerts"
            desc="Get notified the moment a price level is reached — set and review alerts on the Alerts page."
            cta="Go to Alerts" onCta={() => navigate('/dashboard/alerts')} />
        )}
      </div>
    </div>
  )
}
