import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice, formatPnl } from '../utils/formatters'
import type { Position, Order } from '../types'

// ─── No-content empty state ────────────────────────────────────────────────────
function EmptyTrades({ onExplore }: { onExplore: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.25)" strokeWidth={1.3}>
          <circle cx="11" cy="11" r="8"/><circle cx="11" cy="11" r="4"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>No open trades</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, textAlign: 'center' }}>
        Explore our markets for trading ideas
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {['↑ Top risers', '↓ Top fallers', '★ Most traded', '⋯ More'].map(label => (
          <button
            key={label}
            onClick={onExplore}
            style={{
              padding: '9px 18px', borderRadius: 22, fontSize: 12, fontWeight: 700,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Position row ─────────────────────────────────────────────────────────────
function PositionRow({ pos, onClose, closing, currency }: { pos: Position; onClose: () => void; closing: boolean; currency: string }) {
  const { updatePositionSltp } = useTradingStore()
  const isLong   = pos.side === 'long'
  const pnlColor = pos.unrealizedPnl >= 0 ? '#00c878' : '#ff3047'

  const [editing,   setEditing]   = useState(false)
  const [slVal,     setSlVal]     = useState(pos.stop_loss  != null ? String(pos.stop_loss)  : '')
  const [tpVal,     setTpVal]     = useState(pos.take_profit != null ? String(pos.take_profit) : '')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')

  const openEdit = useCallback(() => {
    setSlVal(pos.stop_loss   != null ? String(pos.stop_loss)   : '')
    setTpVal(pos.take_profit != null ? String(pos.take_profit) : '')
    setSaveError('')
    setEditing(true)
  }, [pos.stop_loss, pos.take_profit])

  const handleSave = async () => {
    setSaveError('')
    const sl = slVal.trim() === '' ? null : parseFloat(slVal)
    const tp = tpVal.trim() === '' ? null : parseFloat(tpVal)
    if (sl !== null && isNaN(sl)) { setSaveError('Invalid stop loss'); return }
    if (tp !== null && isNaN(tp)) { setSaveError('Invalid take profit'); return }
    setSaving(true)
    try {
      await updatePositionSltp(pos.id, tp, sl)
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputSty: React.CSSProperties = {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: '#fff', fontSize: 13, padding: '8px 10px', outline: 'none',
    fontFamily: 'monospace', minWidth: 0,
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{pos.symbol}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: isLong ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
            color: isLong ? '#00c878' : '#ff3047',
          }}>
            {isLong ? 'BUY' : 'SELL'}
          </span>
          {pos.leverage > 1 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
              {pos.leverage}x
            </span>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: pnlColor }}>
          {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl, 2, currency)}
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'Units',   v: pos.quantity.toFixed(pos.quantity < 1 ? 4 : 2) },
          { l: 'Open',    v: formatPrice(pos.avg_price, pos.symbol)          },
          { l: 'Current', v: formatPrice(pos.currentPrice, pos.symbol)       },
          { l: 'P&L %',   v: (pos.unrealizedPnlPct >= 0 ? '+' : '') + pos.unrealizedPnlPct.toFixed(2) + '%' },
        ].map(({ l, v }) => (
          <div key={l}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{l}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'monospace' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* SL / TP summary chips */}
      {!editing && (pos.stop_loss != null || pos.take_profit != null) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {pos.stop_loss != null && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,48,71,0.1)', border: '1px solid rgba(255,48,71,0.2)', color: '#ff7080', fontFamily: 'monospace' }}>
              SL {formatPrice(pos.stop_loss, pos.symbol)}
            </span>
          )}
          {pos.take_profit != null && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.2)', color: '#00c878', fontFamily: 'monospace' }}>
              TP {formatPrice(pos.take_profit, pos.symbol)}
            </span>
          )}
        </div>
      )}

      {/* Inline SL/TP edit panel */}
      {editing && (
        <div style={{ marginBottom: 10, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {/* Stop Loss */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 10, color: '#ff7080', fontWeight: 700, display: 'block', marginBottom: 4 }}>Stop Loss</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number" value={slVal}
                  onChange={e => setSlVal(e.target.value)}
                  placeholder={pos.stop_loss != null ? String(pos.stop_loss) : 'None'}
                  style={inputSty}
                />
                {slVal !== '' && (
                  <button onClick={() => setSlVal('')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#888', fontSize: 14, padding: '0 8px', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            </div>
            {/* Take Profit */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 10, color: '#00c878', fontWeight: 700, display: 'block', marginBottom: 4 }}>Take Profit</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number" value={tpVal}
                  onChange={e => setTpVal(e.target.value)}
                  placeholder={pos.take_profit != null ? String(pos.take_profit) : 'None'}
                  style={inputSty}
                />
                {tpVal !== '' && (
                  <button onClick={() => setTpVal('')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#888', fontSize: 14, padding: '0 8px', cursor: 'pointer' }}>✕</button>
                )}
              </div>
            </div>
          </div>
          {saveError && (
            <p style={{ fontSize: 11, color: '#ff7080', margin: '0 0 8px' }}>{saveError}</p>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#1a6fff', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >{saving ? 'Saving…' : 'Save'}</button>
            <button
              onClick={() => setEditing(false)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Footer: margin + liq + edit + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Margin</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', margin: 0, fontFamily: 'monospace' }}>{formatCurrency(pos.margin, 2, currency)}</p>
          </div>
          {pos.leverage > 1 && (
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Liq.</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#ff3047', margin: 0, fontFamily: 'monospace' }}>{formatPrice(pos.liquidationPrice, pos.symbol)}</p>
            </div>
          )}
          {pos.notionalValue > 0 && (
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Notional</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', margin: 0, fontFamily: 'monospace' }}>{formatCurrency(pos.notionalValue, 2, currency)}</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!editing && (
            <button
              onClick={openEdit}
              title="Edit SL / TP"
              style={{
                padding: '8px 12px', borderRadius: 22, fontSize: 12, fontWeight: 700,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          )}
          <button
            disabled={closing}
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 22, fontSize: 12, fontWeight: 700,
              background: 'rgba(255,48,71,0.12)', border: '1px solid rgba(255,48,71,0.3)',
              color: '#ff3047', cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.5 : 1,
            }}
          >
            {closing ? '…' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order }: { order: Order }) {
  const isBuy = order.side === 'buy'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isBuy ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
        color: isBuy ? '#00c878' : '#ff3047', fontSize: 10, fontWeight: 800,
      }}>
        {order.side.toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{order.symbol}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {order.quantity} units · {order.fill_price ? formatPrice(order.fill_price, order.symbol) : '—'}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: order.status === 'filled' ? 'rgba(0,200,120,0.12)' : 'rgba(255,48,71,0.12)',
          color: order.status === 'filled' ? '#00c878' : '#ff3047',
        }}>{order.status}</span>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', whiteSpace: 'nowrap' }}>
          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' '}
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Account summary bar ──────────────────────────────────────────────────────
function AccountBar() {
  const { portfolio } = useTradingStore()
  const { user } = useAuthStore()
  const currency = user?.currency ?? 'USD'
  const equity  = portfolio?.totalEquity  ?? user?.balance ?? 0
  const cash    = portfolio?.cashBalance  ?? 0
  const upnl    = portfolio?.unrealizedPnl ?? 0
  const rpnl    = portfolio?.realizedPnl   ?? 0

  const items = [
    { l: 'Equity',     v: formatCurrency(equity, 2, currency), c: '#fff'    },
    { l: 'Available',  v: formatCurrency(cash, 2, currency),   c: '#fff'    },
    { l: 'Unrealised', v: formatPnl(upnl, currency),           c: upnl >= 0 ? '#00c878' : '#ff3047' },
    { l: 'Realised',   v: formatPnl(rpnl, currency),           c: rpnl >= 0 ? '#00c878' : '#ff3047' },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12,
      marginBottom: 16,
    }}>
      {items.map(({ l, v, c }) => (
        <div key={l}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '0 0 3px' }}>{l}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: c, margin: 0, fontFamily: 'monospace' }}>{v}</p>
        </div>
      ))}
    </div>
  )
}

