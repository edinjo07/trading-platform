import api from './client'
import { Order, OrderSide, OrderType, TimeInForce } from '../types'

export const getOrders = async (status?: string): Promise<Order[]> => {
  const { data } = await api.get<Order[]>('/orders', { params: status ? { status } : {} })
  return data
}

export interface PlaceOrderParams {
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopPrice?: number
  takeProfit?: number
  stopLoss?: number
  timeInForce?: TimeInForce
  trailingOffset?: number
  notes?: string
  leverage?: number          // default 1 (no leverage)
}

export const placeOrder = async (params: PlaceOrderParams): Promise<Order> => {
  const { data } = await api.post<Order>('/orders', params)
  return data
}

export const cancelOrder = async (orderId: string): Promise<Order> => {
  const { data } = await api.delete<Order>(`/orders/${orderId}`)
  return data
}
