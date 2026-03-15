import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function ManualLeadsPage() {
  return <LeadsTable title="Manual Leads" subtitle="Leads entered manually by the sales team" filter={r => r.source === 'Referral' || r.source === 'Email Campaign'} />
}
