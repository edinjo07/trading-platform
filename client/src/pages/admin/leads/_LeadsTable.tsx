/** Shared helper – renders a leads table filtered by status or unfiltered */
import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateLeads, LeadRow } from '../../../utils/adminMock'

export function LeadsTable({
  title,
  subtitle,
  filter,
  extra,
}: {
  title: string
  subtitle?: string
  filter?: (r: LeadRow) => boolean
  extra?: React.ReactNode
}) {
  const all = useMemo(() => generateLeads(65), [])
  const data = filter ? all.filter(filter) : all
  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',         header: 'Lead ID',    render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'name',       header: 'Name',       render: r => <span className="font-semibold text-text-primary">{r.name}</span> },
        { key: 'email',      header: 'Email',      render: r => <span className="text-text-secondary">{r.email}</span> },
        { key: 'phone',      header: 'Phone',      render: r => <span className="font-mono text-text-secondary">{r.phone}</span> },
        { key: 'country',    header: 'Country' },
        { key: 'source',     header: 'Source',     render: r => <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{r.source}</span> },
        { key: 'assignedTo', header: 'Assigned to', render: r => <span className="text-text-primary">{r.assignedTo}</span> },
        { key: 'status',     header: 'Status',     render: r => statusBadge(r.status) },
        { key: 'created',    header: 'Created',    render: r => <span className="font-mono text-text-muted">{r.created}</span> },
      ]}
      actions={extra}
    />
  )
}
