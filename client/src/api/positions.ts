import api from './client'
import { Position } from '../types'

export const getPositions = async (userId = 'default'): Promise<Position[]> => {
  const { data } = await api.get<{ success: boolean; data: Position[] }>('/positions', {
    params: { userId },
  })
  return data.data
}

export const closePositionApi = async (symbol: string, userId = 'default'): Promise<string> => {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/positions/${encodeURIComponent(symbol)}`, {
    params: { userId },
  })
  return data.message
}
