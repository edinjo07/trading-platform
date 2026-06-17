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
