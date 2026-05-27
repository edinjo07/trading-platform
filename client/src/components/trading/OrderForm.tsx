import React, { useState, useEffect } from 'react'
import { useTradingStore } from '../../store/tradingStore'
import { useToastStore } from '../../store/toastStore'
import { formatPrice } from '../../utils/formatters'
import { OrderSide } from '../../types'

// ─── Asset helpers ────────────────────────────────────────────────────────────

function detectAsset(symbol: string): 'crypto' | 'stock' | 'forex' | 'commodity' | 'index' | 'bond' {
  const u = symbol.toUpperCase()
  const forex = ['EUR','GBP','USD','JPY','CHF','AUD','CAD','NZD','NOK','SEK','PLN','ZAR','TRY','MXN','HUF','CNH','CZK','DKK','HKD','ILS','SGD','THB']
  const crypto = ['BTC','ETH','LTC','BCH','DSH','XRP','DOT','LNK','ADA','BNB','SOL','AVAX','MATIC','DOGE','XLM','XTZ','UNI','LUNA']
  const comm = ['XAU','XAG','XPT','XPD','XBR','WTI','BRENT','NGAS','GC25','COCOA','COFFEE','CORN','COTTON','SOYBEAN','SUGAR','WHEAT','COPPER','HO']
  const idx = ['US500','USTEC','US30','UK100','DE40','F40','JP225','AUS200','STOXX50','CA60','CH20','HK50','ES35','IT40','NL25','SING','ZA50','TW50','VIX','DX','EUSTX50']
  const bonds = ['TNOTE','BUND','GILT','JGB','OAT','BTP','BONO','USBOND']
  if (bonds.includes(u)) return 'bond'
  if (idx.includes(u)) return 'index'
  if (comm.some(c => u.startsWith(c))) return 'commodity'
  if (crypto.some(c => u.startsWith(c) && u.endsWith('USD'))) return 'crypto'
  for (const base of forex) {
    if (u.startsWith(base) && forex.includes(u.slice(base.length))) return 'forex'
  }
  if (!/USD$/.test(u)) return 'stock'
  return 'crypto'
}

function getQtyLabel(symbol: string): string {
  const u = symbol.toUpperCase()
  const coins = ['BTC','ETH','SOL','LTC','XRP','ADA','BNB','AVAX','DOT','DOGE','MATIC','XLM']
  for (const c of coins) if (u.startsWith(c)) return c
  if (['WTI','BRENT','XBR'].includes(u)) return 'Barrels'
  if (u === 'NGAS') return 'MMBtu'
  if (['XAUUSD','XAU','GC25'].includes(u)) return 'oz'
  if (['XAGUSD','XAG'].includes(u)) return 'oz'
  if (detectAsset(u) === 'forex' && u.length === 6) return u.slice(0, 3)
  if (detectAsset(u) === 'index') return 'Units'
  return 'Shares'
}

function getQtyStep(symbol: string): number {
  const label = getQtyLabel(symbol)
  if (label === 'BTC') return 0.001
  if (['ETH','SOL','LTC'].includes(label)) return 0.01
  if (['XRP','ADA','DOGE','MATIC','XLM'].includes(label)) return 10
  if (['Barrels','oz','MMBtu'].includes(label)) return 1
  if (detectAsset(symbol) === 'forex') return 1000
  return 1
}

function getDefaultQty(symbol: string): string {
  const label = getQtyLabel(symbol)
  if (label === 'BTC') return '0.001'
  if (['ETH','SOL'].includes(label)) return '0.01'
  if (['LTC','BNB','AVAX','DOT'].includes(label)) return '0.1'
  if (['XRP','ADA','DOGE','XLM'].includes(label)) return '100'
  if (['Barrels','oz','MMBtu'].includes(label)) return '10'
  if (detectAsset(symbol) === 'forex') return '1000'
  return '1'
}

