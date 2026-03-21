/**
 * TVPublicChart
 *
 * Uses the TradingView FREE public widget API (tv.js from s.tradingview.com).
 * No charting library license required. Loads a full chart via iframe with:
 *   - All drawing tools
 *   - 100+ built-in indicators
 *   - Zoom, pan, multi-timeframe
 *   - TradingView's own real market data
 *
 * Script source: https://s.tradingview.com/tv.js
 * API: new TradingView.widget({ ... })   (extracted from foliox.pro tv.js)
 */

import React, { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Symbol mapping: our internal symbol → TradingView feed:symbol format
// ---------------------------------------------------------------------------
const TO_TV_SYMBOL: Record<string, string> = {
  // ── Crypto ──────────────────────────────────────────────────────────────
  BTCUSD:   'BINANCE:BTCUSDT',
  ETHUSD:   'BINANCE:ETHUSDT',
  LTCUSD:   'BINANCE:LTCUSDT',
  BCHUSD:   'BINANCE:BCHUSDT',
  DSHUSD:   'BINANCE:DASHUSDT',
  XRPUSD:   'BINANCE:XRPUSDT',
  DOTUSD:   'BINANCE:DOTUSDT',
  LNKUSD:   'BINANCE:LINKUSDT',
  ADAUSD:   'BINANCE:ADAUSDT',
  BNBUSD:   'BINANCE:BNBUSDT',
  SOLUSD:   'BINANCE:SOLUSDT',
  AVAXUSD:  'BINANCE:AVAXUSDT',
  MATICUSD: 'BINANCE:MATICUSDT',
  DOGEUSD:  'BINANCE:DOGEUSDT',
  XLMUSD:   'BINANCE:XLMUSDT',
  XTZUSD:   'BINANCE:XTZUSDT',
  UNIUSD:   'BINANCE:UNIUSDT',
  NEARUSD:  'BINANCE:NEARUSDT',
  ATOMUSD:  'BINANCE:ATOMUSDT',
  ALGOUSD:  'BINANCE:ALGOUSDT',
  FILUSD:   'BINANCE:FILUSDT',
  // ── Forex Majors ────────────────────────────────────────────────────────
  EURUSD:   'FX:EURUSD',
  GBPUSD:   'FX:GBPUSD',
  USDJPY:   'FX:USDJPY',
  USDCHF:   'FX:USDCHF',
  USDCAD:   'FX:USDCAD',
  AUDUSD:   'FX:AUDUSD',
  NZDUSD:   'FX:NZDUSD',
  // ── Forex Minors ────────────────────────────────────────────────────────
  AUDCAD:   'FX:AUDCAD',
  AUDCHF:   'FX:AUDCHF',
  AUDJPY:   'FX:AUDJPY',
  AUDNZD:   'FX:AUDNZD',
  CADCHF:   'FX:CADCHF',
  CADJPY:   'FX:CADJPY',
  CHFJPY:   'FX:CHFJPY',
  EURAUD:   'FX:EURAUD',
  EURCAD:   'FX:EURCAD',
  EURCHF:   'FX:EURCHF',
  EURGBP:   'FX:EURGBP',
  EURJPY:   'FX:EURJPY',
  EURNZD:   'FX:EURNZD',
  GBPAUD:   'FX:GBPAUD',
  GBPCAD:   'FX:GBPCAD',
  GBPCHF:   'FX:GBPCHF',
  GBPJPY:   'FX:GBPJPY',
  GBPNZD:   'FX:GBPNZD',
  NZDCAD:   'FX:NZDCAD',
  NZDCHF:   'FX:NZDCHF',
  NZDJPY:   'FX:NZDJPY',
  // ── Forex Exotics ───────────────────────────────────────────────────────
  EURHUF:   'FX:EURHUF',
  EURNOK:   'FX:EURNOK',
  EURPLN:   'FX:EURPLN',
  EURSEK:   'FX:EURSEK',
  EURZAR:   'FX:EURZAR',
  EURMXN:   'FX:EURMXN',
  EURTRY:   'FX:EURTRY',
  GBPNOK:   'FX:GBPNOK',
  GBPPLN:   'FX:GBPPLN',
  GBPSEK:   'FX:GBPSEK',
  GBPZAR:   'FX:GBPZAR',
  USDCNH:   'FX:USDCNH',
  USDCZK:   'FX:USDCZK',
  USDDKK:   'FX:USDDKK',
  USDHKD:   'FX:USDHKD',
  USDHUF:   'FX:USDHUF',
  USDILS:   'FX:USDILS',
  USDMXN:   'FX:USDMXN',
  USDNOK:   'FX:USDNOK',
  USDPLN:   'FX:USDPLN',
  USDSEK:   'FX:USDSEK',
  USDSGD:   'FX:USDSGD',
  USDTHB:   'FX:USDTHB',
  USDZAR:   'FX:USDZAR',
  USDTRY:   'FX:USDTRY',
  NOKJPY:   'FX:NOKJPY',
  SGDJPY:   'FX:SGDJPY',
  AUDMXN:   'FX:AUDMXN',
  AUDSGD:   'FX:AUDSGD',
  EURSGD:   'FX:EURSGD',
  GBPSGD:   'FX:GBPSGD',
  NZDSGD:   'FX:NZDSGD',
  EURCZK:   'FX:EURCZK',
  // ── Precious Metals ─────────────────────────────────────────────────────
  XAUUSD:   'OANDA:XAUUSD',
  XAGUSD:   'OANDA:XAGUSD',
  XPTUSD:   'OANDA:XPTUSD',
  XPDUSD:   'OANDA:XPDUSD',
  // ── Energy ──────────────────────────────────────────────────────────────
  WTI:      'NYMEX:CL1!',
  BRENT:    'NYMEX:BB1!',
  XBRUSD:   'NYMEX:BB1!',
  NGAS:     'NYMEX:NG1!',
  GC25:     'COMEX:GC1!',
  // ── Agricultural & Soft Commodities ─────────────────────────────────────
  COCOA:    'ICEUS:CC1!',
  COFFEE:   'ICEUS:KC1!',
  CORN:     'CBOT:ZC1!',
  COTTON:   'ICEUS:CT1!',
  OJ:       'ICEUS:OJ1!',
  SOYBEAN:  'CBOT:ZS1!',
  SUGAR:    'ICEUS:SB1!',
  WHEAT:    'CBOT:ZW1!',
  COPPER:   'COMEX:HG1!',
  LUMBER:   'CME:LBR1!',
  HO:       'NYMEX:HO1!',
  // ── Indices ─────────────────────────────────────────────────────────────
  US500:    'SP:SPX',
  USTEC:    'NASDAQ:NDX',
  US30:     'DJ:DJI',
  UK100:    'SPREADEX:UK100',
  DE40:     'XETR:DAX',
  F40:      'EURONEXT:PX1',
  JP225:    'TVC:NI225',
  AUS200:   'ASX:XJO',
  STOXX50:  'TVC:SX5E',
  HK50:     'TVC:HSI',
  ES35:     'BME:IBC',
  IT40:     'MIL:FTSEMIB',
  NL25:     'EURONEXT:AEX',
  CH20:     'SIX:SMI',
  SING:     'SGX:STI',
  IN50:     'NSE:NIFTY50',
  DX:       'TVC:DXY',
  VIX:      'CBOE:VIX',
  CA60:     'TSX:OSPTSX60',
  KO200:    'KRX:KOSPI200',
  EUSTX50:  'TVC:SX5E',
  // ── Stocks ──────────────────────────────────────────────────────────────
  AAPL:     'NASDAQ:AAPL',
  TSLA:     'NASDAQ:TSLA',
  NVDA:     'NASDAQ:NVDA',
  MSFT:     'NASDAQ:MSFT',
  GOOGL:    'NASDAQ:GOOGL',
  AMZN:     'NASDAQ:AMZN',
  META:     'NASDAQ:META',
  JPM:      'NYSE:JPM',
  NFLX:     'NASDAQ:NFLX',
  COIN:     'NASDAQ:COIN',
  AMD:      'NASDAQ:AMD',
  DIS:      'NYSE:DIS',
  LMT:      'NYSE:LMT',
  RTX:      'NYSE:RTX',
  NOC:      'NYSE:NOC',
  GD:       'NYSE:GD',
  BA:       'NYSE:BA',
  HII:      'NYSE:HII',
  LDOS:     'NYSE:LDOS',
  CACI:     'NYSE:CACI',
  XOM:      'NYSE:XOM',
  CVX:      'NYSE:CVX',
  COP:      'NYSE:COP',
  // ── Bonds ───────────────────────────────────────────────────────────────
  TNOTE:    'CBOT:ZN1!',
  BUND:     'EUREX:FGBL1!',
  GILT:     'LIFFE:FLG1!',
  JGB:      'OSE:JGB1!',
  OAT:      'EUREX:FOAT1!',
  BTP:      'EUREX:FBTP1!',
  USBOND:   'CBOT:ZB1!',
}

// ---------------------------------------------------------------------------
// Interval mapping: our format → TradingView interval string
// ---------------------------------------------------------------------------
const TO_TV_INTERVAL: Record<string, string> = {
  '1m':  '1',
  '3m':  '3',
  '5m':  '5',
  '15m': '15',
  '30m': '30',
  '1h':  '60',
  '2h':  '120',
  '4h':  '240',
  '1d':  'D',
  '1w':  'W',
}

// TradingView public widget (tv.js) — separate from the Charting Library.
// We cast to `any` to avoid clashing with the charting_library.d.ts Window augmentation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTradingViewPublic = (): any => (window as any).TradingView

interface Props {
  symbol: string
  interval?: string
}

let scriptLoaded = false
const readyCallbacks: Array<() => void> = []

function loadTVScript(cb: () => void) {
  if (scriptLoaded) { cb(); return }
  readyCallbacks.push(cb)
  if (document.getElementById('tv-public-script')) return

  const script = document.createElement('script')
  script.id   = 'tv-public-script'
  script.src  = 'https://s.tradingview.com/tv.js'
  script.async = true
  script.onload = () => {
    scriptLoaded = true
    readyCallbacks.forEach(fn => fn())
    readyCallbacks.length = 0
  }
  document.head.appendChild(script)
}

export default function TVPublicChart({ symbol, interval = '1h' }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const widgetRef      = useRef<{ remove?: () => void } | null>(null)
  const containerIdRef = useRef(`tv_public_${Math.random().toString(36).slice(2)}`)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const containerId = containerIdRef.current
    const tvSymbol    = TO_TV_SYMBOL[symbol] ?? `BINANCE:${symbol.replace('USD', 'USDT')}`
    const tvInterval  = TO_TV_INTERVAL[interval] ?? '60'

    function createWidget() {
      const TV = getTradingViewPublic()
      if (!TV || !containerRef.current) return

      // Destroy previous widget cleanly
      try { widgetRef.current?.remove?.() } catch (_) { /* ignore */ }
      widgetRef.current = null

      // Ensure container div has the correct id
      containerRef.current.id = containerId

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      widgetRef.current = new TV.widget({
        container_id:        containerId,
        symbol:              tvSymbol,
        interval:            tvInterval,
        timezone:            'Etc/UTC',
        theme:               'dark',
        style:               '1',
        locale:              'en',
        toolbar_bg:          '#06090f',
        backgroundColor:     '#06090f',
        gridColor:           'rgba(255,255,255,0.03)',
        autosize:            true,
        hide_side_toolbar:   false,
        allow_symbol_change: false,
        hide_top_toolbar:    false,
        hide_legend:         false,
        save_image:          true,
        studies:             [],
        disabled_features: [
          'header_symbol_search',
          'symbol_search_hot_key',
          'display_market_status',
        ],
        enabled_features: [
          'study_templates',
          'hide_left_toolbar_by_default',
        ],
      })
      setReady(true)
    }

    loadTVScript(createWidget)

    return () => {
      try { widgetRef.current?.remove?.() } catch (_) { /* ignore */ }
      widgetRef.current = null
    }
  }, [symbol, interval])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', background: '#06090f' }}>
      {/* Loading overlay until widget fires */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: '#06090f', zIndex: 1,
        }}>
          <span style={{ color: '#4b6070', fontSize: '13px', fontFamily: 'monospace' }}>Loading chart…</span>
        </div>
      )}
      <div
        ref={containerRef}
        id={containerIdRef.current}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />
    </div>
  )
}
