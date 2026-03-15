import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function RetentionPage() {
  return <LeadsTable title="Retention" subtitle="Leads assigned to the retention team" filter={r => r.assignedTo.toLowerCase().includes('anna') || r.status === 'pending'} />
}
