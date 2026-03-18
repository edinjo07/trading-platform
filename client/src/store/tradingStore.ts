import { create } from 'zustand'
import { Ticker, OrderBook, Trade, Order, Portfolio, MarketSymbol, Candle, PerformanceStats, TradeRecord } from '../types'
import { getSymbols, getCandles, getOrderBook, getRecentTrades } from '../api/markets'
import { getOrders, placeOrder, cancelOrder, PlaceOrderParams } from '../api/orders'
import { getPortfolio } from '../api/portfolio'
import { getPerformanceStats, getTradeJournal } from '../api/analytics'
import { closePositionApi } from '../api/positions'
import { generateMockCandles, generateMockSymbols } from '../utils/mockCandles'

interface TradingState {
  // Symbols
  symbols: MarketSymbol[]
  selectedSymbol: string
  // Market data
  tickers: Record<string, Ticker>
  candles: Candle[]
  liveCandle: Candle | null   // current streaming candle
  orderBook: OrderBook | null
  recentTrades: Trade[]
  // Orders & Portfolio
  orders: Order[]
  portfolio: Portfolio | null
  // Analytics
  performanceStats: PerformanceStats | null
  tradeJournal: TradeRecord[]
  analyticsLoading: boolean
  // UI
  chartInterval: string
  loading: boolean
  error: string | null

  // Actions
  setSelectedSymbol: (symbol: string) => void
  setChartInterval: (interval: string) => void
  loadSymbols: () => Promise<void>
  loadCandles: () => Promise<void>
  loadOrders: () => Promise<void>
  loadPortfolio: () => Promise<void>
  loadAnalytics: () => Promise<void>
  placeOrder: (params: PlaceOrderParams) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  closePosition: (symbol: string) => Promise<void>
  // WS updates
  updateTickers: (tickers: Ticker[]) => void
  updateOrderBook: (orderBook: OrderBook) => void
  updateRecentTrades: (trades: Trade[]) => void
  addRecentTrade: (trade: Trade) => void
  setLiveCandleHistory: (candles: Candle[]) => void
  updateLiveCandle: (candle: Candle) => void
}

