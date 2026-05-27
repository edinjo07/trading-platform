import api from './client'
import type { AccountMode, Currency } from '../types'

export interface AccountRow {
  mode:         AccountMode
  currency:     Currency
  cash_balance: number
}

export const getAccountsList = async (): Promise<AccountRow[]> => {
  const { data } = await api.get<AccountRow[]>('/accounts')
  return data
}
