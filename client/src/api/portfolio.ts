import api from './client'
import { Portfolio } from '../types'

export const getPortfolio = async (): Promise<Portfolio> => {
  const { data } = await api.get<Portfolio>('/portfolio')
  return data
}
