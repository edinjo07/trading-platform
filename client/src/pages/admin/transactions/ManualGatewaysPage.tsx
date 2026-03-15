import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateDeposits } from '../../../utils/adminMock'

export default function ManualGatewaysPage() {
  const data = useMemo(() => generateDeposits(30).map(d => ({ ...d, gateway: 'Manual', approvedBy: 'Admin' })), [])
  return (
    <AdminListPage
      title="Manual Gateways"
      subtitle="Payments processed manually by admin staff"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',         header: 'ID',        render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',       header: 'User' },
        { key: 'amount',     header: 'Amount',    render: r => <span className="font-mono font-semibold text-bull">${r.amount.toLocaleString()}</span> },
        { key: 'currency',   header: 'Currency' },
        { key: 'method',     header: 'Method' },
        { key: 'approvedBy', header: 'Approved By', render: r => <span className="text-text-primary">{(r as any).approvedBy}</span> },
        { key: 'txRef',      header: 'Ref',       render: r => <span className="font-mono text-xs text-text-muted">{r.txRef}</span> },
        { key: 'status',     header: 'Status',    render: r => statusBadge(r.status) },
        { key: 'date',       header: 'Date',      render: r => <span className="font-mono text-text-muted">{r.date}</span> },
      ]}
    />
  )
}
