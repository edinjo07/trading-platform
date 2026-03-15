import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateDeposits } from '../../../utils/adminMock'

export default function ExternalPaymentsPage() {
  const data = useMemo(() => generateDeposits(35).map(d => ({ ...d, gateway: 'External', provider: d.method })), [])
  return (
    <AdminListPage
      title="External Payments"
      subtitle="Payments received via external third-party providers"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',       header: 'ID',       render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',     header: 'User' },
        { key: 'email',    header: 'Email',    render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'amount',   header: 'Amount',   render: r => <span className="font-mono font-semibold text-bull">${r.amount.toLocaleString()}</span> },
        { key: 'currency', header: 'Currency' },
        { key: 'method',   header: 'Provider' },
        { key: 'txRef',    header: 'Ref',      render: r => <span className="font-mono text-xs text-text-muted">{r.txRef}</span> },
        { key: 'status',   header: 'Status',   render: r => statusBadge(r.status) },
        { key: 'date',     header: 'Date',     render: r => <span className="font-mono text-text-muted">{r.date}</span> },
      ]}
    />
  )
}
