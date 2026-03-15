import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateWithdraws } from '../../../utils/adminMock'

export default function PendingWithdrawsPage() {
  const data = useMemo(() => generateWithdraws(50).filter(w => w.status === 'pending'), [])
  return (
    <AdminListPage
      title="Pending Withdrawals"
      subtitle="Withdrawal requests awaiting review and approval"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',          header: 'Withdraw ID', render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',        header: 'User' },
        { key: 'email',       header: 'Email',       render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'amount',      header: 'Amount',      render: r => <span className="font-mono font-semibold text-bear">${r.amount.toLocaleString()}</span> },
        { key: 'currency',    header: 'Currency' },
        { key: 'method',      header: 'Method' },
        { key: 'requestDate', header: 'Requested',   render: r => <span className="font-mono text-text-muted">{r.requestDate}</span> },
        { key: 'status',      header: 'Status',      render: r => statusBadge(r.status) },
      ]}
      actions={
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#00c878,#059669)' }}>Approve Selected</button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#ff3047,#b91c1c)' }}>Reject Selected</button>
        </div>
      }
    />
  )
}
