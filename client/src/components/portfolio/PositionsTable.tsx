import React, { useState } from 'react'
import { useTradingStore } from '../../store/tradingStore'
import { useToastStore } from '../../store/toastStore'
import { formatCurrency, formatPrice, formatPnl } from '../../utils/formatters'

export default function PositionsTable() {
  const { portfolio, setSelectedSymbol, closePosition } = useTradingStore()
  const { addToast } = useToastStore()
  const positions = portfolio?.positions ?? []
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null)

  const handleClose = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation()
    setClosingSymbol(symbol)
    try {
      await closePosition(symbol)
      addToast({ title: 'Position Closing', message: `Market order submitted to close ${symbol}`, variant: 'info', duration: 3500 })
    } catch (err) {
      addToast({ title: 'Close Failed', message: err instanceof Error ? err.message : 'Failed to close position', variant: 'error' })
    } finally {
      setClosingSymbol(null)
    }
  }

  if (positions.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 gap-3">
        <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
        </svg>
        <p className="text-text-muted text-sm font-medium">No open positions</p>
        <p className="text-text-muted text-xs">Place a trade to see your positions here</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            {['Symbol', 'Side/Lev', 'Qty', 'Avg Cost', 'Mark Price', 'Notional', 'Unreal. P&L', 'P&L %', 'Liq. Price', ''].map((h, i) => (
              <th key={i} className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${i > 1 && i < 9 ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const isPos = pos.unrealizedPnl >= 0
            const pnlColor = isPos ? '#00c878' : '#ff3047'
            const rowBg = isPos ? 'rgba(0,200,120,0.025)' : 'rgba(255,48,71,0.025)'
            const isClosing = closingSymbol === pos.symbol
            return (
              <tr key={pos.symbol}
                className="transition-colors cursor-pointer font-mono"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: rowBg }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = rowBg}
                onClick={() => setSelectedSymbol(pos.symbol)}>
                <td className="px-4 py-3 font-bold text-text-primary">{pos.symbol}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={pos.side === 'long'
                        ? { background: 'rgba(0,200,120,0.15)', color: '#00c878' }
                        : { background: 'rgba(255,48,71,0.15)', color: '#ff3047' }}>
                      {pos.side.toUpperCase()}
                    </span>
                    {(pos.leverage ?? 1) > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          background: 'rgba(245,158,11,0.15)',
                          color: (pos.leverage ?? 1) >= 25 ? '#ef4444' : (pos.leverage ?? 1) >= 10 ? '#f59e0b' : '#38bdf8',
                          border: `1px solid ${(pos.leverage ?? 1) >= 25 ? '#ef444430' : (pos.leverage ?? 1) >= 10 ? '#f59e0b30' : '#38bdf830'}`,
                        }}>
                        {pos.leverage}x
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary tabular">{pos.quantity}</td>
                <td className="px-4 py-3 text-right text-text-secondary tabular">{formatPrice(pos.avgCost, pos.symbol)}</td>
                <td className="px-4 py-3 text-right text-text-primary tabular">{formatPrice(pos.currentPrice, pos.symbol)}</td>
                <td className="px-4 py-3 text-right text-text-secondary tabular">
                  <div className="flex flex-col items-end gap-0.5">
                    <span>{formatCurrency(pos.notionalValue ?? pos.marketValue)}</span>
                    {(pos.leverage ?? 1) > 1 && pos.margin && (
                      <span className="text-[9px]" style={{ color: '#4b6080' }}>
                        margin: {formatCurrency(pos.margin)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular font-semibold" style={{ color: pnlColor }}>
                  {formatPnl(pos.unrealizedPnl)}
                </td>
                <td className="px-4 py-3 text-right tabular font-semibold" style={{ color: pnlColor }}>
                  {pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right tabular">
                  {(pos.leverage ?? 1) > 1 && pos.liquidationPrice
                    ? <span className="font-mono text-[10px] font-semibold" style={{ color: '#ef4444' }}>
                        {formatPrice(pos.liquidationPrice, pos.symbol)}
                      </span>
                    : <span style={{ color: '#2d4460' }}>—</span>
                  }
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={isClosing}
                    onClick={(e) => handleClose(e, pos.symbol)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,48,71,0.12)', color: '#ff3047', border: '1px solid rgba(255,48,71,0.25)' }}
                    onMouseEnter={e => { if (!isClosing) (e.currentTarget as HTMLElement).style.background = 'rgba(255,48,71,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,48,71,0.12)' }}>
                    {isClosing ? '…' : 'Close'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

