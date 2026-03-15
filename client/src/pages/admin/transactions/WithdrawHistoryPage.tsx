import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateWithdraws } from '../../../utils/adminMock'

export default function WithdrawHistoryPage() {
  const data = useMemo(() => generateWithdraws(50), [])
  return (
    <AdminListPage
      title="Withdraw History"
      subtitle="Complete record of all withdrawal transactions"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',          header: 'Withdraw ID',  render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',        header: 'User' },
        { key: 'email',       header: 'Email',        render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'amount',      header: 'Amount',       render: r => <span className="font-mono font-semibold text-bear">${r.amount.toLocaleString()}</span> },
        { key: 'currency',    header: 'Currency' },
        { key: 'method',      header: 'Method' },
        { key: 'requestDate', header: 'Requested',    render: r => <span className="font-mono text-text-muted">{r.requestDate}</span> },
        { key: 'processDate', header: 'Processed',    render: r => <span className="font-mono text-text-muted">{r.processDate}</span> },
        { key: 'status',      header: 'Status',       render: r => statusBadge(r.status) },
      ]}
    />
  )
}
