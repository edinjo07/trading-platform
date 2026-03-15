import React, { useState } from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'

interface SpreadRow { symbol: string; rawSpread: number; markup: number; totalSpread: number; account: string; status: string }

const SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USDT', 'ETH/USDT', 'XAUUSD', 'OIL', 'SP500', 'AAPL']

function genSpreads(): SpreadRow[] {
  return SYMBOLS.map(sym => {
    const raw = Math.round(Math.random() * 0.5 * 10) / 10
    const markup = Math.round(Math.random() * 1.5 * 10) / 10
    return { symbol: sym, rawSpread: raw, markup, totalSpread: Math.round((raw + markup) * 10) / 10, account: ['Standard', 'Raw'][Math.floor(Math.random()*2)], status: 'enabled' }
  })
}

export default function SpreadSettingsPage() {
  const data = genSpreads()
  return (
    <AdminListPage
      title="Spread Settings"
      subtitle="Configure raw spreads and markup by instrument and account type"
      rowKey={r => r.symbol}
      data={data}
      columns={[
        { key: 'symbol',      header: 'Symbol',       render: r => <span className="font-mono font-bold text-text-primary">{r.symbol}</span> },
        { key: 'account',     header: 'Account Type', render: r => <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>{r.account}</span> },
        { key: 'rawSpread',   header: 'Raw Spread',   render: r => <span className="font-mono text-text-primary">{r.rawSpread} pip</span> },
        { key: 'markup',      header: 'Markup',       render: r => <span className="font-mono text-warning">{r.markup} pip</span> },
        { key: 'totalSpread', header: 'Total Spread', render: r => <span className="font-mono font-semibold text-bull">{r.totalSpread} pip</span> },
        { key: 'status',      header: 'Status',       render: r => statusBadge(r.status) },
      ]}
    />
  )
}
