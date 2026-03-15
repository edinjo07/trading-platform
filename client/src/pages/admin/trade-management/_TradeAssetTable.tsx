/** Shared table for trade asset management pages */
import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateTradeAssets } from '../../../utils/adminMock'

export function TradeAssetTable({ category, title, subtitle }: { category: string; title: string; subtitle?: string }) {
  const data = useMemo(() => generateTradeAssets(category, 30), [category])
  return (
    <AdminListPage
      title={title}
      subtitle={subtitle ?? `Manage ${title} trading instruments`}
      rowKey={r => r.symbol}
      data={data}
      columns={[
        { key: 'symbol',  header: 'Symbol',  render: r => <span className="font-mono font-bold text-text-primary">{r.symbol}</span> },
        { key: 'name',    header: 'Name' },
        { key: 'spread',  header: 'Spread',  render: r => <span className="font-mono text-info">{r.spread}</span> },
        { key: 'digits',  header: 'Digits',  render: r => <span className="font-mono">{r.digits}</span> },
        { key: 'minLot',  header: 'Min Lot', render: r => <span className="font-mono">{r.minLot}</span> },
        { key: 'maxLot',  header: 'Max Lot', render: r => <span className="font-mono">{r.maxLot}</span> },
        { key: 'stepLot', header: 'Lot Step',render: r => <span className="font-mono">{r.stepLot}</span> },
        { key: 'status',  header: 'Status',  render: r => statusBadge(r.status) },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Add Instrument
        </button>
      }
    />
  )
}
