import api from './client'

export const closePositionApi = async (id: string): Promise<void> => {
  await api.delete(`/positions/${id}`)
}

export const updatePositionSLTP = async (
  id: string,
  takeProfit: number | null,
  stopLoss: number | null
): Promise<void> => {
  await api.patch(`/positions/${id}`, { takeProfit, stopLoss })
}
