import React, { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import { Candle } from '../../types'

const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']

interface Props {
  candles: Candle[]
  symbol: string
  interval: string
  onIntervalChange: (interval: string) => void
  loading?: boolean
}

type CandleData = { time: number; open: number; high: number; low: number; close: number }
type VolumeData = { time: number; value: number; color: string }

export default function CandlestickChart({ candles, symbol, interval, onIntervalChange, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const prevCandleCountRef = useRef(0)

  const initChart = useCallback(() => {
    if (!containerRef.current) return

    chartRef.current?.remove()
    chartRef.current = null
    candleSeriesRef.current = null
    volumeSeriesRef.current = null

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#06090f' },
        textColor: '#6b7280',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
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
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.1, bottom: 0.28 },  // leave room for volume
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: interval === '1m' || interval === '3m' || interval === '5m',
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    // Price series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00c878',
      downColor: '#ff3047',
      borderUpColor: '#00c878',
      borderDownColor: '#ff3047',
      wickUpColor: '#00e88a',
      wickDownColor: '#ff6070',
    })

    // Volume series (overlay on separate price scale)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => { resizeObserver.disconnect() }
  }, [interval])

  useEffect(() => {
    const cleanup = initChart()
    return cleanup
  }, [initChart])

  // Full data load
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return
    if (!Array.isArray(candles) || candles.length === 0) return

    const cData: CandleData[] = candles.map(c => ({
      time: c.time as unknown as number,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }))
    const vData: VolumeData[] = candles.map(c => ({
      time: c.time as unknown as number,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0,200,120,0.35)' : 'rgba(255,48,71,0.35)',
    }))

    candleSeriesRef.current.setData(cData as Parameters<typeof candleSeriesRef.current.setData>[0])
    volumeSeriesRef.current.setData(vData as Parameters<typeof volumeSeriesRef.current.setData>[0])
    chartRef.current?.timeScale().fitContent()
    prevCandleCountRef.current = candles.length
  }, [candles])

  return (
    <div className="flex flex-col h-full rounded-lg border border-white/5" style={{ background: '#06090f' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-white font-mono text-sm font-semibold tracking-wide">{symbol}</span>
          <span className="text-text-muted text-xs font-mono">Candles + Volume</span>
        </div>
        <div className="flex items-center gap-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => onIntervalChange(iv)}
              className={`px-2.5 py-1 text-xs rounded font-mono transition-all ${
                interval === iv
                  ? 'text-brand-300'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'rgba(6,9,15,0.8)' }}>
            <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
              <div className="w-3 h-3 border-2 border-gray-500 border-t-brand-500 rounded-full animate-spin" />
              Loading chart data...
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}

