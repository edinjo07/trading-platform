import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'

interface TeamRow { id: string; name: string; lead: string; members: number; region: string; leadsAssigned: number; converted: number; convRate: string; status: string }

function genTeams(): TeamRow[] {
  const teams = [
    { name: 'Alpha Sales',   lead: 'Sarah Johnson', region: 'North America' },
    { name: 'Beta Retention',lead: 'Mike Chen',      region: 'APAC' },
    { name: 'Gamma Support', lead: 'Anna Kovac',     region: 'Europe' },
    { name: 'Delta Finance', lead: 'David Lee',      region: 'Middle East' },
    { name: 'Epsilon KYC',   lead: 'Rita Patel',     region: 'Global' },
  ]
  return teams.map((t, i) => {
    const leads = Math.floor(Math.random() * 200 + 50)
    const conv  = Math.floor(leads * (Math.random() * 0.4 + 0.1))
    return {
      id: `TM-${String(i+1).padStart(3,'0')}`,
      ...t,
      members: Math.floor(Math.random() * 8 + 2),
      leadsAssigned: leads,
      converted: conv,
      convRate: `${Math.round((conv/leads)*100)}%`,
      status: 'active',
    }
  })
}

export default function TeamsPage() {
  const data = useMemo(() => genTeams(), [])
  return (
    <AdminListPage
      title="Teams"
      subtitle="Manage sales, retention and support teams"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',             header: 'Team ID',     render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'name',           header: 'Team Name',   render: r => <span className="font-semibold text-text-primary">{r.name}</span> },
        { key: 'lead',           header: 'Team Lead',   render: r => <span className="text-text-primary">{r.lead}</span> },
        { key: 'members',        header: 'Members',     render: r => <span className="font-mono">{r.members}</span> },
        { key: 'region',         header: 'Region' },
        { key: 'leadsAssigned',  header: 'Leads',       render: r => <span className="font-mono">{r.leadsAssigned}</span> },
        { key: 'converted',      header: 'Converted',   render: r => <span className="font-mono text-bull">{r.converted}</span> },
        { key: 'convRate',       header: 'Conv. Rate',  render: r => <span className="font-mono font-semibold" style={{ color: '#38bdf8' }}>{r.convRate}</span> },
        { key: 'status',         header: 'Status',      render: r => statusBadge(r.status) },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + New Team
        </button>
      }
    />
  )
}
