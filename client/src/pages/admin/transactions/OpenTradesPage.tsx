import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateTrades } from '../../../utils/adminMock'

export default function OpenTradesPage() {
  const data = useMemo(() => generateTrades(80).filter(t => t.status === 'open'), [])
  return (
    <AdminListPage
      title="Open Trades"
      subtitle="All currently active open positions across users"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',        header: 'Trade ID',  render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',      header: 'User',       render: r => <span className="text-text-primary">{r.user}</span> },
        { key: 'symbol',    header: 'Symbol',     render: r => <span className="font-mono font-semibold text-text-primary">{r.symbol}</span> },
        { key: 'side',      header: 'Side',       render: r => <span className={`font-semibold ${r.side === 'buy' ? 'text-bull' : 'text-bear'}`}>{r.side.toUpperCase()}</span> },
        { key: 'lots',      header: 'Lots',       render: r => <span className="font-mono">{r.lots}</span> },
        { key: 'openPrice', header: 'Open Price', render: r => <span className="font-mono">${r.openPrice.toLocaleString()}</span> },
        { key: 'pnl',       header: 'Float P&L',  render: r => <span className={`font-mono font-semibold ${r.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{r.pnl >= 0 ? '+' : ''}${r.pnl.toLocaleString()}</span> },
        { key: 'openTime',  header: 'Opened',     render: r => <span className="font-mono text-text-muted">{r.openTime}</span> },
        { key: 'status',    header: 'Status',     render: r => statusBadge(r.status) },
      ]}
    />
  )
}
