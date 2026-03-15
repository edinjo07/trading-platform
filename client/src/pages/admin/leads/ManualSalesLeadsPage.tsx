import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function ManualSalesLeadsPage() {
  return <LeadsTable title="Manual Sales Leads" subtitle="Sales leads created manually by agents" filter={r => r.source === 'Email Campaign' || r.source === 'Referral'} />
}
