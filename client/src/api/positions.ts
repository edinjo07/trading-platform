import api from './client'
import { Position } from '../types'

export const getPositions = async (): Promise<Position[]> => {
  const { data } = await api.get<{ success: boolean; data: Position[] }>('/positions')
  return data.data
}

export const closePositionApi = async (symbol: string): Promise<string> => {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/positions/${encodeURIComponent(symbol)}`)
  return data.message
}
