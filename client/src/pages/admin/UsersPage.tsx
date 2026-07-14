import React, { useEffect, useMemo, useState } from 'react'
import { getUsers, setBalance, AdminUser } from '../../api/admin'
import { PageHead, Card, Empty, GoldBtn, GhostBtn, NIGHT, NIGHT2, IVORY, BODY, DIM, GOLD, HAIR, MONO, BULL, BEAR, money2, dateShort } from '../../components/admin/ui'

function AdjustModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'demo' | 'real'>('real')
  const [op, setOp]     = useState<'set' | 'add'>('add')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const save = async () => {
    const amt = parseFloat(amount)
    if (!isFinite(amt)) { setErr('Enter a number'); return }
    setBusy(true); setErr('')
    try { await setBalance(user.id, mode, op, amt); onSaved(); onClose() }
    catch (e: any) { setErr(e?.response?.data?.error || 'Failed'); setBusy(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, background: NIGHT, border: `1px solid ${HAIR}`, color: IVORY, fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,4,4,0.72)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: NIGHT2, border: `1px solid ${HAIR}`, borderRadius: 18, padding: 22 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: IVORY, margin: '0 0 3px' }}>Adjust balance</h3>
        <p style={{ fontSize: 12.5, color: DIM, margin: '0 0 18px' }}>{user.email}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['real', 'demo'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${mode === m ? 'rgba(242,184,75,0.5)' : HAIR}`, background: mode === m ? 'rgba(242,184,75,0.1)' : 'transparent', color: mode === m ? GOLD : BODY }}>
              {m === 'real' ? 'Live' : 'Demo'} <span style={{ color: DIM, fontFamily: MONO }}>{m === 'real' ? money2(user.real ?? 0) : money2(user.demo ?? 0)}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['add', 'set'] as const).map(o => (
            <button key={o} onClick={() => setOp(o)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${op === o ? 'rgba(242,184,75,0.5)' : HAIR}`, background: op === o ? 'rgba(242,184,75,0.1)' : 'transparent', color: op === o ? GOLD : BODY }}>
              {o === 'add' ? 'Add / subtract' : 'Set exact'}
            </button>
          ))}
        </div>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={op === 'add' ? 'e.g. 500 or -200' : 'New balance'} style={{ ...inp, fontFamily: MONO }} autoFocus />
        {err && <p style={{ color: BEAR, fontSize: 12.5, margin: '10px 0 0' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <div style={{ flex: 1 }} />
          <GoldBtn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Apply'}</GoldBtn>
        </div>
      </div>
    </div>
  )
}

const COLS = '1.6fr 1fr 1fr 1fr 96px'

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const load = () => getUsers().then(setUsers).catch(e => setErr(e?.response?.data?.error || e?.message || 'Failed to load users'))
  useEffect(() => { load() }, [])

  const rows = useMemo(() => {
    if (!users) return []
    const s = q.trim().toLowerCase()
    const list = s ? users.filter(u => u.email.toLowerCase().includes(s) || u.username.toLowerCase().includes(s)) : users
    return [...list].sort((a, b) => (b.real ?? 0) - (a.real ?? 0))
  }, [users, q])

  return (
    <>
      <PageHead title="Users" sub={users ? `${users.length} accounts` : 'Loading…'}
        right={
          <div style={{ position: 'relative', width: 'min(280px, 60vw)' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={DIM} strokeWidth={2} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email or username…"
              style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 10, background: NIGHT2, border: `1px solid ${HAIR}`, color: IVORY, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        } />

      {err && <Card style={{ padding: 16, marginBottom: 16, color: BEAR }}>{err}</Card>}

      {users && rows.length === 0 ? (
        <Empty title="No users found" sub={q ? 'Try a different search.' : undefined} />
      ) : (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 720 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: `1px solid ${HAIR}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DIM }}>
                <span>User</span><span style={{ textAlign: 'right' }}>Live balance</span><span style={{ textAlign: 'right' }}>Demo balance</span><span style={{ textAlign: 'right' }}>Joined</span><span />
              </div>
              {(users ? rows : []).map(u => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid rgba(242,184,75,0.05)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</div>
                    <div style={{ fontSize: 11.5, color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  </div>
                  <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: u.real != null ? BULL : DIM }}>{u.real != null ? money2(u.real) : '—'}</span>
                  <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: BODY }}>{u.demo != null ? money2(u.demo) : '—'}</span>
                  <span style={{ textAlign: 'right', fontSize: 12, color: DIM }}>{dateShort(u.created_at)}</span>
                  <div style={{ textAlign: 'right' }}>
                    <button onClick={() => setEditing(u)} style={{ background: 'rgba(242,184,75,0.1)', border: '1px solid rgba(242,184,75,0.25)', color: GOLD, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Balance</button>
                  </div>
                </div>
              ))}
              {!users && <div style={{ padding: '36px', textAlign: 'center', color: DIM, fontSize: 13 }}>Loading users…</div>}
            </div>
          </div>
        </Card>
      )}

      {editing && <AdjustModal user={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  )
}
