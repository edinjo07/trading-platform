import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function ArchivedLeadsPage() {
  return <LeadsTable title="Archived Leads" subtitle="Leads that have been closed or archived" filter={r => r.status === 'archived'} />
}
