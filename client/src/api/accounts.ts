import api from './client'
import type { AccountMode, Currency, AccountType } from '../types'

export interface AccountRow {
  account_number: number
  mode:           AccountMode
  currency:       Currency
  account_type:   AccountType
  cash_balance:   number
}

export const getAccountsList = async (): Promise<AccountRow[]> => {
  const { data } = await api.get<AccountRow[]>('/accounts')
  return data
}

export const createAccountApi = async (params: {
  mode:        AccountMode
  currency:    Currency
  accountType: AccountType
}): Promise<AccountRow> => {
  const { data } = await api.post<AccountRow>('/accounts', params)
  return data
}

export const depositDemo = async (currency: Currency, amount: number): Promise<{ cash_balance: number }> => {
  const { data } = await api.post<{ cash_balance: number }>('/accounts/deposit', { currency, amount })
  return data
}

export const withdrawDemo = async (currency: Currency, amount: number): Promise<{ cash_balance: number }> => {
  const { data } = await api.post<{ cash_balance: number }>('/accounts/withdraw', { currency, amount })
  return data
}
