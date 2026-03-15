import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateDeposits } from '../../../utils/adminMock'

export default function DepositHistoryPage() {
  const data = useMemo(() => generateDeposits(60), [])
  return (
    <AdminListPage
      title="Deposit History"
      subtitle="Complete record of all client deposit transactions"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',      header: 'Dep. ID',  render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',    header: 'User' },
        { key: 'email',   header: 'Email',    render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'amount',  header: 'Amount',   render: r => <span className="font-mono font-semibold text-bull">${r.amount.toLocaleString()}</span> },
        { key: 'currency',header: 'Currency', render: r => <span className="font-mono text-text-primary">{r.currency}</span> },
        { key: 'method',  header: 'Method' },
        { key: 'gateway', header: 'Gateway' },
        { key: 'txRef',   header: 'Ref',      render: r => <span className="font-mono text-xs text-text-muted">{r.txRef}</span> },
        { key: 'status',  header: 'Status',   render: r => statusBadge(r.status) },
        { key: 'date',    header: 'Date',     render: r => <span className="font-mono text-text-muted">{r.date}</span> },
      ]}
    />
  )
}
