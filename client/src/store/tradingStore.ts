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
          // Guard 1: incoming is a plain cold-start default ($100k, no positions,
          // no updatedAt). Reject it if we have any real state — placed orders,
          // open positions, actual cash balance, or a previous DB-confirmed timestamp.
          const incomingIsDefault = !incoming.updatedAt &&
            incoming.cashBalance >= 99_999.99 &&
            (!incoming.positions || incoming.positions.length === 0)
          const currentHasRealData = current.positions.length > 0 ||
            current.cashBalance < 99_999.99 ||
            !!current.updatedAt
          if (incomingIsDefault && currentHasRealData) return

          // Guard 2: server returned unconfirmed data (no updatedAt) but we have
          // a DB-confirmed timestamp — discard cold-start Default.
          if (!incoming.updatedAt && current.updatedAt) return

          // Guard 3: incoming is older than what we already have.
          if (incoming.updatedAt && current.updatedAt) {
            if (incoming.updatedAt < current.updatedAt) return
          }

          // Guard 4: incoming claims no open positions but market value says
          // otherwise (totalEquity > cashBalance), and we already have
          // positions in state. The JSONB positions column was probably not
          // saved/returned; keep current positions to avoid a blank table.
          const incomingHasMissingPositions =
            (!incoming.positions || incoming.positions.length === 0) &&
            incoming.totalEquity > incoming.cashBalance + 0.01
          if (incomingHasMissingPositions && current.positions.length > 0) return
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

      // Add order to list immediately
      set((s) => ({ orders: [order, ...s.orders] }))

      // Optimistically update state from the fill response so the UI is
      // correct immediately without waiting for the server sync.
      // Do NOT stamp a client-side updatedAt — the routine loadPortfolio
      // staleness guard compares against the DB timestamp, and a client
      // timestamp would be newer than the DB's, causing the 1.5s sync to
      // be rejected and positions never appearing.
      if (order.status === 'filled' && order.avgFillPrice != null) {
        const current = get().portfolio
        if (current) {
          const qty  = order.filledQuantity ?? order.quantity
          const cost = order.side === 'buy'
            ? qty * order.avgFillPrice + (order.commission ?? 0)
            : -(qty * order.avgFillPrice - (order.commission ?? 0))
          const newCash = parseFloat((current.cashBalance - cost).toFixed(2))

          // Build updated positions array
          let newPositions = [...current.positions]
          if (order.side === 'buy') {
            const existingIdx = newPositions.findIndex(p => p.symbol === order.symbol && p.side === 'long')
            if (existingIdx >= 0) {
              const pos = newPositions[existingIdx]
              const newQty = pos.quantity + qty
              const newAvgCost = (pos.avgCost * pos.quantity + order.avgFillPrice * qty) / newQty
              newPositions[existingIdx] = { ...pos, quantity: newQty, avgCost: newAvgCost,
                currentPrice: order.avgFillPrice, marketValue: newQty * order.avgFillPrice,
                unrealizedPnl: 0, unrealizedPnlPercent: 0 }
            } else {
              newPositions.push({ symbol: order.symbol, quantity: qty, avgCost: order.avgFillPrice,
                currentPrice: order.avgFillPrice, marketValue: qty * order.avgFillPrice,
                unrealizedPnl: 0, unrealizedPnlPercent: 0, side: 'long', openedAt: new Date().toISOString(),
                leverage: 1, margin: qty * order.avgFillPrice, notionalValue: qty * order.avgFillPrice })
            }
          } else if (order.side === 'sell') {
            const existingIdx = newPositions.findIndex(p => p.symbol === order.symbol && p.side === 'long')
            if (existingIdx >= 0) {
              const pos = newPositions[existingIdx]
              const remaining = pos.quantity - qty
              if (remaining <= 0.000001) newPositions.splice(existingIdx, 1)
              else newPositions[existingIdx] = { ...pos, quantity: remaining,
                marketValue: remaining * order.avgFillPrice }
            }
          }

          const newMarketValue = parseFloat(newPositions.reduce((s, p) => s + p.marketValue, 0).toFixed(2))
          set({
            portfolio: {
              ...current,
              cashBalance:      newCash,
              totalMarketValue: newMarketValue,
              totalEquity:      parseFloat((newCash + newMarketValue).toFixed(2)),
              positions:        newPositions,
              // Stamp client-side updatedAt so loadPortfolio Guards 1 & 2 protect
              // this optimistic state from being overwritten by the cold-start
              // $100k default on subsequent 5s polls (when DB save is slow/failed).
              updatedAt: new Date().toISOString(),
            }
          })
        }
      }

      // Delayed sync: pull authoritative state from server after DB write completes.
      // Accept any response with a DB-confirmed updatedAt (bypass the staleness
      // guard used for routine polling — we know an order just executed).
      // Exception: if the DB returns empty positions but the current store has
      // positions (our optimistic update is more accurate than the DB in this window),
      // keep the current positions and only update financials.
      setTimeout(async () => {
        try {
          const [portfolio, fetchedOrders] = await Promise.all([getPortfolio(), getOrders()])
          if (portfolio && typeof portfolio === 'object' && !Array.isArray(portfolio)) {
            const incoming = portfolio as Portfolio
            // Always accept DB-confirmed data after a known order placement
            if (incoming.updatedAt) {
              const currentPortfolio = get().portfolio
              // If the server doesn't have positions yet (DB write still in-flight or
              // JSONB blob lost) but we have optimistic positions, merge: use DB
              // financials for cash/equity but keep our known positions.
              const serverMissingPositions =
                (!incoming.positions || incoming.positions.length === 0) &&
                (currentPortfolio?.positions ?? []).length > 0
              if (serverMissingPositions && currentPortfolio) {
                set({
                  portfolio: {
                    ...incoming,
                    positions:        currentPortfolio.positions,
                    totalMarketValue: currentPortfolio.totalMarketValue,
                    // Recalculate equity from DB cash + our known market value
                    totalEquity: parseFloat((incoming.cashBalance + currentPortfolio.totalMarketValue).toFixed(2)),
                    unrealizedPnl: currentPortfolio.unrealizedPnl,
                  }
                })
              } else {
                set({ portfolio: incoming })
              }
            }
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
      }, 1500)
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

