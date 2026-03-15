import React, { useMemo } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'
import { generateTrades } from '../../../utils/adminMock'

export default function ClosedTradesPage() {
  const data = useMemo(() => generateTrades(80).filter(t => t.status === 'closed'), [])
  return (
    <AdminListPage
      title="Closed Trades"
      subtitle="Full history of all closed and settled trades"
      rowKey={r => r.id}
      data={data}
      columns={[
        { key: 'id',         header: 'Trade ID',   render: r => <span className="font-mono text-brand-300">{r.id}</span> },
        { key: 'user',       header: 'User' },
        { key: 'symbol',     header: 'Symbol',      render: r => <span className="font-mono font-semibold text-text-primary">{r.symbol}</span> },
        { key: 'side',       header: 'Side',        render: r => <span className={`font-semibold ${r.side === 'buy' ? 'text-bull' : 'text-bear'}`}>{r.side.toUpperCase()}</span> },
        { key: 'lots',       header: 'Lots',        render: r => <span className="font-mono">{r.lots}</span> },
        { key: 'openPrice',  header: 'Open',        render: r => <span className="font-mono">${r.openPrice.toLocaleString()}</span> },
        { key: 'closePrice', header: 'Close',       render: r => <span className="font-mono">${r.closePrice.toLocaleString()}</span> },
        { key: 'pnl',        header: 'Realized P&L', render: r => <span className={`font-mono font-semibold ${r.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>{r.pnl >= 0 ? '+' : ''}${r.pnl.toLocaleString()}</span> },
        { key: 'closeTime',  header: 'Closed',      render: r => <span className="font-mono text-text-muted">{r.closeTime}</span> },
      ]}
    />
  )
}
