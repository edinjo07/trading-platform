import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#06090f', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <AdminSidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header
          className="flex items-center justify-between px-6 shrink-0"
          style={{
            height: '56px',
            background: '#080d18',
            borderBottom: '1px solid rgba(56,189,248,0.07)',
          }}
        >
          {/* Breadcrumb / page indicator */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="text-brand-400 font-semibold">Admin</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span id="admin-page-title" className="text-text-primary font-medium">Dashboard</span>
          </div>

          {/* Right side header actions */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
              <span className="text-2xs text-text-secondary font-mono" style={{ fontSize: '10px' }}>LIVE</span>
            </div>

            {/* Back to App button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to App
            </button>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: '#ff3047' }}
              />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ background: '#06090f' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
