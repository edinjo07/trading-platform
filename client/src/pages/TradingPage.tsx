import React, { useEffect, useState } from 'react'
import TVPublicChart from '../components/charts/TVPublicChart'
import CandlestickChart from '../components/charts/CandlestickChart'
import DepthChart from '../components/charts/DepthChart'
import OrderBook from '../components/trading/OrderBook'
import TradeHistory from '../components/trading/TradeHistory'
import OrderForm from '../components/trading/OrderForm'
import { useTradingStore } from '../store/tradingStore'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

type ChartView = 'candles' | 'depth'
type RightTab = 'book' | 'trades'

const CHART_BG = '#060a10'

export default function TradingPage() {
  const {
    candles, selectedSymbol, chartInterval, setChartInterval,
    loadCandles, loading, orderBook, tickers, loadPortfolio, loadPendingLimitOrders,
  } = useTradingStore()
  const [chartView, setChartView] = useState<ChartView>('candles')
  const [rightTab, setRightTab] = useState<RightTab>('book')

  const ticker = tickers[selectedSymbol]
  const isUp = (ticker?.changePercent ?? 0) >= 0

  useEffect(() => { loadCandles() }, [selectedSymbol, chartInterval, loadCandles])
  useEffect(() => { loadPortfolio() }, [loadPortfolio])
  useEffect(() => { loadPendingLimitOrders() }, [loadPendingLimitOrders])

  return (
    <div className="theme-dark-scope flex flex-col lg:flex-row gap-0 h-full overflow-hidden -m-4">
      {/* ── Chart + order book column ─────────────────────────── */}
      <div className="h-[58vh] shrink-0 lg:h-auto lg:flex-1 lg:min-w-0 flex flex-col overflow-hidden">
        {/* Sub-header: symbol + price strip */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0"
             style={{ background: '#080e1a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
            <span className="font-mono font-bold text-text-primary text-sm shrink-0">{selectedSymbol}</span>
            {ticker && (
              <>
                <span className={`font-mono font-bold text-sm tabular shrink-0 ${isUp ? 'text-bull' : 'text-bear'}`}>
                  {ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </span>
                <span className={`text-xs font-semibold tabular shrink-0 ${isUp ? 'text-bull' : 'text-bear'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
                <div className="w-px h-4 bg-white/10 shrink-0" />
                <span className="text-2xs text-text-muted shrink-0">H <span className="text-text-secondary font-mono">{ticker.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></span>
                <span className="text-2xs text-text-muted shrink-0">L <span className="text-text-secondary font-mono">{ticker.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></span>
                <span className="text-2xs text-text-muted hidden lg:inline shrink-0">
                  Vol <span className="text-text-secondary font-mono">
                    {ticker.volume24h >= 1e9 ? `${(ticker.volume24h/1e9).toFixed(2)}B`
                      : ticker.volume24h >= 1e6 ? `${(ticker.volume24h/1e6).toFixed(2)}M`
                      : `${(ticker.volume24h/1e3).toFixed(0)}K`}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Interval selector (only for candle view) */}
          {chartView === 'candles' && (
            <div className="flex items-center gap-px ml-3 shrink-0">
              {(['1m','5m','15m','1h','4h','1d'] as const).map(iv => (
                <button
                  key={iv}
                  onClick={() => setChartInterval(iv)}
                  className="px-2 py-1 rounded text-[11px] font-semibold transition-all"
                  style={chartInterval === iv
                    ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }
                    : { color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  {iv.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Chart / Depth toggle */}
          <div className="ml-auto shrink-0 flex gap-px p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['candles', 'depth'] as ChartView[]).map(v => (
              <button key={v} onClick={() => setChartView(v)}
                className="px-2.5 py-1 rounded text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                style={chartView === v
                  ? { background: 'rgba(14,165,233,0.2)', color: '#38bdf8' }
                  : { color: '#6b8099' }
                }>
                {v === 'candles'
                  ? <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 6v4m0 8v-4m0 0h-2v-4h2v4zm8-10v2m0 10v4m0-14h2v6h-2m0 0h-2v-6h2"/></svg>
                  : <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 18h7M3 14h9M3 10h11M3 6h13"/><path d="M21 18l-3-3m0 6l3-3"/></svg>}
                <span className="hidden sm:inline">{v === 'candles' ? 'Chart' : 'Depth'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main split: chart + right panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Chart */}
          <div className="flex-1 min-w-0 overflow-hidden" style={{ background: CHART_BG, height: '100%' }}>
            <ErrorBoundary>
              {chartView === 'candles' ? (
                <TVPublicChart symbol={selectedSymbol} interval={chartInterval} />
              ) : (
                <DepthChart orderBook={orderBook} symbol={selectedSymbol} />
              )}
            </ErrorBoundary>
          </div>

          {/* Right panel: Book + Trades — hidden on mobile */}
          <div className="hidden lg:flex w-[220px] shrink-0 flex-col overflow-hidden"
               style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: '#080e1a' }}>
            <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {(['book', 'trades'] as RightTab[]).map(t => (
                <button key={t} onClick={() => setRightTab(t)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-all uppercase tracking-wide"
                  style={rightTab === t
                    ? { color: '#38bdf8', borderBottom: '2px solid #0ea5e9' }
                    : { color: '#4b6070', borderBottom: '2px solid transparent' }
                  }>
                  {t === 'book' ? 'Order Book' : 'Trades'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {rightTab === 'book' ? <OrderBook /> : <TradeHistory />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order form — full width below chart on mobile, fixed right on desktop ── */}
      <div className="flex-1 overflow-y-auto lg:flex-none lg:w-[300px] lg:overflow-hidden shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l"
           style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#060a10' }}>
        <OrderForm />
      </div>
    </div>
  )
}
