import { useEffect, useRef, useCallback } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'
import { Ticker, OrderBook, Trade, Candle } from '../types'
import api from '../api/client'

// ---------------------------------------------------------------------------
// Polling fallback (used when backend has no WebSocket — e.g. Vercel deploy)
// ---------------------------------------------------------------------------
function startPolling(
  getSymbol: () => string | null,
  mountedRef: React.MutableRefObject<boolean>
): () => void {
  const timers: ReturnType<typeof setInterval>[] = []
  let lastSymbol: string | null = null

  async function fetchTickers() {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<Ticker[]>('/markets/tickers')
      if (mountedRef.current) useTradingStore.getState().updateTickers(data)
    } catch { /* ignore */ }
  }

  async function fetchOrderBook(symbol: string) {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<OrderBook>(`/markets/orderbook/${encodeURIComponent(symbol)}?depth=15`)
      if (mountedRef.current) useTradingStore.getState().updateOrderBook(data)
    } catch { /* ignore */ }
  }

  async function fetchTrades(symbol: string) {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<Trade[]>(`/markets/trades/${encodeURIComponent(symbol)}?count=30`)
      if (mountedRef.current) useTradingStore.getState().updateRecentTrades(data)
    } catch { /* ignore */ }
  }

  async function fetchCandles(symbol: string) {
    if (!mountedRef.current) return
    try {
      const { data } = await api.get<Candle[]>(`/markets/candles/${encodeURIComponent(symbol)}?interval=1h&limit=300`)
      if (mountedRef.current) useTradingStore.getState().setLiveCandleHistory(data)
    } catch { /* ignore */ }
  }

  // Tickers every 2s
  fetchTickers()
  timers.push(setInterval(fetchTickers, 2000))

  // Order book + trades every 2s, and fetch candles on symbol change
  timers.push(setInterval(() => {
    const sym = getSymbol()
    if (!sym) return
    fetchOrderBook(sym)
    fetchTrades(sym)
    // Reload candles when symbol changes
    if (sym !== lastSymbol) {
      lastSymbol = sym
      fetchCandles(sym)
    }
  }, 2000))

  console.log('[Poll] REST polling started — WebSocket unavailable on this deployment')

  return () => {
    timers.forEach(clearInterval)
  }
}

function buildWsUrl(token?: string | null): string | null {
  // Use explicit WS URL if configured (production backend), otherwise derive from current host
  const explicit = import.meta.env.VITE_WS_URL
  if (!explicit && import.meta.env.PROD) {
    // No backend URL configured in production — WebSocket unavailable
    return null
  }
  const base = explicit
    ? explicit.replace(/\/$/, '') + '/ws'
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

export function useWebSocket() {
  const wsRef        = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(true)
  const stopPollRef  = useRef<(() => void) | null>(null)

  // Keep latest values in refs — reading these inside connect() won't cause dep changes
  const tokenRef       = useRef<string | null>(null)
  const selectedSymRef = useRef<string | null>(null)
  const prevSymbolRef  = useRef<string | null>(null)
  const tokenAtMount   = useRef<string | null>(null)

  // Pull token + symbol from store (for syncing into refs only)
  const token          = useAuthStore(s => s.token)
  const selectedSymbol = useTradingStore(s => s.selectedSymbol)

  useEffect(() => { tokenRef.current = token }, [token])
  useEffect(() => { selectedSymRef.current = selectedSymbol }, [selectedSymbol])

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', payload: { channel } })
  }, [send])

  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', payload: { channel } })
  }, [send])

  // STABLE connect — zero changing deps; reads everything via refs
  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
      wsRef.current = null
    }

    const wsUrl = buildWsUrl(tokenRef.current)
    if (!wsUrl) {
      // No WebSocket backend — fall back to REST polling
      if (!stopPollRef.current) {
        stopPollRef.current = startPolling(() => selectedSymRef.current, mountedRef)
      }
      return
    }
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.log('[WS] Connected')
      const sym = selectedSymRef.current
      if (sym) {
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `orderbook:${sym}` } }))
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `trades:${sym}` } }))
        ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: `candle:${sym}` } }))
      }
      prevSymbolRef.current = sym
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const { type, payload } = JSON.parse(event.data)
        // Always read directly from store to avoid stale closures
        const s = useTradingStore.getState()
        const t = useToastStore.getState()

        if (type === 'tickers') {
          s.updateTickers(payload as Ticker[])
        } else if (type === 'orderbook') {
          s.updateOrderBook(payload as OrderBook)
        } else if (type === 'trades') {
          s.updateRecentTrades(payload as Trade[])
        } else if (type === 'trade') {
          s.addRecentTrade(payload as Trade)
        } else if (type === 'candle_history') {
          const { symbol, candles } = payload as { symbol: string; candles: Candle[] }
          if (symbol === s.selectedSymbol) s.setLiveCandleHistory(candles)
        } else if (type === 'candle_update' || type === 'candle_closed') {
          const { symbol, candle } = payload as { symbol: string; candle: Candle }
          if (symbol === s.selectedSymbol) s.updateLiveCandle(candle)
        } else if (type === 'order_fill') {
          const { symbol, side, quantity, fillPrice } = payload as {
            symbol: string; side: string; quantity: number; fillPrice: number
          }
          t.addToast({
            title: 'Order Filled',
            message: `${side.toUpperCase()} ${quantity} ${symbol} @ $${fillPrice.toLocaleString()}`,
            variant: side === 'buy' ? 'success' : 'info',
          })
          setTimeout(() => { s.loadOrders(); s.loadPortfolio() }, 300)
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      console.log('[WS] Disconnected — reconnecting in 3s')
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => { ws.onclose = null; ws.close() }
  }, []) // ← intentionally stable: no deps

  // Connect once on mount
  useEffect(() => {
    mountedRef.current = true
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

  // Reconnect only when auth token actually changes (login/logout)
  useEffect(() => {
    if (tokenAtMount.current === undefined) return // first render
    if (token !== tokenAtMount.current) {
      tokenAtMount.current = token
      connect()
    }
  }, [token, connect])

  // Symbol change: swap subscriptions without full reconnect
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
