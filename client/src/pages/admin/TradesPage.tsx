import React, { useEffect, useMemo, useState } from 'react'
import { getTrades, patchPosition, patchOrder, AdminPosition, AdminOrder } from '../../api/admin'
import { PageHead, Card, Empty, GoldBtn, GhostBtn, NIGHT, NIGHT2, IVORY, BODY, DIM, GOLD, BULL, BEAR, HAIR, MONO, dateTime } from '../../components/admin/ui'

// datetime-local <-> ISO
const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const fromLocal = (v: string) => new Date(v).toISOString()
const num = (v: string) => (v.trim() === '' ? null : Number(v))

type Kind = 'positions' | 'orders'
type Row = (AdminPosition | AdminOrder) & Record<string, any>

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: BODY, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 9, background: NIGHT, border: `1px solid ${HAIR}`, color: IVORY, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: MONO }

function EditModal({ kind, row, onClose, onSaved }: { kind: Kind; row: Row; onClose: () => void; onSaved: () => void }) {
  const isPos = kind === 'positions'
  const [symbol, setSymbol] = useState(row.symbol)
  const [side, setSide]     = useState<string>(row.side)
  const [qty, setQty]       = useState(String(row.quantity))
  const [price, setPrice]   = useState(String(isPos ? row.avg_price ?? '' : row.fill_price ?? ''))
  const [when, setWhen]     = useState(toLocal(isPos ? row.opened_at : row.created_at))
  const [lev, setLev]       = useState(String(row.leverage ?? 1))
  const [status, setStatus] = useState<string>(row.status ?? 'filled')
  const [sl, setSl]         = useState(row.stop_loss != null ? String(row.stop_loss) : '')
  const [tp, setTp]         = useState(row.take_profit != null ? String(row.take_profit) : '')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  const sides = isPos ? ['long', 'short'] : ['buy', 'sell']

  const save = async () => {
    setBusy(true); setErr('')
    try {
      if (isPos) {
        await patchPosition(row.id, { symbol, side: side as any, quantity: Number(qty), avg_price: Number(price), leverage: Number(lev), opened_at: fromLocal(when), stop_loss: num(sl) as any, take_profit: num(tp) as any })
      } else {
        await patchOrder(row.id, { symbol, side: side as any, quantity: Number(qty), fill_price: Number(price), leverage: Number(lev), status, created_at: fromLocal(when), stop_loss: num(sl) as any, take_profit: num(tp) as any })
      }
      onSaved(); onClose()
    } catch (e: any) { setErr(e?.response?.data?.error || 'Failed to save'); setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,4,4,0.72)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto', background: NIGHT2, border: `1px solid ${HAIR}`, borderRadius: 18, padding: 22 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: IVORY, margin: '0 0 3px' }}>Edit {isPos ? 'position' : 'order'}</h3>
        <p style={{ fontSize: 12, color: DIM, margin: '0 0 18px', fontFamily: MONO }}>{row.email || row.user_id.slice(0, 8)} · {row.id.slice(0, 8)}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Symbol"><input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} style={inp} /></Field>
          <Field label="Side">
            <div style={{ display: 'flex', gap: 6 }}>
              {sides.map(s => (
                <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                  border: `1px solid ${side === s ? (s === 'long' || s === 'buy' ? 'rgba(24,201,138,0.5)' : 'rgba(255,90,114,0.5)') : HAIR}`,
                  background: side === s ? (s === 'long' || s === 'buy' ? 'rgba(24,201,138,0.12)' : 'rgba(255,90,114,0.12)') : 'transparent',
                  color: side === s ? (s === 'long' || s === 'buy' ? BULL : BEAR) : BODY }}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="Quantity"><input type="number" value={qty} onChange={e => setQty(e.target.value)} style={inp} /></Field>
          <Field label={isPos ? 'Entry price' : 'Fill price'}><input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inp, borderColor: 'rgba(242,184,75,0.35)' }} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label={isPos ? 'Opened at (date & time)' : 'Created at (date & time)'}>
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
            </Field>
          </div>
          <Field label="Leverage"><input type="number" value={lev} onChange={e => setLev(e.target.value)} style={inp} /></Field>
          {!isPos && (
            <Field label="Status">
              <div style={{ display: 'flex', gap: 6 }}>
                {['filled', 'rejected'].map(s => (
                  <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                    border: `1px solid ${status === s ? 'rgba(242,184,75,0.5)' : HAIR}`, background: status === s ? 'rgba(242,184,75,0.12)' : 'transparent', color: status === s ? GOLD : BODY }}>{s}</button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Stop loss"><input type="number" value={sl} onChange={e => setSl(e.target.value)} placeholder="—" style={inp} /></Field>
          <Field label="Take profit"><input type="number" value={tp} onChange={e => setTp(e.target.value)} placeholder="—" style={inp} /></Field>
        </div>

        {err && <p style={{ color: BEAR, fontSize: 12.5, margin: '12px 0 0' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <div style={{ flex: 1 }} />
          <GoldBtn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</GoldBtn>
        </div>
      </div>
    </div>
  )
}

export default function TradesPage() {
  const [tab, setTab] = useState<Kind>('positions')
  const [data, setData] = useState<{ positions: AdminPosition[]; orders: AdminOrder[] } | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [err, setErr] = useState('')

  const load = () => getTrades().then(setData).catch(e => setErr(e?.response?.data?.error || 'Failed to load'))
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const list: Row[] = tab === 'positions' ? data.positions : data.orders
    const s = q.trim().toLowerCase()
    return s ? list.filter(r => (r.email || '').toLowerCase().includes(s) || r.symbol.toLowerCase().includes(s)) : list
  }, [data, tab, q])

  const COLS = '1.3fr 0.8fr 0.7fr 0.9fr 1fr 1.1fr 84px'

  return (
    <>
      <PageHead title="Trades" sub="Edit open positions and order history — entry price, date & time, size, side."
        right={
          <div style={{ position: 'relative', width: 'min(260px, 55vw)' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={DIM} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email or symbol…"
              style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 10, background: NIGHT2, border: `1px solid ${HAIR}`, color: IVORY, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        } />

      {err && <Card style={{ padding: 16, marginBottom: 16, color: BEAR }}>{err}</Card>}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['positions', 'orders'] as Kind[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
            background: tab === t ? 'rgba(242,184,75,0.14)' : NIGHT2, color: tab === t ? GOLD : BODY, border: `1px solid ${tab === t ? 'rgba(242,184,75,0.4)' : HAIR}` }}>
            {t === 'positions' ? `Open positions (${data?.positions.length ?? 0})` : `Orders (${data?.orders.length ?? 0})`}
          </button>
        ))}
      </div>

      {data && rows.length === 0 ? (
        <Empty title={`No ${tab}`} sub={q ? 'Try a different search.' : undefined} />
      ) : (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 780 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: `1px solid ${HAIR}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DIM }}>
                <span>User</span><span>Symbol</span><span>Side</span><span style={{ textAlign: 'right' }}>Qty</span><span style={{ textAlign: 'right' }}>Entry</span><span style={{ textAlign: 'right' }}>Date</span><span />
              </div>
              {(data ? rows : []).map(r => {
                const isPos = tab === 'positions'
                const up = r.side === 'long' || r.side === 'buy'
                const entry = isPos ? (r as AdminPosition).avg_price : (r as AdminOrder).fill_price
                const when = isPos ? (r as AdminPosition).opened_at : (r as AdminOrder).created_at
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid rgba(242,184,75,0.05)' }}>
                    <span style={{ fontSize: 12, color: BODY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email || r.user_id.slice(0, 8)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: IVORY }}>{r.symbol}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: up ? BULL : BEAR }}>{r.side}</span>
                    <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 12.5, color: BODY }}>{Number(r.quantity)}</span>
                    <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 12.5, color: IVORY }}>{entry != null ? Number(entry) : '—'}</span>
                    <span style={{ textAlign: 'right', fontSize: 11.5, color: DIM }}>{dateTime(when)}</span>
                    <div style={{ textAlign: 'right' }}>
                      <button onClick={() => setEditing(r)} style={{ background: 'rgba(242,184,75,0.1)', border: '1px solid rgba(242,184,75,0.25)', color: GOLD, borderRadius: 8, padding: '6px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                    </div>
                  </div>
                )
              })}
              {!data && <div style={{ padding: 36, textAlign: 'center', color: DIM, fontSize: 13 }}>Loading…</div>}
            </div>
          </div>
        </Card>
      )}

      {editing && <EditModal kind={tab} row={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  )
}
