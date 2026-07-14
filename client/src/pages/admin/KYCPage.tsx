import React, { useEffect, useState } from 'react'
import { getKyc, reviewKyc, AdminKyc } from '../../api/admin'
import { PageHead, Card, Empty, Pill, MigrationNote, IVORY, BODY, DIM, GOLD, BULL, BEAR, HAIR, MONO, dateShort } from '../../components/admin/ui'

const tone = (s: string) => s === 'verified' ? 'good' : s === 'rejected' ? 'bad' : s === 'pending' ? 'warn' : 'muted'
const COLS = '1.5fr 1fr 1.3fr 1fr 160px'

export default function KYCPage() {
  const [rows, setRows] = useState<AdminKyc[] | null>(null)
  const [migrated, setMigrated] = useState(true)
  const [busyId, setBusyId] = useState('')

  const load = () => getKyc().then(r => { setRows(r.rows); setMigrated(r.migrated) }).catch(() => setRows([]))
  useEffect(() => { load() }, [])

  const act = async (userId: string, action: 'approve' | 'reject') => {
    setBusyId(userId)
    try { await reviewKyc(userId, action); load() } finally { setBusyId('') }
  }

  const docCell = (type: string | null, name: string | null, status: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: status === 'empty' ? DIM : IVORY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {type ? type.replace(/_/g, ' ') : '—'}
      </div>
      <div style={{ fontSize: 10.5, color: DIM, marginTop: 1 }}>{status !== 'empty' ? status : 'not submitted'}</div>
    </div>
  )

  return (
    <>
      <PageHead title="KYC Review" sub="Approve or reject submitted identity & address documents." />

      {!migrated && <MigrationNote file="migrations/add_kyc.sql" />}

      {rows && rows.length === 0 ? (
        <Empty title="Nothing to review" sub={migrated ? 'KYC submissions will appear here.' : undefined} />
      ) : (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: `1px solid ${HAIR}`, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: DIM }}>
                <span>User</span><span>Status</span><span>ID document</span><span>Proof of address</span><span style={{ textAlign: 'right' }}>Action</span>
              </div>
              {(rows ?? []).map(k => {
                const pending = k.status === 'pending' || k.id_status === 'pending' || k.poa_status === 'pending'
                return (
                  <div key={k.user_id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid rgba(242,184,75,0.05)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: IVORY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.username || k.email}</div>
                      <div style={{ fontSize: 11, color: DIM }}>Submitted {dateShort(k.submitted_at)}</div>
                    </div>
                    <span><Pill text={k.status} tone={tone(k.status)} /></span>
                    {docCell(k.id_type, k.id_doc_name, k.id_status)}
                    {docCell(k.poa_type, k.poa_doc_name, k.poa_status)}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {pending ? (
                        <>
                          <button disabled={busyId === k.user_id} onClick={() => act(k.user_id, 'approve')} style={{ background: 'rgba(24,201,138,0.12)', border: '1px solid rgba(24,201,138,0.3)', color: BULL, borderRadius: 8, padding: '6px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>Approve</button>
                          <button disabled={busyId === k.user_id} onClick={() => act(k.user_id, 'reject')} style={{ background: 'rgba(255,90,114,0.1)', border: '1px solid rgba(255,90,114,0.3)', color: BEAR, borderRadius: 8, padding: '6px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                        </>
                      ) : <span style={{ fontSize: 11.5, color: DIM }}>{k.reviewed_at ? dateShort(k.reviewed_at) : '—'}</span>}
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
