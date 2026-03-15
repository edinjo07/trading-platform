import React, { useRef, useEffect } from 'react'
import { useTradingStore } from '../../store/tradingStore'
import { formatPrice, formatTime } from '../../utils/formatters'

export default function TradeHistory() {
  const { recentTrades, selectedSymbol } = useTradingStore()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new trade comes in
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [recentTrades.length])

  return (
    <div className="flex flex-col h-full font-mono text-xs" style={{ background: '#080e1a' }}>
      {/* Column headers */}
      <div className="flex justify-between px-3 py-1.5 text-text-muted text-2xs uppercase tracking-wider shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <span>Price</span>
        <span>Size</span>
        <span>Time</span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {recentTrades.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-text-muted text-2xs animate-pulse">
            Waiting for trades…
          </div>
        ) : (
          recentTrades.slice(0, 60).map(trade => (
            <div key={trade.id}
              className="flex justify-between px-3 py-[3px] hover:bg-white/[0.02]">
              <span className={`tabular ${trade.side === 'buy' ? 'text-bull' : 'text-bear'}`}>
                {formatPrice(trade.price, selectedSymbol)}
              </span>
              <span className="text-text-secondary tabular">{trade.size.toFixed(4)}</span>
              <span className="text-text-muted tabular">{formatTime(trade.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
