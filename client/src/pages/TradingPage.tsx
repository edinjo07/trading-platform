import React, { useEffect, useState } from 'react'
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
    loadCandles, loading, orderBook, tickers,
  } = useTradingStore()
  const [chartView, setChartView] = useState<ChartView>('candles')
  const [rightTab, setRightTab] = useState<RightTab>('book')

  const ticker = tickers[selectedSymbol]
  const isUp = (ticker?.changePercent ?? 0) >= 0

  useEffect(() => { loadCandles() }, [selectedSymbol, chartInterval, loadCandles])

  return (
    <div className="flex gap-0 h-full overflow-hidden -m-4">
      {/* ── Chart + order book column ─────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sub-header: symbol + price strip */}
        <div className="flex items-center gap-4 px-4 py-2.5 shrink-0"
             style={{ background: '#080e1a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-text-primary text-sm">{selectedSymbol}</span>
            {ticker && (
              <>
                <span className={`font-mono font-bold text-base tabular ${isUp ? 'text-bull' : 'text-bear'}`}>
                  {ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </span>
                <span className={`text-xs font-semibold tabular ${isUp ? 'text-bull' : 'text-bear'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-2xs text-text-muted">H <span className="text-text-secondary font-mono">{ticker.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></span>
                <span className="text-2xs text-text-muted">L <span className="text-text-secondary font-mono">{ticker.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></span>
                <span className="text-2xs text-text-muted hidden lg:inline">
                  Vol <span className="text-text-secondary font-mono">
                    {ticker.volume24h >= 1e9 ? `${(ticker.volume24h/1e9).toFixed(2)}B`
                      : ticker.volume24h >= 1e6 ? `${(ticker.volume24h/1e6).toFixed(2)}M`
                      : `${(ticker.volume24h/1e3).toFixed(0)}K`}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Chart view + interval controls */}
          <div className="ml-auto flex items-center gap-2">
            {/* Chart / Depth toggle */}
            <div className="flex gap-px p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['candles', 'depth'] as ChartView[]).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className="px-3 py-1 rounded text-xs font-semibold transition-all capitalize"
                  style={chartView === v
                    ? { background: 'rgba(14,165,233,0.2)', color: '#38bdf8' }
                    : { color: '#6b8099' }
                  }>
                  {v === 'candles' ? '📈 Chart' : '📉 Depth'}
                </button>
              ))}
            </div>

            {false && chartView === 'candles' && (
              <div className="flex gap-px">
                {['1m','5m','15m','1h','4h','1d'].map(iv => (
                  <button key={iv} onClick={() => setChartInterval(iv)}
                    className="px-2 py-1 rounded text-xs font-mono font-semibold transition-all"
                    style={chartInterval === iv
                      ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }
                      : { color: '#4b6070' }
                    }>
                    {iv}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main split: chart + right panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Chart */}
          <div className="flex-1 min-w-0 overflow-hidden" style={{ background: CHART_BG }}>
            <ErrorBoundary>
              {chartView === 'candles' ? (
                <CandlestickChart
                  candles={candles}
                  symbol={selectedSymbol}
                  interval={chartInterval}
                  onIntervalChange={setChartInterval}
                  loading={loading}
                />
              ) : (
                <DepthChart orderBook={orderBook} symbol={selectedSymbol} />
              )}
            </ErrorBoundary>
          </div>

          {/* Right panel: Book + Trades */}
          <div className="w-[220px] shrink-0 flex flex-col overflow-hidden"
               style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: '#080e1a' }}>
            {/* Tab header */}
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

      {/* ── Order form (right) ──────────────────────────────── */}
      <div className="w-[280px] shrink-0 overflow-y-auto flex flex-col"
           style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: '#08101a' }}>
        <OrderForm />
      </div>
    </div>
  )
}

