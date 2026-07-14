import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOverview, AdminOverview } from '../../api/admin'
import { PageHead, Stat, Card, GOLD, BULL, BEAR, IVORY, BODY, DIM, HAIR, MONO, money } from '../../components/admin/ui'

export default function OverviewPage() {
  const navigate = useNavigate()
  const [d, setD] = useState<AdminOverview | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let dead = false
    const load = () => getOverview().then(v => { if (!dead) setD(v) }).catch(e => !dead && setErr(e?.message || 'Failed to load'))
    load(); const iv = setInterval(load, 15000)
    return () => { dead = true; clearInterval(iv) }
  }, [])

  return (
    <>
      <PageHead title="Overview" sub="Live platform health across every account." />
      {err && <Card style={{ padding: 16, marginBottom: 16, color: BEAR }}>{err}</Card>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Stat label="Total users" value={d ? String(d.users) : '—'} sub={d ? `+${d.newUsers7d} this week` : ''} accent={GOLD} />
        <Stat label="Real balances" value={d ? money(d.realBalance) : '—'} sub="Across live accounts" accent={BULL} />
        <Stat label="Demo balances" value={d ? money(d.demoBalance) : '—'} sub="Practice capital" />
        <Stat label="Open positions" value={d ? String(d.openPositions) : '—'} sub={d ? `${money(d.exposure)} margin` : ''} />
        <Stat label="Trades logged" value={d ? d.trades.toLocaleString() : '—'} />
        <Stat label="KYC verified" value={d ? String(d.kycVerified) : '—'} sub={d ? `${d.kycPending} awaiting review` : ''} accent={BULL} />
      </div>

      {/* Attention row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: IVORY }}>Withdrawals awaiting approval</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: d && d.pendingWithdrawals > 0 ? GOLD : DIM }}>{d ? d.pendingWithdrawals : '—'}</span>
          </div>
          <p style={{ fontSize: 12.5, color: DIM, margin: '0 0 14px' }}>{d ? `${money(d.pendingWithdrawAmount)} total pending` : 'Loading…'}</p>
          <button onClick={() => navigate('/admin/transactions')} style={{ background: 'rgba(242,184,75,0.1)', border: `1px solid rgba(242,184,75,0.25)`, color: GOLD, borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Review withdrawals →</button>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: IVORY }}>KYC pending review</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: d && d.kycPending > 0 ? GOLD : DIM }}>{d ? d.kycPending : '—'}</span>
          </div>
          <p style={{ fontSize: 12.5, color: DIM, margin: '0 0 14px' }}>Identity documents submitted by users.</p>
          <button onClick={() => navigate('/admin/kyc')} style={{ background: 'rgba(242,184,75,0.1)', border: `1px solid rgba(242,184,75,0.25)`, color: GOLD, borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Review KYC →</button>
        </Card>
        <Card style={{ padding: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: IVORY }}>Manage users</span>
          <p style={{ fontSize: 12.5, color: DIM, margin: '6px 0 14px', lineHeight: 1.6 }}>Search accounts, view details and adjust balances.</p>
          <button onClick={() => navigate('/admin/users')} style={{ background: 'rgba(242,184,75,0.1)', border: `1px solid rgba(242,184,75,0.25)`, color: GOLD, borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Open users →</button>
        </Card>
      </div>
    </>
  )
}
