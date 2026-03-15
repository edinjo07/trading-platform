import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTradingStore } from '../../store/tradingStore'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function Layout() {
  const { loadSymbols, loadOrders, loadPortfolio } = useTradingStore()
  useWebSocket()

  useEffect(() => {
    loadSymbols()
    loadOrders()
    loadPortfolio()
  }, [loadSymbols, loadOrders, loadPortfolio])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#06090f', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto" style={{ background: '#06090f' }}>
          <div className="p-4 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

