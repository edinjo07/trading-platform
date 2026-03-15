import React, { useState } from 'react'
import AdminListPage, { statusBadge, Badge } from '../../../components/admin/AdminListPage'

interface StaffRow {
  id: string; name: string; email: string; role: string; department: string
  permissions: string; status: string; lastLogin: string; created: string
}

const ROLES = ['Super Admin', 'Admin', 'Support', 'Finance', 'Compliance', 'Sales Manager']
const DEPTS = ['Operations', 'Finance', 'Support', 'Compliance', 'Sales', 'IT']

function generateStaff(): StaffRow[] {
  const names = ['Sarah Johnson', 'Mike Chen', 'Anna Kovac', 'David Lee', 'Rita Patel', 'Tom Williams', 'Grace Zhang', 'Carlos Ruiz']
  return names.map((name, i) => ({
    id: `STF-${String(i + 1).padStart(3, '0')}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@tradex.io`,
    role: ROLES[i % ROLES.length],
    department: DEPTS[i % DEPTS.length],
    permissions: i === 0 ? 'full' : i < 3 ? 'admin' : 'limited',
    status: i === 5 ? 'inactive' : 'active',
    lastLogin: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString().split('T')[0],
    created: new Date(Date.now() - Math.random() * 730 * 86400000).toISOString().split('T')[0],
  }))
}

const permBadge = (p: string) => {
  const m: Record<string, { color: string; bg: string }> = {
    full:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    admin:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    limited: { color: '#6b8099', bg: 'rgba(107,128,153,0.1)' },
  }
  const s = m[p] ?? m.limited
  return <Badge label={p} color={s.color} bg={s.bg} />
}

export default function AdminStaffsPage() {
  const data = generateStaff()
  return (
    <AdminListPage
      title="Admin & Staff"
      subtitle="Manage administrator and staff accounts with role-based access"
      rowKey={r => r.id}
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: 'id',         header: 'Staff ID',   render: r => <span className="font-mono text-brand-300">{String(r.id)}</span> },
        { key: 'name',       header: 'Name',       render: r => <span className="font-semibold text-text-primary">{String(r.name)}</span> },
        { key: 'email',      header: 'Email',      render: r => <span className="text-text-secondary">{String(r.email)}</span> },
        { key: 'role',       header: 'Role',       render: r => (
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>{String(r.role)}</span>
        )},
        { key: 'department', header: 'Department' },
        { key: 'permissions',header: 'Permissions', render: r => permBadge(String(r.permissions)) },
        { key: 'status',     header: 'Status',     render: r => statusBadge(String(r.status)) },
        { key: 'lastLogin',  header: 'Last Login', render: r => <span className="font-mono text-text-muted">{String(r.lastLogin)}</span> },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Invite Staff
        </button>
      }
    />
  )
}
