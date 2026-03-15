import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateUsers } from '../../../utils/adminMock'

export default function KYCPage() {
  const data = useMemo(() =>
    generateUsers(70).map(u => ({
      ...u,
      kycDate: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
      docType: ['Passport', 'Driver License', 'National ID'][Math.floor(Math.random() * 3)],
      reviewer: ['Auto', 'Sarah J.', 'Mike C.', 'Anna K.'][Math.floor(Math.random() * 4)],
    })), [])

  return (
    <AdminListPage
      title="KYC Verification"
      subtitle="Know Your Customer verification queue and status tracker"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',       header: 'User ID',   render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'username', header: 'Username',  render: r => <span className="font-semibold text-text-primary">{r.username}</span> },
        { key: 'email',    header: 'Email',     render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'country',  header: 'Country' },
        { key: 'docType',  header: 'Doc Type' },
        { key: 'kycDate',  header: 'Submitted', render: r => <span className="font-mono text-text-muted">{(r as any).kycDate}</span> },
        { key: 'reviewer', header: 'Reviewer',  render: r => <span className="text-text-primary">{(r as any).reviewer}</span> },
        { key: 'kyc',      header: 'KYC Status', render: r => statusBadge(r.kyc) },
      ]}
      actions={
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#00c878,#059669)' }}>Approve</button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#ff3047,#b91c1c)' }}>Reject</button>
        </div>
      }
    />
  )
}