function getLeverageOptions(symbol: string): number[] {
  const ac = detectAsset(symbol)
  if (ac === 'forex')     return [1, 5, 10, 25, 50, 100, 200, 500, 1000]
  if (ac === 'commodity') return [1, 5, 10, 25, 50, 100, 200, 500]
  if (ac === 'index')     return [1, 5, 10, 25, 50, 100, 200]
  if (ac === 'bond')      return [1, 5, 10, 25, 50, 100]
  if (ac === 'stock')     return [1, 2, 3, 5, 10, 20]
  return [1, 2, 3, 5, 10]
}

function fmtSpread(raw: number): string {
  if (raw <= 0) return '–'
  if (raw < 0.001) return raw.toFixed(5)
  if (raw < 0.1)   return raw.toFixed(4)
  if (raw < 1)     return raw.toFixed(3)
  if (raw < 10)    return raw.toFixed(2)
  return String(Math.round(raw))
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 14, color: checked ? '#fff' : '#888', fontWeight: checked ? 500 : 400 }}>
        {label}
      </span>
      <div style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: checked ? '#1a6fff' : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left 0.18s',
          left: checked ? 21 : 3,
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }} />
      </div>
    </div>
  )
}

// ─── Price depth modal ────────────────────────────────────────────────────────

function PriceDepthModal({ onClose }: { onClose: () => void }) {
  const { orderBook, selectedSymbol, tickers } = useTradingStore()
  const ticker = tickers[selectedSymbol]
  const bid = ticker?.bid ?? ticker?.price ?? 0
  const ask = ticker?.ask ?? (ticker ? ticker.price * 1.0002 : 0)
  const depth = Math.max(1, Math.min(5, Math.max(orderBook?.bids.length ?? 0, orderBook?.asks.length ?? 0)))

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: '#0d1420', borderRadius: '22px 22px 0 0', padding: '16px 16px 32px', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '0 auto 18px' }} />
        <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 18 }}>Price depth</div>

        {/* Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px 1fr 1fr', fontSize: 11, color: '#555', marginBottom: 8, padding: '0 2px' }}>
          <span>Size</span>
          <span style={{ textAlign: 'right' }}>Sell price</span>
          <span />
          <span>Buy price</span>
          <span style={{ textAlign: 'right' }}>Size</span>
        </div>

        {Array.from({ length: depth }, (_, i) => {
          const b = orderBook?.bids[i]
          const a = orderBook?.asks[i]
          const top = i === 0
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px 1fr 1fr', padding: '9px 2px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#888' }}>{b?.size.toFixed(2) ?? '–'}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', color: top ? '#ff4444' : '#aa2222', background: top ? 'rgba(255,0,0,0.07)' : 'none', borderRadius: 4, padding: '2px 4px' }}>
                {b ? formatPrice(b.price, selectedSymbol) : '–'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700,
                  background: top ? 'rgba(255,160,0,0.9)' : 'rgba(255,255,255,0.06)',
                  color: top ? '#000' : '#666',
                }}>{i + 1}</div>
              </div>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: top ? '#38bdf8' : '#1a7ab0', background: top ? 'rgba(56,189,248,0.07)' : 'none', borderRadius: 4, padding: '2px 4px' }}>
                {a ? formatPrice(a.price, selectedSymbol) : '–'}
              </span>
              <span style={{ fontSize: 13, color: '#888', textAlign: 'right' }}>{a?.size.toFixed(2) ?? '–'}</span>
            </div>
          )
        })}

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 14, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#ff4444', fontWeight: 600, marginBottom: 4 }}>Sell price</div>
            <div style={{ fontSize: 16, color: '#ff4444', fontFamily: 'monospace', fontWeight: 700 }}>{formatPrice(bid, selectedSymbol)}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 4 }}>Buy price</div>
            <div style={{ fontSize: 16, color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{formatPrice(ask, selectedSymbol)}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 16, padding: 15, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >Close</button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrderForm() {
  const { selectedSymbol, tickers, portfolio, placeOrder } = useTradingStore()
  const { addToast } = useToastStore()

  const ticker   = tickers[selectedSymbol]
  const cash     = portfolio?.cashBalance ?? 0
  const position = portfolio?.positions.find(p => p.symbol === selectedSymbol)

  const [side,       setSide]       = useState<OrderSide>('buy')
  const [qty,        setQty]        = useState(() => getDefaultQty(selectedSymbol))
  const [leverage,   setLeverage]   = useState(1)
  const [showLimit,  setShowLimit]  = useState(false)
  const [limitPrice, setLimitPrice] = useState('')
  const [showSL,     setShowSL]     = useState(false)
  const [sl,         setSl]         = useState('')
  const [showTP,     setShowTP]     = useState(false)
  const [tp,         setTp]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [showDepth,  setShowDepth]  = useState(false)

  // Reset to sensible defaults when symbol changes
  useEffect(() => {
    setQty(getDefaultQty(selectedSymbol))
    setLeverage(1)
    setSide('buy')
    setError('')
    setShowLimit(false); setShowSL(false); setShowTP(false)
    setLimitPrice(''); setSl(''); setTp('')
  }, [selectedSymbol])

  const levOptions  = getLeverageOptions(selectedSymbol)
  const qtyLabel    = getQtyLabel(selectedSymbol)
  const qtyStep     = getQtyStep(selectedSymbol)

  const bid         = ticker?.bid  ?? ticker?.price ?? 0
  const ask         = ticker?.ask  ?? (ticker ? ticker.price * 1.0002 : 0)
  const rawSpread   = ask - bid
  const fillPrice   = side === 'buy' ? ask : bid
  const quantity    = Math.max(0, parseFloat(qty) || 0)
  const notional    = quantity * fillPrice
  const margin      = leverage > 0 ? notional / leverage : notional
  const commission  = parseFloat((notional * 0.0005).toFixed(2))
  const totalCost   = parseFloat((margin + commission).toFixed(2))
  const isBuy       = side === 'buy'
  const canSell     = !!position || leverage > 1

  const adjustQty = (delta: number) => {
    const next = Math.max(0, (parseFloat(qty) || 0) + delta)
    setQty(next < 1 ? next.toFixed(Math.max(3, qtyStep.toString().split('.')[1]?.length ?? 3)) : next.toFixed(2))
  }

  const setPct = (pct: number) => {
    if (!fillPrice) return
    if (isBuy) {
      const maxQty = (cash * pct * leverage) / fillPrice
      setQty(maxQty < 1 ? maxQty.toFixed(4) : maxQty.toFixed(2))
    } else if (position) {
      const q = position.quantity * pct
      setQty(q < 1 ? q.toFixed(4) : q.toFixed(2))
    }
  }

  const handleSideChange = (s: OrderSide) => {
    if (s === 'sell' && !canSell) return
    setSide(s); setError('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!quantity || quantity <= 0) { setError('Enter a valid quantity'); return }
    if (isBuy && portfolio !== null && totalCost > cash) {
      setError(`Insufficient funds — need $${totalCost.toFixed(2)}, have $${cash.toFixed(2)}`); return
    }
    if (!isBuy && !canSell) { setError('No position to sell'); return }

    setSubmitting(true)
    try {
      await placeOrder({
        symbol: selectedSymbol, side, quantity,
        leverage:   leverage > 1 ? leverage : undefined,
        takeProfit: tp ? parseFloat(tp) : undefined,
        stopLoss:   sl ? parseFloat(sl) : undefined,
      })
      addToast({
        title:   'Order Filled',
        message: `${isBuy ? 'Bought' : 'Sold'} ${quantity} ${qtyLabel} @ ${formatPrice(fillPrice, selectedSymbol)}`,
        variant: isBuy ? 'success' : 'info',
      })
      setError('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Order failed'
      setError(msg)
      addToast({ title: 'Order Rejected', message: msg, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputSty: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10, color: '#fff', fontSize: 14, padding: '11px 14px',
    marginBottom: 2, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060a10', overflowY: 'auto' }}>

      {/* ── Sell / Buy pill ──────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', borderRadius: 16, overflow: 'hidden', gap: 2 }}>

          {/* Sell side */}
          <button
            onClick={() => handleSideChange('sell')}
            style={{
              flex: 1, padding: '13px 10px', border: 'none', cursor: canSell ? 'pointer' : 'default',
              background: !isBuy ? 'rgba(155,12,12,0.88)' : 'rgba(55,8,8,0.65)',
              textAlign: 'left', transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, color: !isBuy ? '#ff9090' : '#5a2020' }}>Sell</div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.2, color: !isBuy ? '#ff3030' : '#661818' }}>
              {bid > 0 ? formatPrice(bid, selectedSymbol) : '––'}
            </div>
          </button>

          {/* Center: spread + leverage */}
          <div style={{ background: '#0c1220', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', gap: 5, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ccc' }}>
              {fmtSpread(rawSpread)}
            </div>
            <select
              value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#aaa', fontSize: 10, fontWeight: 700, padding: '3px 4px', cursor: 'pointer', width: 46, textAlign: 'center' }}
            >
              {levOptions.map(l => <option key={l} value={l}>L{l}</option>)}
            </select>
          </div>

          {/* Buy side */}
          <button
            onClick={() => handleSideChange('buy')}
            style={{
              flex: 1, padding: '13px 10px', border: 'none', cursor: 'pointer',
              background: isBuy ? 'rgba(10,52,200,0.85)' : 'rgba(4,14,50,0.65)',
              textAlign: 'right', transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, color: isBuy ? '#80c8ff' : '#1a3060' }}>Buy</div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.2, color: isBuy ? '#38bdf8' : '#1a3060' }}>
              {ask > 0 ? formatPrice(ask, selectedSymbol) : '––'}
            </div>
          </button>
        </div>
      </div>

      {/* ── Quantity ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Quantity ({qtyLabel})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => adjustQty(-qtyStep)}
              style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >−</button>
            <input
              type="number" value={qty} min="0" step={qtyStep}
              onChange={e => setQty(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center', outline: 'none' }}
            />
            <button
              onClick={() => adjustQty(qtyStep)}
              style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >+</button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#555' }}>
              Margin: <span style={{ color: totalCost > cash ? '#ff4444' : '#888', fontWeight: 600 }}>
                ${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
            <span style={{ color: '#555' }}>
              Available: <span style={{ color: totalCost > cash ? '#ff4444' : '#00c878', fontWeight: 600 }}>
                ${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── % quick buttons ───────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px 10px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, flexShrink: 0 }}>
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <button
            key={pct}
            onClick={() => setPct(pct)}
            style={{ padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#666', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            {pct * 100}%
          </button>
        ))}
      </div>

      {/* ── Toggles ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 12px', flexShrink: 0 }}>
        <ToggleRow label={`${isBuy ? 'Buy' : 'Sell'} when price is`} checked={showLimit} onChange={setShowLimit} />
        {showLimit && (
          <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
            placeholder={`Limit price (current: ${formatPrice(fillPrice, selectedSymbol)})`} style={inputSty} />
        )}

        <ToggleRow label="Stop loss" checked={showSL} onChange={setShowSL} />
        {showSL && (
          <input type="number" value={sl} onChange={e => setSl(e.target.value)}
            placeholder="Stop loss price" style={inputSty} />
        )}

        <ToggleRow label="Take profit" checked={showTP} onChange={setShowTP} />
        {showTP && (
          <input type="number" value={tp} onChange={e => setTp(e.target.value)}
            placeholder="Take profit price" style={inputSty} />
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ margin: '8px 12px', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,48,71,0.08)', border: '1px solid rgba(255,48,71,0.2)', color: '#ff7080', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 8 }} />

      {/* ── Order details + Submit ─────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button
          onClick={() => setShowDepth(true)}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, padding: 0 }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Order details · Commission ${commission.toFixed(2)}
        </button>

        <button
          onClick={handleSubmit}
          disabled={submitting || !ticker}
          style={{
            width: '100%', padding: 17, borderRadius: 16,
            background: isBuy ? '#1a6fff' : '#c41a2a',
            color: '#fff', fontSize: 16, fontWeight: 800, border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting || !ticker ? 0.65 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'Placing…' : isBuy ? `Buy ${selectedSymbol}` : `Sell ${selectedSymbol}`}
        </button>
      </div>

      {/* Price depth bottom sheet */}
      {showDepth && <PriceDepthModal onClose={() => setShowDepth(false)} />}
    </div>
  )
}
