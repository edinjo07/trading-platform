import React, { useRef, useEffect } from 'react'
import { useTradingStore } from '../../store/tradingStore'
import { formatPrice } from '../../utils/formatters'

const ROWS = 12

export default function OrderBook() {
  const { orderBook, selectedSymbol, tickers } = useTradingStore()
  const ticker = tickers[selectedSymbol]

  if (!orderBook) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs">
        <span className="animate-pulse">Loading…</span>
      </div>
    )
  }

  const asks = orderBook.asks.slice(0, ROWS)
  const bids = orderBook.bids.slice(0, ROWS)

  const maxAsk = asks.reduce((m, a) => Math.max(m, a.total), 0) || 1
  const maxBid = bids.reduce((m, b) => Math.max(m, b.total), 0) || 1
  const spread = asks.length && bids.length
    ? asks[0].price - bids[0].price
    : 0
  const spreadPct = bids.length ? (spread / bids[0].price) * 100 : 0

  const totalBidDepth = bids.reduce((s, b) => s + b.size, 0)
  const totalAskDepth = asks.reduce((s, a) => s + a.size, 0)
  const bidPct = totalBidDepth / (totalBidDepth + totalAskDepth + 0.001) * 100

  return (
    <div className="flex flex-col h-full text-xs font-mono select-none" style={{ background: '#080e1a' }}>
      {/* Depth bar */}
      <div className="shrink-0 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex h-1.5 rounded-full overflow-hidden">
          <div className="transition-all" style={{ width: `${bidPct}%`, background: '#00c878' }} />
          <div className="flex-1" style={{ background: '#ff3047' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-bull text-2xs">{bidPct.toFixed(0)}% B</span>
          <span className="text-bear text-2xs">{(100 - bidPct).toFixed(0)}% A</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex justify-between px-3 py-1 text-text-muted text-2xs uppercase tracking-wider shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      {/* Asks (reversed – lowest ask at bottom nearest mid) */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto flex flex-col-reverse">
          {[...asks].reverse().map((ask, i) => (
            <div key={i} className="relative flex justify-between px-3 py-[3px] group hover:bg-white/[0.025]">
              <div className="absolute inset-y-0 right-0 transition-all"
                   style={{ width: `${(ask.total / maxAsk) * 100}%`, background: 'rgba(255,48,71,0.1)' }} />
              <span className="text-bear z-10 tabular">{formatPrice(ask.price, selectedSymbol)}</span>
              <span className="text-text-secondary z-10 tabular">{ask.size.toFixed(4)}</span>
              <span className="text-text-muted z-10 tabular">{ask.total.toFixed(3)}</span>
            </div>
          ))}
        </div>

        {/* Spread / mid price */}
        {ticker && (
          <div className="shrink-0 flex items-center justify-between px-3 py-2"
               style={{ background: 'rgba(14,165,233,0.06)', borderTop: '1px solid rgba(14,165,233,0.12)', borderBottom: '1px solid rgba(14,165,233,0.12)' }}>
            <div>
              <span className={`font-bold text-sm tabular ${isUp(ticker.changePercent) ? 'text-bull' : 'text-bear'}`}>
                {formatPrice(ticker.price, selectedSymbol)}
              </span>
              <span className={`ml-1.5 text-2xs ${isUp(ticker.changePercent) ? 'text-bull' : 'text-bear'}`}>
                {isUp(ticker.changePercent) ? '▲' : '▼'}
              </span>
            </div>
            {spread > 0 && (
              <div className="text-right">
                <div className="text-2xs text-text-muted">Spread</div>
                <div className="text-2xs text-text-secondary tabular">
                  {spreadPct < 0.01 ? spread.toFixed(5) : spread.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bids */}
        <div className="flex-1 overflow-y-auto">
          {bids.map((bid, i) => (
            <div key={i} className="relative flex justify-between px-3 py-[3px] hover:bg-white/[0.025]">
              <div className="absolute inset-y-0 right-0 transition-all"
                   style={{ width: `${(bid.total / maxBid) * 100}%`, background: 'rgba(0,200,120,0.08)' }} />
              <span className="text-bull z-10 tabular">{formatPrice(bid.price, selectedSymbol)}</span>
              <span className="text-text-secondary z-10 tabular">{bid.size.toFixed(4)}</span>
              <span className="text-text-muted z-10 tabular">{bid.total.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function isUp(chg: number) { return chg >= 0 }

