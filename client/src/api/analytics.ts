import api from './client'
import { PerformanceStats, TradeRecord } from '../types'

export const getPerformanceStats = async (): Promise<PerformanceStats> => {
  const { data } = await api.get<PerformanceStats>('/analytics/stats')
  return data
}

export const getTradeJournal = async (limit = 100): Promise<TradeRecord[]> => {
  const { data } = await api.get<TradeRecord[]>('/analytics/trades', { params: { limit } })
  return data
}
