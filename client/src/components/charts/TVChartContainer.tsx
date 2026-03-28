/**
 * TVChartContainer
 *
 * React wrapper for the TradingView Advanced Charts (Charting Library) widget.
 *
 * ─── SETUP ─────────────────────────────────────────────────────────────────
 *  1. Request library access at https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/
 *  2. Clone tradingview/charting_library and copy the contents of the
 *     `charting_library/` folder into  client/public/charting_library/
 *  3. The widget will load automatically from that path at runtime.
 * ───────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react'
import { tvDatafeed, INTERVAL_TO_TV_RES } from '../../api/tvDatafeed'
import { TVBrokerApi } from '../../api/tvBrokerApi'

const LIBRARY_PATH = '/charting_library/'

// Dark-theme overrides that match our UI colours
const DARK_OVERRIDES: Record<string, string | number | boolean> = {
  'paneProperties.background':                         '#06090f',
  'paneProperties.backgroundType':                     'solid',
  'paneProperties.vertGridProperties.color':           'rgba(255,255,255,0.03)',
  'paneProperties.horzGridProperties.color':           'rgba(255,255,255,0.03)',
  'symbolWatermarkProperties.transparency':             90,
  'scalesProperties.textColor':                        '#6b7280',
  'scalesProperties.backgroundColor':                  '#06090f',
  'mainSeriesProperties.candleStyle.upColor':          '#00c878',
  'mainSeriesProperties.candleStyle.downColor':        '#ff3047',
  'mainSeriesProperties.candleStyle.borderUpColor':    '#00c878',
  'mainSeriesProperties.candleStyle.borderDownColor':  '#ff3047',
  'mainSeriesProperties.candleStyle.wickUpColor':      '#00e88a',
  'mainSeriesProperties.candleStyle.wickDownColor':    '#ff6070',
  'mainSeriesProperties.candleStyle.drawWick':         true,
  'mainSeriesProperties.candleStyle.drawBorder':       true,
}

interface Props {
  symbol: string
  /** Initial interval in our app's format ("1m", "5m", "1h", "1d", etc.). */
  interval?: string
}

export default function TVChartContainer({ symbol, interval = '1h' }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const widgetRef     = useRef<Charting_Library.IChartingLibraryWidget | null>(null)
  const scriptRef     = useRef<HTMLScriptElement | null>(null)
  const readyRef      = useRef(false)

  // Initial symbol / interval - kept in refs so the effect closure stays stable
  const initSymbolRef   = useRef(symbol)
  const initIntervalRef = useRef(interval)

  // ─── Create / destroy the widget ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    function createWidget() {
      if (!containerRef.current || !window.TradingView) return
      if (widgetRef.current) { widgetRef.current.remove(); widgetRef.current = null }

      const tvInterval = INTERVAL_TO_TV_RES[initIntervalRef.current] ?? '60'

      widgetRef.current = new window.TradingView.widget({
        container:         containerRef.current,
        datafeed:          tvDatafeed,
        library_path:      LIBRARY_PATH,
        locale:            'en',
        symbol:            initSymbolRef.current,
        interval:          tvInterval,
        autosize:          true,
        theme:             'dark',
        timezone:          'Etc/UTC',
        toolbar_bg:        '#06090f',
        loading_screen:    { backgroundColor: '#06090f', foregroundColor: '#0ea5e9' },
        overrides:         DARK_OVERRIDES,
        // broker_factory enables chart-native order placement (Trading Platform only)
        broker_factory:    (host: Charting_Library.IBrokerConnectionAdapterHost) => new TVBrokerApi(host),
        disabled_features: [
          'header_compare',
          'header_screenshot',
          'use_localstorage_for_settings',
          'header_saveload',
          'go_to_date',
        ],
        enabled_features: [
          'hide_left_toolbar_by_default',
          'show_spread_operators',
        ],
        time_frames: [
          { text: '1d',  resolution: '1',   description: '1 Day',    title: '1D' },
          { text: '5d',  resolution: '5',   description: '5 Days',   title: '5D' },
          { text: '1m',  resolution: '30',  description: '1 Month',  title: '1M' },
          { text: '3m',  resolution: '60',  description: '3 Months', title: '3M' },
          { text: '6m',  resolution: '240', description: '6 Months', title: '6M' },
          { text: '1y',  resolution: '1D',  description: '1 Year',   title: '1Y' },
          { text: '5y',  resolution: '1W',  description: '5 Years',  title: '5Y' },
        ],
        favorites: {
          intervals: ['1', '5', '15', '60', '240', '1D'],
        },
      })

      widgetRef.current.onChartReady(() => {
        readyRef.current = true
        // Explicitly enable scroll (pan) and zoom so mouse wheel / drag always
        // work regardless of any feature-flag default.
        const chart = widgetRef.current!.activeChart()
        chart.setScrollEnabled(true)
        chart.setZoomEnabled(true)
      })
    }

    // Load charting_library.js once, then create the widget
    if (window.TradingView) {
      createWidget()
    } else {
      const script = document.createElement('script')
      script.src    = `${LIBRARY_PATH}charting_library.js`
      script.async  = true
      script.onload = createWidget
      script.onerror = () => {
        console.error(
          '[TVChartContainer] Failed to load charting_library.js.\n' +
          'Place the Charting Library files in client/public/charting_library/\n' +
          'See: https://www.tradingview.com/charting-library-docs/latest/getting_started/',
        )
      }
      document.head.appendChild(script)
      scriptRef.current = script
    }

    return () => {
      widgetRef.current?.remove()
      widgetRef.current = null
      readyRef.current  = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once - symbol/interval changes handled below

  // ─── React to symbol changes ───────────────────────────────────────────────
  useEffect(() => {
    initSymbolRef.current = symbol
    if (!readyRef.current || !widgetRef.current) return
    const tvInterval = INTERVAL_TO_TV_RES[interval] ?? '60'
    widgetRef.current.chart().setSymbol(symbol, tvInterval)
  }, [symbol, interval])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#06090f' }}
    />
  )
}
