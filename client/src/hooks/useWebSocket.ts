import { useEffect, useRef, useCallback } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'
import { Ticker, OrderBook, Trade, Candle } from '../types'
import api from '../api/client'
import { generateMockCandles, generateMockOrderBook, generateMockTrades, generateMockTickers } from '../utils/mockCandles'

// ---------------------------------------------------------------------------
// WebSocket URL resolution
// ---------------------------------------------------------------------------
// Priority:
//   1. VITE_WS_URL  - explicit wss:// endpoint
//   2. VITE_API_URL - derive wss:// only if it is an absolute HTTP URL
//   3. Fallback     - derive from current page host (works in dev + prod)
//
// Always returns a string. Polling starts as a live-data fallback whenever
// the connection fails or drops (see onerror / onclose handlers).
// ---------------------------------------------------------------------------
function buildWsUrl(token?: string | null): string {
  const explicitWs = import.meta.env.VITE_WS_URL as string | undefined
  const apiUrl     = import.meta.env.VITE_API_URL as string | undefined

  let base: string

  if (explicitWs) {
    // Explicit WS URL - normalise trailing /ws
    base = explicitWs.replace(/\/+$/, '').replace(/\/ws$/, '') + '/ws'
  } else if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    // Absolute API URL only - derive WS URL:
    //   https://backend.railway.app/api -> wss://backend.railway.app/ws
    //   http://localhost:5000/api       -> ws://localhost:5000/ws
    // Relative VITE_API_URL values (e.g. '/api') are intentionally skipped
    // because WebSocket requires an absolute URL.
    base = apiUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '') + '/ws'
  } else {
    // Dev: Vite proxies /ws -> ws://localhost:5000.
    // Prod with no separate backend: same host, WS upgrade will fail and
    // onerror starts polling as a fallback immediately.
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    base = `${proto}://${window.location.host}/ws`
  }

  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

