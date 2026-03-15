import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function LiveSalesLeadsPage() {
  return <LeadsTable title="Live Sales Leads" subtitle="Active leads currently in the sales pipeline" filter={r => r.status === 'live' || r.status === 'pending'} />
}
