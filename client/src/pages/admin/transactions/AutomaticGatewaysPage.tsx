import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateDeposits } from '../../../utils/adminMock'

export default function AutomaticGatewaysPage() {
  const data = useMemo(() => generateDeposits(40).filter((_, i) => i % 2 === 0).map(d => ({ ...d, gateway: 'Automatic', method: d.method })), [])
  return (
    <AdminListPage
      title="Automatic Gateways"
      subtitle="Transactions processed via automated payment gateways"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',       header: 'ID',        render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',     header: 'User' },
        { key: 'amount',   header: 'Amount',    render: r => <span className="font-mono font-semibold text-bull">${r.amount.toLocaleString()}</span> },
        { key: 'currency', header: 'Currency' },
        { key: 'method',   header: 'Method' },
        { key: 'gateway',  header: 'Gateway',   render: r => <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>{r.gateway}</span> },
        { key: 'txRef',    header: 'Ref',       render: r => <span className="font-mono text-xs text-text-muted">{r.txRef}</span> },
        { key: 'status',   header: 'Status',    render: r => statusBadge(r.status) },
        { key: 'date',     header: 'Date',      render: r => <span className="font-mono text-text-muted">{r.date}</span> },
      ]}
    />
  )
}