// ---------------------------------------------------------------------------
// REST polling fallback - used when WebSocket is unavailable or disconnected
// ---------------------------------------------------------------------------
function startPolling(
  getSymbol: () => string | null,
  mountedRef: React.MutableRefObject<boolean>,
): () => void {
  const timers: ReturnType<typeof setInterval>[] = []
  let lastSymbol: string | null = null

  async function fetchTickers() {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<Ticker[]>('/markets/tickers')
      if (mountedRef.current) {
        useTradingStore.getState().updateTickers(
          Array.isArray(data) && data.length > 0 ? data : generateMockTickers(),
        )
      }
    } catch {
      if (mountedRef.current) useTradingStore.getState().updateTickers(generateMockTickers())
    }
  }

  async function fetchOrderBook(symbol: string) {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<OrderBook>(`/markets/orderbook/${encodeURIComponent(symbol)}?depth=15`)
      if (mountedRef.current) {
        useTradingStore.getState().updateOrderBook(
          data && Array.isArray(data.bids) && data.bids.length > 0
            ? data
            : generateMockOrderBook(symbol),
        )
      }
    } catch {
      if (mountedRef.current) useTradingStore.getState().updateOrderBook(generateMockOrderBook(symbol))
    }
  }

  async function fetchTrades(symbol: string) {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<Trade[]>(`/markets/trades/${encodeURIComponent(symbol)}?count=30`)
      if (mountedRef.current) {
        useTradingStore.getState().updateRecentTrades(
          Array.isArray(data) && data.length > 0 ? data : generateMockTrades(symbol),
        )
      }
    } catch {
      if (mountedRef.current) useTradingStore.getState().updateRecentTrades(generateMockTrades(symbol))
    }
  }

  async function fetchCandles(symbol: string) {
    if (!mountedRef.current) return
    const interval = useTradingStore.getState().chartInterval || '1h'
    try {
      const { data } = await api.get<Candle[]>(`/markets/candles/${encodeURIComponent(symbol)}?interval=${interval}&limit=300`)
      if (mountedRef.current) {
        useTradingStore.getState().setLiveCandleHistory(
          Array.isArray(data) && data.length > 0
            ? data
            : generateMockCandles(symbol, interval, 300),
        )
      }
    } catch {
      if (mountedRef.current) {
        useTradingStore.getState().setLiveCandleHistory(generateMockCandles(symbol, interval, 300))
      }
    }
  }

  // Tickers every 2s
  fetchTickers()
  timers.push(setInterval(fetchTickers, 2000))

  // Order book, trades, candles every 2s (candles only re-fetched on symbol change)
  const runSymbolFetch = () => {
    const sym = getSymbol()
    if (!sym) return
    fetchOrderBook(sym)
    fetchTrades(sym)
    if (sym !== lastSymbol) {
      lastSymbol = sym
      fetchCandles(sym)
    }
  }
  runSymbolFetch()
  timers.push(setInterval(runSymbolFetch, 2000))

  // Portfolio + orders every 5s
  useTradingStore.getState().loadPortfolio()
  useTradingStore.getState().loadOrders()
  timers.push(setInterval(() => {
    if (!mountedRef.current) return
    useTradingStore.getState().loadPortfolio()
    useTradingStore.getState().loadOrders()
  }, 5000))

  return () => timers.forEach(clearInterval)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWebSocket() {
  const wsRef         = useRef<WebSocket | null>(null)
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const mountedRef    = useRef(true)
  const stopPollRef   = useRef<(() => void) | null>(null)

  const tokenRef       = useRef<string | null>(null)
  const selectedSymRef = useRef<string | null>(null)
  const prevSymbolRef  = useRef<string | null>(null)
  const tokenAtMount   = useRef<string | null>(null)

  const token          = useAuthStore(s => s.token)
  const selectedSymbol = useTradingStore(s => s.selectedSymbol)

  useEffect(() => { tokenRef.current = token }, [token])
  useEffect(() => { selectedSymRef.current = selectedSymbol }, [selectedSymbol])

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe   = useCallback((ch: string) => send({ type: 'subscribe',   payload: { channel: ch } }), [send])
  const unsubscribe = useCallback((ch: string) => send({ type: 'unsubscribe', payload: { channel: ch } }), [send])

  // Exponential backoff: 1s, 2s, 4s ... capped at 30s
  const scheduleReconnect = useCallback((connectFn: () => void) => {
    if (!mountedRef.current) return
    const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
    retryCountRef.current += 1
    reconnectRef.current = setTimeout(connectFn, delay)
  }, [])

  // When an explicit WS endpoint is configured (VITE_WS_URL - e.g. Railway) we know
  // WebSocket WILL work; transient failures on cold-start should be retried indefinitely.
  // When WS is derived from window.location.host (e.g. Vercel serverless) we give up
  // after a few attempts and fall back to REST polling permanently.
  const HAS_EXPLICIT_WS = Boolean(import.meta.env.VITE_WS_URL)
  const MAX_WS_RETRIES  = HAS_EXPLICIT_WS ? Number.MAX_SAFE_INTEGER : 3

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // After MAX_WS_RETRIES consecutive failures on a same-host endpoint (e.g. Vercel),
    // stop trying and stay on REST polling indefinitely.
    if (!HAS_EXPLICIT_WS && retryCountRef.current >= MAX_WS_RETRIES) {
      if (!stopPollRef.current) {
        stopPollRef.current = startPolling(() => selectedSymRef.current, mountedRef)
      }
      return
    }

    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null }

    // Don't abort a connection that's still being established
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.onerror = null; wsRef.current.close(); wsRef.current = null }

    const wsUrl = buildWsUrl(tokenRef.current)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      retryCountRef.current = 0   // reset backoff on successful connect
      console.log('[WS] Connected')

      // If the token loaded after we started connecting, authenticate via message
      const currentToken = tokenRef.current
      if (currentToken && !wsUrl.includes('token=')) {
        ws.send(JSON.stringify({ type: 'auth', payload: { token: currentToken } }))
      }

      // WS is healthy - stop polling fallback
      if (stopPollRef.current) { stopPollRef.current(); stopPollRef.current = null }

      const sym = selectedSymRef.current
      if (sym) {
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `orderbook:${sym}` } }))
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `trades:${sym}` } }))
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `candle:${sym}` } }))
      }
      prevSymbolRef.current = sym

      // Ensure portfolio + orders are fresh on (re)connect
      useTradingStore.getState().loadPortfolio()
      useTradingStore.getState().loadOrders()
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const { type, payload } = JSON.parse(event.data as string)
        const s = useTradingStore.getState()
        const t = useToastStore.getState()

        if      (type === 'tickers')                          s.updateTickers(payload as Ticker[])
        else if (type === 'orderbook')                        s.updateOrderBook(payload as OrderBook)
        else if (type === 'trades')                           s.updateRecentTrades(payload as Trade[])
        else if (type === 'trade')                            s.addRecentTrade(payload as Trade)
        else if (type === 'candle_history') {
          const { symbol, candles } = payload as { symbol: string; candles: Candle[] }
          if (symbol === s.selectedSymbol) s.setLiveCandleHistory(candles)
        }
        else if (type === 'candle_update' || type === 'candle_closed') {
          const { symbol, candle } = payload as { symbol: string; candle: Candle }
          if (symbol === s.selectedSymbol) s.updateLiveCandle(candle)
        }
        else if (type === 'order_fill') {
          const { symbol, side, quantity, fillPrice } = payload as {
            symbol: string; side: string; quantity: number; fillPrice: number
          }
          t.addToast({
            title:   'Order Filled',
            message: `${side.toUpperCase()} ${quantity} ${symbol} @ $${fillPrice.toLocaleString()}`,
            variant: side === 'buy' ? 'success' : 'info',
          })
          setTimeout(() => { s.loadOrders(); s.loadPortfolio() }, 300)
        }
      } catch { /* ignore malformed messages */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      // WS dropped - start polling immediately so live data keeps working
      if (!stopPollRef.current) {
        stopPollRef.current = startPolling(() => selectedSymRef.current, mountedRef)
      }
      if (retryCountRef.current < MAX_WS_RETRIES) {
        scheduleReconnect(connect)
      }
    }

    ws.onerror = () => {
      // onclose fires right after onerror - null it to prevent double-reconnect
      ws.onclose = null
      ws.close()

      const failCount = retryCountRef.current

      if (HAS_EXPLICIT_WS) {
        // Explicit endpoint (Railway etc.): transient failures are expected on cold start.
        // Stay silent for the first couple of attempts; only start polling after 2+ failures
        // so the brief retry gap doesn't show blank data.
        if (failCount >= 2 && !stopPollRef.current) {
          stopPollRef.current = startPolling(() => selectedSymRef.current, mountedRef)
        }
      } else {
        // Same-host endpoint (Vercel etc.): WS likely not supported - start polling now.
        if (failCount === 0) {
          console.info('[WS] WebSocket unavailable - using REST polling fallback')
        }
        if (!stopPollRef.current) {
          stopPollRef.current = startPolling(() => selectedSymRef.current, mountedRef)
        }
      }

      scheduleReconnect(connect)
    }
  }, [scheduleReconnect]) // stable - all state read via refs

  // Connect once on mount
  useEffect(() => {
    mountedRef.current   = true
    tokenAtMount.current = tokenRef.current
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null }
      if (stopPollRef.current) { stopPollRef.current(); stopPollRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reconnect when auth token changes (login / logout)
  useEffect(() => {
    if (tokenAtMount.current === undefined) return
    if (token !== tokenAtMount.current) {
      tokenAtMount.current = token
      retryCountRef.current = 0
      const state = wsRef.current?.readyState
      if (state === WebSocket.OPEN) {
        // Already open - re-authenticate in-place without disrupting the connection
        if (token) wsRef.current!.send(JSON.stringify({ type: 'auth', payload: { token } }))
      } else if (state !== WebSocket.CONNECTING) {
        // Closed or no connection - start fresh with the new token
        connect()
      }
      // If CONNECTING, the CONNECTING guard in connect() lets it establish;
      // the onopen handler will then send the 'auth' message with the current token.
    }
  }, [token, connect])

  // Symbol change: swap channel subscriptions without full reconnect
  useEffect(() => {
    const prev = prevSymbolRef.current
    if (prev && prev !== selectedSymbol) {
      unsubscribe(`orderbook:${prev}`)
      unsubscribe(`trades:${prev}`)
      unsubscribe(`candle:${prev}`)
    }
    if (selectedSymbol && wsRef.current?.readyState === WebSocket.OPEN) {
      subscribe(`orderbook:${selectedSymbol}`)
      subscribe(`trades:${selectedSymbol}`)
      subscribe(`candle:${selectedSymbol}`)
    }
    prevSymbolRef.current = selectedSymbol
  }, [selectedSymbol, subscribe, unsubscribe])
}