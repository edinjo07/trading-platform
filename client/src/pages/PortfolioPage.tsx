import React, { useEffect } from 'react'
import PortfolioSummary from '../components/portfolio/PortfolioSummary'
import PositionsTable from '../components/portfolio/PositionsTable'
import { useTradingStore } from '../store/tradingStore'
import { formatCurrency } from '../utils/formatters'

function PerfMetric({ label, value, sub, accent, warn }: {
  label: string; value: string; sub?: string; accent?: string; warn?: boolean
}) {
  const color = warn ? '#ff3047' : accent ?? '#38bdf8'
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="font-bold text-lg font-mono tabular" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PortfolioPage() {
  const { loadPortfolio, loadAnalytics, portfolio, performanceStats } = useTradingStore()

  useEffect(() => {
    loadPortfolio(); loadAnalytics()
    const interval = setInterval(loadPortfolio, 5000)
    return () => clearInterval(interval)
  }, [loadPortfolio, loadAnalytics])

  const ps = performanceStats
  const hasStats = ps && ps.totalTrades > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold">Portfolio</h1>
        <p className="text-text-muted text-sm mt-1">Track your equity, cash, open positions and trading performance</p>
      </div>

      {/* Equity summary cards */}
      <PortfolioSummary />

      {/* Performance stats */}
      {hasStats ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Performance Metrics</h2>
            <p className="text-xs text-text-muted mt-0.5">Based on {ps.totalTrades} total trades</p>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <PerfMetric label="Net Profit" value={formatCurrency(ps.netProfit)}
              accent={ps.netProfit >= 0 ? '#00c878' : '#ff3047'} />
            <PerfMetric label="Win Rate" value={`${(ps.winRate * 100).toFixed(1)}%`}
              sub={`${ps.winningTrades}W / ${ps.losingTrades}L`}
              accent={ps.winRate >= 0.5 ? '#00c878' : '#f59e0b'} />
            <PerfMetric label="Profit Factor" value={ps.profitFactor > 0 ? ps.profitFactor.toFixed(2) : '-'}
              sub="Gross profit / loss" accent={ps.profitFactor >= 1.5 ? '#00c878' : ps.profitFactor >= 1 ? '#f59e0b' : '#ff3047'} />
            <PerfMetric label="Max Drawdown" value={`${ps.maxDrawdownPercent.toFixed(1)}%`}
              sub={formatCurrency(ps.maxDrawdown)} warn={ps.maxDrawdownPercent > 20} />
            <PerfMetric label="Sharpe Ratio" value={ps.sharpeRatio > 0 ? ps.sharpeRatio.toFixed(2) : '-'}
              accent={ps.sharpeRatio >= 1.5 ? '#00c878' : ps.sharpeRatio >= 0.5 ? '#f59e0b' : '#ff3047'} />
            <PerfMetric label="Expectancy" value={formatCurrency(ps.expectancy)}
              sub="Per trade avg" accent={ps.expectancy >= 0 ? '#00c878' : '#ff3047'} />
          </div>
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PerfMetric label="Avg Win" value={formatCurrency(ps.avgWin)} accent="#00c878" />
            <PerfMetric label="Avg Loss" value={formatCurrency(ps.avgLoss)} accent="#ff3047" />
            <PerfMetric label="Best Trade" value={formatCurrency(ps.bestTrade)} accent="#00c878" />
            <PerfMetric label="Worst Trade" value={formatCurrency(ps.worstTrade)} accent="#ff3047" />
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
               style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <p className="text-text-secondary text-sm font-medium">No performance data yet</p>
          <p className="text-text-muted text-xs mt-1">Complete your first trade to see statistics here</p>
        </div>
      )}

      {/* Positions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary font-semibold">Open Positions</h2>
          <span className="badge badge-gray text-[10px]">Live</span>
        </div>
        <PositionsTable />
      </div>
    </div>
  )
}