export const useTradingStore = create<TradingState>((set, get) => ({
  symbols: [],
  selectedSymbol: 'BTC/USDT',
  tickers: {},
  candles: [],
  liveCandle: null,
  orderBook: null,
  recentTrades: [],
  orders: [],
  portfolio: null,
  performanceStats: null,
  tradeJournal: [],
  analyticsLoading: false,
  chartInterval: '1h',
  loading: false,
  error: null,

  setSelectedSymbol: (symbol) => {
    set({ selectedSymbol: symbol, candles: [], liveCandle: null, orderBook: null, recentTrades: [] })
  },

  setChartInterval: (interval) => {
    set({ chartInterval: interval })
  },

  loadSymbols: async () => {
    try {
      const result = await getSymbols()
      if (Array.isArray(result) && result.length > 0) {
        set({ symbols: result })
      } else {
        // API unavailable — fall back to built-in symbol catalogue
        set({ symbols: generateMockSymbols() })
      }
    } catch {
      set({ symbols: generateMockSymbols() })
    }
  },

  loadCandles: async () => {
    const { selectedSymbol, chartInterval } = get()
    set({ loading: true })
    try {
      const result = await getCandles(selectedSymbol, chartInterval, 300)
      if (Array.isArray(result) && result.length > 0) {
        set({ candles: result, loading: false })
      } else {
        // API unavailable — use client-side mock data so chart always renders
        set({ candles: generateMockCandles(selectedSymbol, chartInterval, 300), loading: false })
      }
    } catch {
      set({ candles: generateMockCandles(selectedSymbol, chartInterval, 300), loading: false })
    }
  },

  loadOrders: async () => {
    try {
      const result = await getOrders()
      if (!Array.isArray(result)) return
      // If the server returns an empty array but we already have orders in state,
      // keep the existing state — a 200 [] response right after order placement
      // would otherwise wipe the optimistically-added order from the UI.
      // The 5-second polling loop will eventually reconcile once the DB confirms.
      const current = get().orders
      if (result.length === 0 && current.length > 0) return
      set({ orders: result })
    } catch {
      // 503 / network error — keep existing orders list
    }
  },

  loadPortfolio: async () => {
    try {
      const result = await getPortfolio()
      // Only set if result looks like a valid portfolio object
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        const incoming = result as Portfolio
        const current  = get().portfolio

        if (current) {
          // ── Timestamp guard (primary) ──────────────────────────────────────
          // Both the portfolio route and dbSavePortfolio stamp updated_at.
          // If the incoming response is older than what we already have, it's
          // from a stale cold-start container — discard it.
          if (incoming.updatedAt && current.updatedAt) {
            if (incoming.updatedAt < current.updatedAt) return
          }
        }

        set({ portfolio: incoming })
      }
    } catch {
      // 503 / network error → keep existing portfolio state, don't reset
    }
  },

  loadAnalytics: async () => {
    set({ analyticsLoading: true })
    try {
      const [performanceStats, tradeJournal] = await Promise.all([
        getPerformanceStats(),
        getTradeJournal(),
      ])
      set({
        performanceStats: (performanceStats && typeof performanceStats === 'object' && !Array.isArray(performanceStats)) ? performanceStats : null,
        tradeJournal: Array.isArray(tradeJournal) ? tradeJournal : [],
        analyticsLoading: false,
      })
    } catch {
      set({ error: 'Failed to load analytics', analyticsLoading: false })
    }
  },

  placeOrder: async (params) => {
    try {
      const order = await placeOrder(params)
      set((s) => ({ orders: [order, ...s.orders] }))

      // Immediately fetch the authoritative portfolio from the server.
      // The POST /api/orders handler awaits all DB writes before responding, so
      // by the time we get here the DB already reflects the filled order.
      // We only refresh portfolio here (the order itself is already in state from
      // the POST response). A second full refresh 3s later syncs everything.
      const refreshPortfolio = async () => {
        try {
          const portfolio = await getPortfolio()
          if (portfolio && typeof portfolio === 'object' && !Array.isArray(portfolio)) {
            set({ portfolio: portfolio as Portfolio })
          }
        } catch { /* ignore refresh errors */ }
      }
      await refreshPortfolio()           // immediate — DB is already updated
      setTimeout(async () => {
        try {
          const [portfolio, fetchedOrders] = await Promise.all([getPortfolio(), getOrders()])
          if (portfolio && typeof portfolio === 'object' && !Array.isArray(portfolio)) {
            set({ portfolio: portfolio as Portfolio })
          }
          // Only replace orders list if the server has a non-empty result or we
          // have no orders yet — never wipe a known order with an empty array.
          if (Array.isArray(fetchedOrders)) {
            const current = get().orders
            if (fetchedOrders.length > 0 || current.length === 0) {
              set({ orders: fetchedOrders })
            }
          }
        } catch { /* ignore errors */ }
      }, 3000)
    } catch (err: unknown) {
      // Handle both Axios error shapes and plain Error objects
      const axiosData = (err as { response?: { data?: unknown } })?.response?.data
      let msg = 'Order failed'
      if (axiosData && typeof axiosData === 'object') {
        const d = axiosData as Record<string, unknown>
        msg = (typeof d.error === 'string' ? d.error : undefined)
           ?? (typeof d.message === 'string' ? d.message : undefined)
           ?? 'Order failed'
      } else if (err instanceof Error) {
        msg = err.message
      }
      set({ error: msg })
      throw new Error(msg)
    }
  },

  cancelOrder: async (orderId) => {
    try {
      await cancelOrder(orderId)
      try {
        const orders = await getOrders()
        if (Array.isArray(orders)) set({ orders })
      } catch { /* ignore refresh error */ }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Cancel failed'
      set({ error: msg })
    }
  },

  closePosition: async (symbol) => {
    try {
      await closePositionApi(symbol)
      setTimeout(async () => {
        try {
          const [portfolio, orders] = await Promise.all([getPortfolio(), getOrders()])
          if (portfolio && typeof portfolio === 'object' && !Array.isArray(portfolio)) set({ portfolio })
          if (Array.isArray(orders)) set({ orders })
        } catch { /* ignore refresh errors */ }
      }, 800)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Close position failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  updateTickers: (tickers) => {
    if (!Array.isArray(tickers)) return
    const tickerMap: Record<string, Ticker> = {}
    for (const t of tickers) tickerMap[t.symbol] = t
    set({ tickers: tickerMap })
  },

  updateOrderBook: (orderBook) => {
    // Validate shape before storing — malformed API responses must not reach render
    if (orderBook && Array.isArray(orderBook.asks) && Array.isArray(orderBook.bids)) {
      set({ orderBook })
    }
  },

  updateRecentTrades: (trades) => {
    if (!Array.isArray(trades)) return
    set({ recentTrades: trades.slice(0, 80) })
  },

  addRecentTrade: (trade) => {
    set((s) => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 80) }))
  },

  setLiveCandleHistory: (candles) => {
    if (!Array.isArray(candles) || candles.length === 0) return
    set({ candles, liveCandle: candles[candles.length - 1] ?? null })
  },

  updateLiveCandle: (candle) => {
    set((s) => {
      const existing = s.candles
      if (existing.length === 0) return { liveCandle: candle }
      const last = existing[existing.length - 1]
      if (last.time === candle.time) {
        // Update the last candle in-place
        const updated = [...existing]
        updated[updated.length - 1] = candle
        return { candles: updated, liveCandle: candle }
      } else if (candle.time > last.time) {
        // New candle — append
        return { candles: [...existing, candle], liveCandle: candle }
      }
      return { liveCandle: candle }
    })
  },
}))