type Tab = 'trades' | 'orders' | 'alerts'

export default function PortfolioPage() {
  const navigate = useNavigate()
  const { portfolio, orders, loadPortfolio, loadOrders, closePosition } = useTradingStore()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('trades')
  const [closingId, setClosingId] = useState<string | null>(null)

  const equity = portfolio?.totalEquity ?? user?.balance ?? 0

  useEffect(() => {
    loadPortfolio(); loadOrders()
    const id = setInterval(loadPortfolio, 5000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders])

  const positions = portfolio?.positions ?? []

  const handleClose = async (id: string) => {
    setClosingId(id)
    try { await closePosition(id) } finally { setClosingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#000' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px 0',
      }}>
        {/* Balance row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px',
              display: 'flex', alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                {formatCurrency(equity, 2, user?.currency ?? 'USD')}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/analytics')}
            style={{
              marginLeft: 10, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Analytics
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['trades', 'orders', 'alerts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t ? '2px solid #fff' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t}
              {t === 'trades' && positions.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  {positions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 16px 100px' }}>

        {/* Account summary */}
        <AccountBar />

        {tab === 'trades' && (
          positions.length === 0
            ? <EmptyTrades onExplore={() => navigate('/dashboard/watchlists')} />
            : <div>
                {positions.map((pos: Position) => (
                  <PositionRow
                    key={pos.id} pos={pos}
                    closing={closingId === pos.id}
                    onClose={() => { if (!closingId) handleClose(pos.id) }}
                    currency={user?.currency ?? 'USD'}
                  />
                ))}
              </div>
        )}

        {tab === 'orders' && (
          orders.length === 0
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 10 }}>
                <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={1.2}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>No orders yet</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Your executed orders will appear here</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: '4px 14px' }}>
                {orders.slice(0, 50).map((o: Order) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            )
        )}

        {tab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.25)" strokeWidth={1.3}>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>No price alerts yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>
              Get notified when a price level is reached
            </p>
            <button
              onClick={() => navigate('/dashboard/alerts')}
              style={{
                marginTop: 8, padding: '10px 24px', borderRadius: 22,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Set an alert
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
