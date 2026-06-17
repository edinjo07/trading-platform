import api from './client'
import { PerformanceStats, TradeRecord } from '../types'

export type AnalyticsRange = '7d' | '30d' | 'all'

export const getPerformanceStats = async (range: AnalyticsRange = 'all'): Promise<PerformanceStats> => {
  const { data } = await api.get<PerformanceStats>('/analytics/stats', { params: { range } })
  return data
}

export const getTradeJournal = async (limit = 100): Promise<TradeRecord[]> => {
  const { data } = await api.get<TradeRecord[]>('/analytics/trades', { params: { limit } })
  return data
}

// ── Performance attribution (per-bot / per-strategy / bots-vs-manual) ─────────

export interface BotAttribution {
  id: string; name: string; strategy: string; symbol: string; status: string
  pnl: number; trades: number; wins: number; losses: number; winRate: number
}
export interface StrategyAttribution {
  strategy: string; pnl: number; trades: number; wins: number; botCount: number; winRate: number
}
export interface Attribution {
  bots:       BotAttribution[]
  byStrategy: StrategyAttribution[]
  totals: {
    botPnl: number; botTrades: number
    manualPnl: number; manualTrades: number
    totalPnl: number; totalTrades: number
  }
}

export const getAttribution = async (): Promise<Attribution> => {
  const { data } = await api.get<Attribution>('/analytics/attribution')
  return data
}
