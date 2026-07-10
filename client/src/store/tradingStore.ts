import { create } from 'zustand'
import {
  Ticker, OrderBook, Trade, Order, Portfolio, Position,
  MarketSymbol, Candle, PerformanceStats, TradeRecord,
} from '../types'
import { useAlertsStore, PriceAlert } from './alertsStore'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'
import { formatPrice } from '../utils/formatters'

// Surface a toast (and browser notification, if permitted) when a price alert fires.
function notifyTriggeredAlerts(triggered: PriceAlert[]) {
  if (!triggered.length) return
  const { addToast } = useToastStore.getState()
  for (const a of triggered) {
    const dir = a.condition === 'above' ? 'rose above' : 'fell below'
    addToast({
      variant: 'success',
      title: `${a.symbol} alert triggered`,
      message: `Price ${dir} ${formatPrice(a.targetPrice, a.symbol)}${a.note ? ` · ${a.note}` : ''}`,
      duration: 8000,
    })
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${a.symbol} alert triggered`, { body: `Price ${dir} ${a.targetPrice}` })
      }
    } catch { /* ignore */ }
  }
}
import { getSymbols, getCandles, getOrderBook, getRecentTrades } from '../api/markets'
import {
  getOrders, placeOrder, PlaceOrderParams, PlaceOrderResult,
  placeLimitOrderApi, cancelLimitOrderApi, getPendingLimitOrdersApi,
  LimitOrderParams, PendingLimitOrder,
} from '../api/orders'
import { getPortfolio } from '../api/portfolio'
import { getPerformanceStats, getTradeJournal } from '../api/analytics'
import { closePositionApi, updatePositionSLTP } from '../api/positions'
import { generateMockCandles, generateMockSymbols } from '../utils/mockCandles'

interface TradingState {
  // Symbols
  symbols:        MarketSymbol[]
  selectedSymbol: string
  // Market data
  tickers:      Record<string, Ticker>
  candles:      Candle[]
  liveCandle:   Candle | null
  orderBook:    OrderBook | null
  recentTrades: Trade[]
  // Trading state
  orders:              Order[]
  portfolio:           Portfolio | null
  pendingLimitOrders:  PendingLimitOrder[]
  // Analytics
  performanceStats: PerformanceStats | null
  tradeJournal:     TradeRecord[]
  analyticsLoading: boolean
  // UI
  chartInterval: string
  loading:       boolean
  error:         string | null

  // Actions
  setSelectedSymbol: (symbol: string) => void
  setChartInterval:  (interval: string) => void
  loadSymbols:       () => Promise<void>
  loadCandles:       () => Promise<void>
  loadOrders:              () => Promise<void>
  loadPortfolio:           () => Promise<void>
  loadAnalytics:           (silent?: boolean, range?: '7d' | '30d' | 'all') => Promise<void>
  loadPendingLimitOrders:  () => Promise<void>
  placeOrder:              (params: PlaceOrderParams) => Promise<PlaceOrderResult>
  placeLimitOrder:         (params: LimitOrderParams) => Promise<PendingLimitOrder>
  removeLimitOrder:        (id: string) => Promise<void>
  closePosition:           (id: string) => Promise<void>
  updatePositionSltp:      (id: string, takeProfit: number | null, stopLoss: number | null) => Promise<void>
  // WebSocket updates
  updateTickers:       (tickers: Ticker[]) => void
  updateOrderBook:     (ob: OrderBook) => void
  updateRecentTrades:  (trades: Trade[]) => void
  addRecentTrade:      (trade: Trade) => void
  setLiveCandleHistory: (candles: Candle[]) => void
  updateLiveCandle:    (candle: Candle) => void
}

export const useTradingStore = create<TradingState>((set, get) => ({
  symbols:          [],
  selectedSymbol:   'BTCUSD',
  tickers:          {},
  candles:          [],
  liveCandle:       null,
  orderBook:        null,
  recentTrades:     [],
  orders:              [],
  portfolio:           null,
  pendingLimitOrders:  [],
  performanceStats: null,
  tradeJournal:     [],
  analyticsLoading: false,
  chartInterval:    '1h',
  loading:          false,
  error:            null,

  setSelectedSymbol: (symbol) => {
    set({ selectedSymbol: symbol, candles: [], liveCandle: null, orderBook: null, recentTrades: [] })
  },

  setChartInterval: (interval) => set({ chartInterval: interval }),

  loadSymbols: async () => {
    const local = generateMockSymbols()
    try {
      const result = await getSymbols()
      set({ symbols: Array.isArray(result) && result.length >= local.length ? result : local })
    } catch {
      set({ symbols: local })
    }
  },

  loadCandles: async () => {
    const { selectedSymbol, chartInterval } = get()
    set({ loading: true })
    try {
      const result = await getCandles(selectedSymbol, chartInterval, 300)
      set({
        candles: Array.isArray(result) && result.length > 0
          ? result
          : generateMockCandles(selectedSymbol, chartInterval, 300),
        loading: false,
      })
    } catch {
      set({ candles: generateMockCandles(selectedSymbol, chartInterval, 300), loading: false })
    }
  },

  loadOrders: async () => {
    try {
      const result = await getOrders()
      if (Array.isArray(result)) set({ orders: result })
    } catch { /* keep existing state on network error */ }
  },

  loadPortfolio: async () => {
    try {
      const result = await getPortfolio()
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        set({ portfolio: result as Portfolio })
      }
    } catch { /* keep existing state on network error */ }
  },

  loadAnalytics: async (silent = false, range = 'all') => {
    if (!silent) set({ analyticsLoading: true })
    try {
      const [stats, journal] = await Promise.all([getPerformanceStats(range), getTradeJournal()])
      set({
        performanceStats: stats && typeof stats === 'object' ? stats : null,
        tradeJournal:     Array.isArray(journal) ? journal : [],
        analyticsLoading: false,
      })
    } catch {
      set({ analyticsLoading: false })
    }
  },

  placeOrder: async (params) => {
    try {
      const result = await placeOrder(params)

      // Optimistic update: immediately reflect the new position + deducted cash
      const current = get().portfolio
      if (current) {
        const positionSide = params.side === 'buy' ? 'long' : 'short'
        const existingIdx  = current.positions.findIndex(
          p => p.symbol === result.symbol && p.side === positionSide
        )

        let newPositions: Position[]
        if (existingIdx >= 0) {
          const existing  = current.positions[existingIdx]
          const newQty    = existing.quantity + result.quantity
          const newAvgPx  = (existing.avg_price * existing.quantity + result.fillPrice * result.quantity) / newQty
          const newMargin = existing.margin + result.margin
          newPositions = [...current.positions]
          newPositions[existingIdx] = {
            ...existing,
            quantity:    newQty,
            avg_price:   newAvgPx,
            margin:      newMargin,
            currentPrice: result.fillPrice,
            unrealizedPnl: 0,
            unrealizedPnlPct: 0,
            notionalValue: newQty * result.fillPrice,
          }
        } else {
          const now = new Date().toISOString()
          const newPos: Position = {
            id:          result.id,
            user_id:     '',
            mode:        'demo',
            symbol:      result.symbol,
            side:        positionSide,
            quantity:    result.quantity,
            avg_price:   result.fillPrice,
            leverage:    result.leverage,
            margin:      result.margin,
            take_profit: result.takeProfit ?? null,
            stop_loss:   result.stopLoss   ?? null,
            opened_at:   now,
            updated_at:  now,
            currentPrice:     result.fillPrice,
            unrealizedPnl:    0,
            unrealizedPnlPct: 0,
            notionalValue:    result.quantity * result.fillPrice,
            liquidationPrice: positionSide === 'long'
              ? result.fillPrice * (1 - 0.9 / result.leverage)
              : result.fillPrice * (1 + 0.9 / result.leverage),
          }
          newPositions = [...current.positions, newPos]
        }

        const newCash        = parseFloat((current.cashBalance - result.totalCost).toFixed(2))
        const newTotalMargin = parseFloat((current.totalMargin + result.margin).toFixed(2))
        const newEquity      = parseFloat((newCash + newTotalMargin + current.unrealizedPnl).toFixed(2))

        set({
          portfolio: {
            ...current,
            cashBalance:   newCash,
            totalMargin:   newTotalMargin,
            totalEquity:   newEquity,
            positions:     newPositions,
          },
        })
      }

      // Sync authoritative state after DB write settles
      setTimeout(async () => {
        try {
          const [portfolio, orders] = await Promise.all([getPortfolio(), getOrders()])
          if (portfolio) set({ portfolio: portfolio as Portfolio })
          if (Array.isArray(orders)) set({ orders })
        } catch { /* ignore */ }
      }, 1_500)

      return result
    } catch (err: unknown) {
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

  loadPendingLimitOrders: async () => {
    try {
      const result = await getPendingLimitOrdersApi()
      if (Array.isArray(result)) set({ pendingLimitOrders: result })
    } catch { /* server may not yet have deployed — ignore 404 */ }
  },

  placeLimitOrder: async (params) => {
    try {
      const result = await placeLimitOrderApi(params)
      // Add to local pending list immediately
      set((s) => ({
        pendingLimitOrders: [
          ...s.pendingLimitOrders,
          {
            id:          result.id,
            userId:      '',
            mode:        'demo',
            symbol:      params.symbol,
            side:        params.side,
            quantity:    params.quantity,
            limitPrice:  result.limitPrice,
            condition:   result.condition,
            leverage:    params.leverage ?? 1,
            takeProfit:  params.takeProfit,
            stopLoss:    params.stopLoss,
            createdAt:   new Date().toISOString(),
          } as PendingLimitOrder,
        ],
      }))
      return result as unknown as PendingLimitOrder
    } catch (err: unknown) {
      const axiosData = (err as { response?: { data?: unknown } })?.response?.data
      let msg = 'Limit order failed'
      if (axiosData && typeof axiosData === 'object') {
        const d = axiosData as Record<string, unknown>
        msg = (typeof d.error === 'string' ? d.error : undefined) ?? msg
      } else if (err instanceof Error) {
        msg = err.message
      }
      throw new Error(msg)
    }
  },

  removeLimitOrder: async (id) => {
    // Optimistic: remove immediately
    set((s) => ({ pendingLimitOrders: s.pendingLimitOrders.filter(o => o.id !== id) }))
    try {
      await cancelLimitOrderApi(id)
    } catch { /* already removed from local list; server may have already executed it */ }
  },

  updatePositionSltp: async (id, takeProfit, stopLoss) => {
    try {
      await updatePositionSLTP(id, takeProfit, stopLoss)
      const current = get().portfolio
      if (current) {
        const newPositions = current.positions.map(p =>
          p.id === id ? { ...p, take_profit: takeProfit, stop_loss: stopLoss } : p
        )
        set({ portfolio: { ...current, positions: newPositions } })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Update failed'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  closePosition: async (id) => {
    // Optimistic: remove position immediately
    const current = get().portfolio
    if (current) {
      const closing     = current.positions.find(p => p.id === id)
      const newPositions = current.positions.filter(p => p.id !== id)
      const releasedMargin = closing?.margin ?? 0
      const releasedPnl    = closing?.unrealizedPnl ?? 0
      const newCash        = parseFloat((current.cashBalance + releasedMargin + releasedPnl).toFixed(2))
      const newTotalMargin = parseFloat((current.totalMargin - releasedMargin).toFixed(2))
      const newUnrealizedPnl = parseFloat(newPositions.reduce((s, p) => s + p.unrealizedPnl, 0).toFixed(2))

      set({
        portfolio: {
          ...current,
          cashBalance:   newCash,
          totalMargin:   newTotalMargin,
          totalEquity:   parseFloat((newCash + newTotalMargin + newUnrealizedPnl).toFixed(2)),
          unrealizedPnl: newUnrealizedPnl,
          positions:     newPositions,
        },
      })
    }

    try {
      await closePositionApi(id)
    } catch (err: unknown) {
      // Revert on failure
      if (current) set({ portfolio: current })
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Close failed'
      set({ error: msg })
      throw new Error(msg)
    }

    // Sync authoritative state
    setTimeout(async () => {
      try {
        const [portfolio, orders] = await Promise.all([getPortfolio(), getOrders()])
        if (portfolio) set({ portfolio: portfolio as Portfolio })
        if (Array.isArray(orders)) set({ orders })
      } catch { /* ignore */ }
    }, 800)
  },

  // ── WebSocket handlers ────────────────────────────────────────────────────────

  updateTickers: (tickers) => {
    if (!Array.isArray(tickers)) return
    const tickerMap: Record<string, Ticker> = {}
    for (const t of tickers) tickerMap[t.symbol] = t

    // FX rate for converting USD P&L into account local currency
    const currency = useAuthStore.getState().user?.currency ?? 'USD'
    const fxRate   = currency === 'EUR' ? (tickerMap['EURUSD']?.price ?? 1)
                   : currency === 'GBP' ? (tickerMap['GBPUSD']?.price ?? 1)
                   : 1

    const portfolio = get().portfolio
    if (portfolio && portfolio.positions.length > 0) {
      let totalUnrealizedPnl = 0
      let totalMargin        = 0

      const updatedPositions = portfolio.positions.map((pos) => {
        const ticker = tickerMap[pos.symbol]
        const markPrice = ticker?.price ?? pos.currentPrice

        // rawPnlUsd is in USD; convert to account local currency
        const rawPnlUsd = pos.side === 'long'
          ? (markPrice - pos.avg_price) * pos.quantity
          : (pos.avg_price - markPrice) * pos.quantity
        const unrealizedPnl    = parseFloat((rawPnlUsd / fxRate).toFixed(2))
        const unrealizedPnlPct = pos.margin > 0
          ? parseFloat(((unrealizedPnl / pos.margin) * 100).toFixed(2))
          : 0

        totalUnrealizedPnl += unrealizedPnl
        totalMargin        += pos.margin

        // notionalValue in local currency
        return {
          ...pos,
          currentPrice:     markPrice,
          unrealizedPnl,
          unrealizedPnlPct,
          notionalValue: parseFloat((pos.quantity * markPrice / fxRate).toFixed(2)),
        }
      })

      const totalEquity = parseFloat(
        (portfolio.cashBalance + totalMargin + totalUnrealizedPnl).toFixed(2)
      )

      set({
        tickers: tickerMap,
        portfolio: {
          ...portfolio,
          positions:     updatedPositions,
          unrealizedPnl: parseFloat(totalUnrealizedPnl.toFixed(2)),
          totalMargin:   parseFloat(totalMargin.toFixed(2)),
          totalEquity,
        },
      })
      notifyTriggeredAlerts(useAlertsStore.getState().checkAlerts(tickerMap))
      return
    }

    set({ tickers: tickerMap })
    notifyTriggeredAlerts(useAlertsStore.getState().checkAlerts(tickerMap))
  },

  updateOrderBook: (ob) => {
    if (ob && Array.isArray(ob.asks) && Array.isArray(ob.bids)) set({ orderBook: ob })
  },

  updateRecentTrades: (trades) => {
    if (Array.isArray(trades)) set({ recentTrades: trades.slice(0, 80) })
  },

  addRecentTrade: (trade) => {
    set((s) => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 80) }))
  },

  setLiveCandleHistory: (candles) => {
    if (Array.isArray(candles) && candles.length > 0) {
      set({ candles, liveCandle: candles[candles.length - 1] ?? null })
    }
  },

  updateLiveCandle: (candle) => {
    set((s) => {
      const existing = s.candles
      if (existing.length === 0) return { liveCandle: candle }
      const last = existing[existing.length - 1]
      if (last.time === candle.time) {
        const updated = [...existing]
        updated[updated.length - 1] = candle
        return { candles: updated, liveCandle: candle }
      }
      if (candle.time > last.time) {
        return { candles: [...existing, candle], liveCandle: candle }
      }
      return { liveCandle: candle }
    })
  },
}))
