import api from './client'
import { Order, OrderSide } from '../types'

export interface PlaceOrderParams {
  symbol:          string
  side:            OrderSide
  quantity:        number
  leverage?:       number
  takeProfit?:     number
  stopLoss?:       number
  type?:           string
  price?:          number
  stopPrice?:      number
  trailingOffset?: number
}

export interface PlaceOrderResult {
  id:         string
  symbol:     string
  side:       OrderSide
  quantity:   number
  fillPrice:  number
  leverage:   number
  margin:     number
  commission: number
  totalCost:  number
  takeProfit: number | undefined
  stopLoss:   number | undefined
  createdAt:  string
}

export interface LimitOrderParams {
  symbol:      string
  side:        OrderSide
  quantity:    number
  limitPrice:  number
  leverage?:   number
  takeProfit?: number
  stopLoss?:   number
}

export interface PendingLimitOrder {
  id:          string
  userId:      string
  mode:        string
  symbol:      string
  side:        OrderSide
  quantity:    number
  limitPrice:  number
  condition:   'lte' | 'gte'
  leverage:    number
  takeProfit?: number
  stopLoss?:   number
  createdAt:   string
}

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

export const placeOrder = async (params: PlaceOrderParams): Promise<PlaceOrderResult> => {
  const { data } = await api.post<PlaceOrderResult>('/orders', params)
  return data
}

export const placeLimitOrderApi = async (
  params: LimitOrderParams
): Promise<{ id: string; limitPrice: number; condition: 'lte' | 'gte' }> => {
  const { data } = await api.post('/orders', { ...params, type: 'limit' })
  return data
}

export const cancelLimitOrderApi = async (id: string): Promise<void> => {
  await api.delete(`/orders/${id}`)
}

export const getPendingLimitOrdersApi = async (): Promise<PendingLimitOrder[]> => {
  const { data } = await api.get<PendingLimitOrder[]>('/orders/pending')
  return data
}
