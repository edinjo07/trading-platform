import api from './client'

export type BotStrategy = 'ma_crossover' | 'rsi' | 'macd' | 'momentum'
export type BotStatus   = 'idle' | 'warming_up' | 'running' | 'paused' | 'stopped' | 'error'
export type BotPosition = 'long' | 'none'
export type LogLevel    = 'info' | 'signal' | 'trade' | 'risk' | 'warn' | 'error'
export type Signal      = 'buy' | 'sell' | 'hold'

export interface BotParams {
  // MA Crossover
  fastPeriod?:       number
  slowPeriod?:       number
  // RSI
  rsiPeriod?:        number
  rsiOverbought?:    number
  rsiOversold?:      number
  // MACD
  macdFast?:         number
  macdSlow?:         number
  macdSignal?:       number
  // Momentum
  lookbackPeriod?:   number
  // Core
  tradeSize:         number
  // Risk management
  stopLossPercent?:    number
  takeProfitPercent?:  number
  maxDailyLoss?:       number
  maxDailyTrades?:     number
  confirmBars?:        number
  // News & sentiment filter
  useNewsFilter?:      boolean
  newsWeight?:         number
}

export interface BotEquityPoint {
  ts:  number
  pnl: number
}

export interface BotLog {
  ts:      string
  level:   LogLevel
  message: string
}

export interface Bot {
  id:          string
  userId:      string
  name:        string
  symbol:      string
  strategy:    BotStrategy
  params:      BotParams
  status:      BotStatus
  position:    BotPosition
  createdAt:   string
  startedAt?:  string
  stoppedAt?:  string
  // Core stats
  trades:      number
  wins:        number
  losses:      number
  pnl:         number
  peakPnl:     number
  maxDrawdown: number
  // Equity curve
  equityCurve: BotEquityPoint[]
  // Daily risk tracking
  dailyTrades:     number
  dailyLoss:       number
  dailyResetDate:  string
  // Warmup
  warmupBarsNeeded:  number
  warmupBarsCurrent: number
  // Active position context
  currentEntryPrice?: number
  currentSL?:         number
  currentTP?:         number
  // Risk acceptance
  riskAccepted?:      boolean
  riskAcceptedAt?:    string
  // Internal (stripped server-side, always [] on client)
  logs:        BotLog[]
  priceBuffer: number[]
}

// ── News / Sentiment ─────────────────────────────────────────────────────────

export interface NewsItem {
  title:       string
  source:      string
  url:         string
  publishedAt: string
  sentiment:   number
  label:       'bullish' | 'bearish' | 'neutral'
}

export interface SymbolSentiment {
  symbol:      string
  score:       number
  label:       'bullish' | 'bearish' | 'neutral'
  headlines:   NewsItem[]
  fetchedAt:   string
  source:      string
}

export interface CreateBotPayload {
  name:     string
  symbol:   string
  strategy: BotStrategy
  params:   BotParams
}

export const getBots    = ()                     => api.get<Bot[]>('/bots').then(r => r.data)
export const getBotById = (id: string)           => api.get<Bot>(`/bots/${id}`).then(r => r.data)
export const createBot  = (p: CreateBotPayload)  => api.post<Bot>('/bots', p).then(r => r.data)
export const startBot   = (id: string)           => api.post<Bot>(`/bots/${id}/start`).then(r => r.data)
export const stopBot    = (id: string)           => api.post<Bot>(`/bots/${id}/stop`).then(r => r.data)
export const deleteBot  = (id: string)           => api.delete(`/bots/${id}`).then(r => r.data)

export const getNewsSentiment = (symbol: string): Promise<SymbolSentiment> =>
  api.get<SymbolSentiment>(`/news/sentiment/${encodeURIComponent(symbol)}`).then(r => r.data)

