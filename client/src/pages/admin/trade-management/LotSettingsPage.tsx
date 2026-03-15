import React from 'react'
import AdminListPage, { statusBadge } from '../../../components/admin/AdminListPage'

interface LotRow { symbol: string; minLot: number; maxLot: number; stepLot: number; defaultLot: number; category: string; status: string }

const SYMBOLS = ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','BTC/USDT','ETH/USDT','XAUUSD','OIL','SP500','AAPL','NVDA','SOL/USDT']

function genLots(): LotRow[] {
  const cats = ['forex','forex','forex','forex','crypto','crypto','commodities','commodities','index','stock','stock','crypto']
  return SYMBOLS.map((s, i) => ({
    symbol: s, minLot: 0.01, maxLot: [100, 500, 1000, 50][i % 4], stepLot: 0.01, defaultLot: 0.1, category: cats[i], status: 'enabled',
  }))
}

export default function LotSettingsPage() {
  const data = genLots()
  return (
    <AdminListPage
      title="Lot Settings"
      subtitle="Configure lot size constraints per trading instrument"
      rowKey={r => r.symbol}
      data={data}
      columns={[
        { key: 'symbol',      header: 'Symbol',      render: r => <span className="font-mono font-bold text-text-primary">{r.symbol}</span> },
        { key: 'category',    header: 'Category',    render: r => <span className="capitalize text-text-secondary">{r.category}</span> },
        { key: 'minLot',      header: 'Min Lot',     render: r => <span className="font-mono">{r.minLot}</span> },
        { key: 'maxLot',      header: 'Max Lot',     render: r => <span className="font-mono">{r.maxLot}</span> },
        { key: 'stepLot',     header: 'Lot Step',    render: r => <span className="font-mono">{r.stepLot}</span> },
        { key: 'defaultLot',  header: 'Default Lot', render: r => <span className="font-mono">{r.defaultLot}</span> },
        { key: 'status',      header: 'Status',      render: r => statusBadge(r.status) },
      ]}
    />
  )
}
