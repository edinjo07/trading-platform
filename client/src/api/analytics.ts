import api from './client'
import { PerformanceStats, TradeRecord } from '../types'

export const getPerformanceStats = async (userId = 'default'): Promise<PerformanceStats> => {
  const { data } = await api.get<{ success: boolean; data: PerformanceStats }>('/analytics', {
    params: { userId },
  })
  return data.data
}

export const getTradeJournal = async (userId = 'default', limit = 100): Promise<TradeRecord[]> => {
  const { data } = await api.get<{ success: boolean; data: TradeRecord[]; total: number }>(
    '/analytics/trades',
    { params: { userId, limit } }
  )
  return data.data
}
