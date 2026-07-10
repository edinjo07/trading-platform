import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function ClientsPage() {
  return <LeadsTable title="Clients" subtitle="All registered clients in the CRM system"
    extra={<button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#4f8cff,#3b78f0)' }}>+ Add Client</button>} />
}
