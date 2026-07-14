import React, { useEffect, useState } from 'react'
import { getTransactions, reviewTx, AdminTx } from '../../api/admin'
import { PageHead, Card, Empty, Pill, MigrationNote, IVORY, BODY, DIM, GOLD, BULL, BEAR, NIGHT2, HAIR, MONO, money2, dateTime } from '../../components/admin/ui'

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'withdrawal', label: 'Withdrawals', type: true },
  { key: 'deposit', label: 'Deposits', type: true },
]
const tone = (s: string) => s === 'completed' || s === 'approved' ? 'good' : s === 'rejected' ? 'bad' : s === 'pending' ? 'warn' : 'muted'
const COLS = '1.5fr 1fr 1fr 0.9fr 1.1fr 150px'

export default function TransactionsPage() {
  const [rows, setRows] = useState<AdminTx[] | null>(null)
  const [migrated, setMigrated] = useState(true)
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = () => {
    const f = FILTERS.find(x => x.key === filter)
    const params = !filter ? {} : f?.type ? { type: filter } : { status: filter }
    getTransactions(params).then(r => { setRows(r.rows); setMigrated(r.migrated) }).catch(() => setRows([]))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [filter])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try { await reviewTx(id, action); load() } finally { setBusyId('') }
  }

  return (
    <>
      <PageHead title="Deposits & Withdrawals" sub="Every funding movement. Approve or refund pending withdrawals." />

      {!migrated && <MigrationNote file="migrations/add_transactions.sql" />}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key || 'all'} onClick={() => setFilter(f.key)} style={{
            padding: '7px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            background: filter === f.key ? 'rgba(242,184,75,0.14)' : NIGHT2, color: filter === f.key ? GOLD : BODY,
            border: `1px solid ${filter === f.key ? 'rgba(242,184,75,0.4)' : HAIR}`,
          }}>{f.label}</button>
        ))}
      </div>

      {rows && rows.length === 0 ? (
        <Empty title="No transactions" sub={migrated ? 'Funding activity will appear here.' : undefined} />
      ) : (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: `1px solid ${HAIR}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DIM }}>
                <span>User</span><span>Type</span><span style={{ textAlign: 'right' }}>Amount</span><span>Status</span><span style={{ textAlign: 'right' }}>Date</span><span />
              </div>
              {(rows ?? []).map(t => {
                const isWithdraw = t.type === 'withdrawal'
                const canAct = t.status === 'pending' && isWithdraw
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid rgba(242,184,75,0.05)' }}>
                    <span style={{ fontSize: 12.5, color: IVORY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.email || t.user_id.slice(0, 8)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isWithdraw ? BEAR : BULL }}>{isWithdraw ? '↑ Withdraw' : '↓ Deposit'}</span>
                    <span style={{ textAlign: 'right', fontFamily: MONO, fontSize: 13, color: IVORY }}>{money2(t.amount, t.currency)}</span>
                    <span><Pill text={t.status} tone={tone(t.status)} /></span>
                    <span style={{ textAlign: 'right', fontSize: 12, color: DIM }}>{dateTime(t.created_at)}</span>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {canAct ? (
                        <>
                          <button disabled={busyId === t.id} onClick={() => act(t.id, 'approve')} style={{ background: 'rgba(24,201,138,0.12)', border: '1px solid rgba(24,201,138,0.3)', color: BULL, borderRadius: 8, padding: '6px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>Approve</button>
                          <button disabled={busyId === t.id} onClick={() => act(t.id, 'reject')} style={{ background: 'rgba(255,90,114,0.1)', border: '1px solid rgba(255,90,114,0.3)', color: BEAR, borderRadius: 8, padding: '6px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                        </>
                      ) : <span style={{ fontSize: 11.5, color: DIM }}>{t.reviewed_at ? dateTime(t.reviewed_at) : '—'}</span>}
                    </div>
                  </div>
                )
              })}
              {!rows && <div style={{ padding: 36, textAlign: 'center', color: DIM, fontSize: 13 }}>Loading…</div>}
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
