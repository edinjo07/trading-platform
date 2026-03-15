import React from 'react'
import { useTradingStore } from '../../store/tradingStore'
import { formatCurrency, formatPnl } from '../../utils/formatters'

interface Stat { label: string; value: string; sub?: string; accent?: string }

function StatCard({ label, value, sub, accent }: Stat) {
  return (
    <div className="card-sm flex flex-col gap-1.5">
      <p className="stat-label">{label}</p>
      <p className="font-mono font-semibold text-xl tabular" style={{ color: accent ?? '#d4dde8' }}>{value}</p>
      {sub && <p className="text-xs font-mono text-text-muted tabular">{sub}</p>}
    </div>
  )
}

export default function PortfolioSummary() {
  const { portfolio } = useTradingStore()

  if (!portfolio) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-sm animate-pulse h-24" />
        ))}
      </div>
    )
  }

  const positionValue = portfolio.totalEquity - portfolio.cashBalance
  const investedPct = portfolio.totalEquity > 0 ? (positionValue / portfolio.totalEquity) * 100 : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Equity" value={formatCurrency(portfolio.totalEquity)}
        sub={`${investedPct.toFixed(1)}% invested`} />
      <StatCard label="Cash Available" value={formatCurrency(portfolio.cashBalance)}
        sub={`${(100 - investedPct).toFixed(1)}% free`} />
      <StatCard
        label="Unrealized P&L"
        value={formatPnl(portfolio.unrealizedPnl)}
        accent={portfolio.unrealizedPnl >= 0 ? '#00c878' : '#ff3047'}
      />
      <StatCard
        label="Realized P&L"
        value={formatPnl(portfolio.realizedPnl)}
        accent={portfolio.realizedPnl >= 0 ? '#00c878' : '#ff3047'}
      />
    </div>
  )
}
