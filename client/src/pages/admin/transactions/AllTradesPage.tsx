import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateTrades } from '../../../utils/adminMock'

export default function AllTradesPage() {
  const data = useMemo(() => generateTrades(80), [])
  return (
    <AdminListPage
      title="All Trades"
      subtitle="Complete trading history across all users and instruments"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',         header: 'Trade ID',   render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',       header: 'User',        render: r => <span className="text-text-primary">{r.user}</span> },
        { key: 'symbol',     header: 'Symbol',      render: r => <span className="font-mono font-semibold text-text-primary">{r.symbol}</span> },
        { key: 'side',       header: 'Side',        render: r => <span className={`font-semibold ${r.side === 'buy' ? 'text-bull' : 'text-bear'}`}>{r.side.toUpperCase()}</span> },
        { key: 'lots',       header: 'Lots',        render: r => <span className="font-mono">{r.lots}</span> },
        { key: 'openPrice',  header: 'Open',        render: r => <span className="font-mono">${r.openPrice.toLocaleString()}</span> },
        { key: 'closePrice', header: 'Close',       render: r => <span className="font-mono">${r.closePrice.toLocaleString()}</span> },
        { key: 'pnl',        header: 'P&L',         render: r => <span className={`font-mono font-semibold ${r.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{r.pnl >= 0 ? '+' : ''}${r.pnl.toLocaleString()}</span> },
        { key: 'status',     header: 'Status',      render: r => statusBadge(r.status) },
        { key: 'openTime',   header: 'Date',        render: r => <span className="font-mono text-text-muted">{r.openTime}</span> },
      ]}
      actions={
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + New Trade
        </button>
      }
    />
  )
}
