import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function LiveLeadsPage() {
  return <LeadsTable title="Live Leads" subtitle="Real-time incoming leads currently active" filter={r => r.status === 'live'} />
}
