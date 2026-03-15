import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateUsers } from '../../../utils/adminMock'

export default function AllCustomersPage() {
  const data = useMemo(() => generateUsers(70), [])
  return (
    <AdminListPage
      title="All Customers"
      subtitle="Complete list of all registered platform users"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',         header: 'User ID',    render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'username',   header: 'Username',   render: r => <span className="font-semibold text-text-primary">{r.username}</span> },
        { key: 'email',      header: 'Email',      render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'country',    header: 'Country' },
        { key: 'balance',    header: 'Balance',    render: r => <span className="font-mono font-semibold text-text-primary">${r.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: 'kyc',        header: 'KYC',        render: r => statusBadge(r.kyc) },
        { key: 'status',     header: 'Status',     render: r => statusBadge(r.status) },
        { key: 'registered', header: 'Registered', render: r => <span className="font-mono text-text-muted">{r.registered}</span> },
        { key: 'lastLogin',  header: 'Last Login', render: r => <span className="font-mono text-text-muted">{r.lastLogin}</span> },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Add Customer
        </button>
      }
    />
  )
}
