import { create } from 'zustand'
import { Ticker, OrderBook, Trade, Order, Portfolio, MarketSymbol, Candle, PerformanceStats, TradeRecord } from '../types'
import { getSymbols, getCandles, getOrderBook, getRecentTrades } from '../api/markets'
import { getOrders, placeOrder, cancelOrder, PlaceOrderParams } from '../api/orders'
import { getPortfolio } from '../api/portfolio'
import { getPerformanceStats, getTradeJournal } from '../api/analytics'
import { closePositionApi } from '../api/positions'

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
      const symbols = await getSymbols()
      set({ symbols })
    } catch {
      set({ error: 'Failed to load symbols' })
    }
  },

  loadCandles: async () => {
    const { selectedSymbol, chartInterval } = get()
    set({ loading: true })
    try {
      const candles = await getCandles(selectedSymbol, chartInterval, 300)
      set({ candles, loading: false })
    } catch {
      set({ error: 'Failed to load candles', loading: false })
    }
  },

  loadOrders: async () => {
    try {
      const orders = await getOrders()
      set({ orders })
    } catch {
      set({ error: 'Failed to load orders' })
    }
  },

  loadPortfolio: async () => {
    try {
      const portfolio = await getPortfolio()
      set({ portfolio })
    } catch {
      set({ error: 'Failed to load portfolio' })
    }
  },

  loadAnalytics: async () => {
    set({ analyticsLoading: true })
    try {
      const [performanceStats, tradeJournal] = await Promise.all([
        getPerformanceStats(),
        getTradeJournal(),
      ])
      set({ performanceStats, tradeJournal, analyticsLoading: false })
    } catch {
      set({ error: 'Failed to load analytics', analyticsLoading: false })
    }
  },

  placeOrder: async (params) => {
    try {
      const order = await placeOrder(params)
      set((s) => ({ orders: [order, ...s.orders] }))
      setTimeout(async () => {
        const portfolio = await getPortfolio()
        const orders = await getOrders()
        set({ portfolio, orders })
      }, 700)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Order failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  cancelOrder: async (orderId) => {
    try {
      await cancelOrder(orderId)
      const orders = await getOrders()
      set({ orders })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Cancel failed'
      set({ error: msg })
    }
  },

  closePosition: async (symbol) => {
    try {
      await closePositionApi(symbol)
      setTimeout(async () => {
        const [portfolio, orders] = await Promise.all([getPortfolio(), getOrders()])
        set({ portfolio, orders })
      }, 800)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Close position failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  updateTickers: (tickers) => {
    const tickerMap: Record<string, Ticker> = {}
    for (const t of tickers) tickerMap[t.symbol] = t
    set({ tickers: tickerMap })
  },

  updateOrderBook: (orderBook) => {
    set({ orderBook })
  },

  updateRecentTrades: (trades) => {
    set({ recentTrades: trades.slice(0, 80) })
  },

  addRecentTrade: (trade) => {
    set((s) => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 80) }))
  },

  setLiveCandleHistory: (candles) => {
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

