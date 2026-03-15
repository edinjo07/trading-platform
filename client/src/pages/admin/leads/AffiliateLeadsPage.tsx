import React from 'react'
import { LeadsTable } from './_LeadsTable'
export default function AffiliateLeadsPage() {
  return <LeadsTable title="Affiliate Leads" subtitle="Leads sourced from affiliate partners" filter={r => r.source === 'Affiliate'} />
}
