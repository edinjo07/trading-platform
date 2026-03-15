import React, { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
} from 'lightweight-charts'
import { OrderBook } from '../../types'

interface Props {
  orderBook: OrderBook | null
  symbol: string
}

type AreaPoint = { time: number; value: number }

export default function DepthChart({ orderBook, symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const bidSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const askSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  const initChart = useCallback(() => {
    if (!containerRef.current) return
    chartRef.current?.remove()

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#06090f' },
        textColor: '#6b7280',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2330' },
        horzLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2330' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)', mode: PriceScaleMode.Normal },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },  // x-axis is price, not time
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      handleScroll: false,
      handleScale: false,
    })

    const bidSeries = chart.addAreaSeries({
      lineColor: '#00c878',
      topColor: 'rgba(0,200,120,0.25)',
      bottomColor: 'rgba(0,200,120,0.0)',
      lineWidth: 2,
      priceFormat: { type: 'volume' },
    })

    const askSeries = chart.addAreaSeries({
      lineColor: '#ff3047',
      topColor: 'rgba(255,48,71,0.25)',
      bottomColor: 'rgba(255,48,71,0.0)',
      lineWidth: 2,
      priceFormat: { type: 'volume' },
    })

    chartRef.current = chart
    bidSeriesRef.current = bidSeries
    askSeriesRef.current = askSeries

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      }
    })
    ro.observe(containerRef.current)
    return () => { ro.disconnect(); chartRef.current?.remove() }
  }, [])

  useEffect(() => {
    const cleanup = initChart()
    return cleanup
  }, [initChart])

  // Build cumulative depth data from order book
  useEffect(() => {
    if (!orderBook || !bidSeriesRef.current || !askSeriesRef.current) return

    // Bids: price ascending (left side of depth chart), cumulative from spread outward
    // We use "time" as a stand-in for price levels (lightweight-charts requires time)
    // Instead, we render bid side reversed (highest bid first) and ask side ascending

    const bidData: AreaPoint[] = []
    let bidCumulative = 0
    for (let i = 0; i < orderBook.bids.length; i++) {
      bidCumulative += orderBook.bids[i].size
      bidData.push({ time: i as unknown as number, value: bidCumulative })
    }

    const askData: AreaPoint[] = []
    let askCumulative = 0
    for (let i = 0; i < orderBook.asks.length; i++) {
      askCumulative += orderBook.asks[i].size
      askData.push({ time: (orderBook.bids.length + i) as unknown as number, value: askCumulative })
    }

    try {
      bidSeriesRef.current.setData(bidData as Parameters<typeof bidSeriesRef.current.setData>[0])
      askSeriesRef.current.setData(askData as Parameters<typeof askSeriesRef.current.setData>[0])
      chartRef.current?.timeScale().fitContent()
    } catch { /* ignore stale refs */ }
  }, [orderBook])

  const bidTotal = orderBook?.bids.reduce((s, b) => s + b.size, 0) ?? 0
  const askTotal = orderBook?.asks.reduce((s, a) => s + a.size, 0) ?? 0
  const totalDepth = bidTotal + askTotal
  const bidPct = totalDepth > 0 ? Math.round((bidTotal / totalDepth) * 100) : 50
  const askPct = 100 - bidPct

  return (
    <div className="flex flex-col h-full rounded-lg border border-white/5" style={{ background: '#06090f' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-text-muted text-xs font-mono font-medium">Market Depth</span>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span style={{ color: '#00c878' }}>{bidPct}% Bid</span>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,48,71,0.25)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${bidPct}%`, background: '#00c878' }} />
          </div>
          <span style={{ color: '#ff3047' }}>{askPct}% Ask</span>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        {!orderBook && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs font-mono">
            Waiting for order book...
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
