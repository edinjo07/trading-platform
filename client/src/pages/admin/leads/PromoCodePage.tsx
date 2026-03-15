import React, { useMemo } from 'react'
import AdminListPage, { statusBadge, Badge } from '../../../components/admin/AdminListPage'

interface PromoRow { id: string; code: string; discount: string; type: string; uses: number; maxUses: number; expires: string; status: string }

function generatePromos(): PromoRow[] {
  const types = ['percentage', 'fixed', 'free-trade']
  return Array.from({ length: 25 }, (_, i) => ({
    id: `PRO-${String(i+1).padStart(4,'0')}`,
    code: `TRADE${Math.random().toString(36).slice(2,6).toUpperCase()}`,
    discount: types[i%3] === 'percentage' ? `${Math.round(Math.random()*30+5)}%` : types[i%3] === 'fixed' ? `$${Math.round(Math.random()*200+50)}` : '1 Free Trade',
    type: types[i % 3],
    uses: Math.floor(Math.random() * 200),
    maxUses: Math.floor(Math.random() * 500 + 100),
    expires: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString().split('T')[0],
    status: i % 5 === 0 ? 'inactive' : 'active',
  }))
}

export default function PromoCodePage() {
  const data = useMemo(() => generatePromos(), [])
  return (
    <AdminListPage
      title="Promo Codes"
      subtitle="Manage promotional codes and discount campaigns"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',       header: 'ID',       render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'code',     header: 'Code',     render: r => <span className="font-mono font-bold text-warning px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.08)' }}>{r.code}</span> },
        { key: 'discount', header: 'Discount', render: r => <span className="font-semibold text-bull">{r.discount}</span> },
        { key: 'type',     header: 'Type',     render: r => <span className="capitalize text-text-primary">{r.type}</span> },
        { key: 'uses',     header: 'Uses',     render: r => <span className="font-mono">{r.uses} / {r.maxUses}</span> },
        { key: 'expires',  header: 'Expires',  render: r => <span className="font-mono text-text-muted">{r.expires}</span> },
        { key: 'status',   header: 'Status',   render: r => statusBadge(r.status) },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Create Code
        </button>
      }
    />
  )
}
