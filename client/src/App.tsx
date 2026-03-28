import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TradingPage from './pages/TradingPage'
import PortfolioPage from './pages/PortfolioPage'
import OrdersPage from './pages/OrdersPage'
import ScannerPage from './pages/ScannerPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ToastContainer from './components/ui/Toast'
import ProfilePage from './pages/ProfilePage'
import LandingPage from './pages/LandingPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AlertsPage from './pages/AlertsPage'
import BotsPage from './pages/BotsPage'
import DepositPage from './pages/DepositPage'
import WithdrawPage from './pages/WithdrawPage'
import UserKYCPage from './pages/KYCPage'
import TradingPilotPage from './pages/TradingPilotPage'

// Admin
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
// Transactions
import AllTradesPage from './pages/admin/transactions/AllTradesPage'
import OpenTradesPage from './pages/admin/transactions/OpenTradesPage'
import ClosedTradesPage from './pages/admin/transactions/ClosedTradesPage'
import DepositHistoryPage from './pages/admin/transactions/DepositHistoryPage'
import AutomaticGatewaysPage from './pages/admin/transactions/AutomaticGatewaysPage'
import ExternalPaymentsPage from './pages/admin/transactions/ExternalPaymentsPage'
import ManualGatewaysPage from './pages/admin/transactions/ManualGatewaysPage'
import PendingWithdrawsPage from './pages/admin/transactions/PendingWithdrawsPage'
import WithdrawHistoryPage from './pages/admin/transactions/WithdrawHistoryPage'
import WithdrawSettingsPage from './pages/admin/transactions/WithdrawSettingsPage'
// User Management
import AllCustomersPage from './pages/admin/users/AllCustomersPage'
import InactiveCustomersPage from './pages/admin/users/InactiveCustomersPage'
import AdminStaffsPage from './pages/admin/users/AdminStaffsPage'
// Leads Management
import ClientsPage from './pages/admin/leads/ClientsPage'
import SalesPage from './pages/admin/leads/SalesPage'
import RetentionPage from './pages/admin/leads/RetentionPage'
import LiveLeadsPage from './pages/admin/leads/LiveLeadsPage'
import ManualLeadsPage from './pages/admin/leads/ManualLeadsPage'
import AffiliateLeadsPage from './pages/admin/leads/AffiliateLeadsPage'
import ArchivedLeadsPage from './pages/admin/leads/ArchivedPage'
import AllSalesLeadsPage from './pages/admin/leads/AllSalesLeadsPage'
import ManualSalesLeadsPage from './pages/admin/leads/ManualSalesLeadsPage'
import LiveSalesLeadsPage from './pages/admin/leads/LiveSalesLeadsPage'
import KYCPage from './pages/admin/leads/KYCPage'
import SalesStatusesPage from './pages/admin/leads/SalesStatusesPage'
import PromoCodePage from './pages/admin/leads/PromoCodePage'
import TeamsPage from './pages/admin/leads/TeamsPage'
// Trade Management
import TradingPairsPage from './pages/admin/trade-management/TradingPairsPage'
import ForexPage from './pages/admin/trade-management/ForexPage'
import CommoditiesPage from './pages/admin/trade-management/CommoditiesPage'
import IndexPage from './pages/admin/trade-management/IndexPage'
import CryptoPage from './pages/admin/trade-management/CryptoPage'
import StockPage from './pages/admin/trade-management/StockPage'
import SpreadSettingsPage from './pages/admin/trade-management/SpreadSettingsPage'
import LotSettingsPage from './pages/admin/trade-management/LotSettingsPage'
import APIsPage from './pages/admin/trade-management/APIsPage'
import PricingPlanPage from './pages/admin/trade-management/PricingPlanPage'
// Site Management
import SiteSettingsPage from './pages/admin/site-management/SiteSettingsPage'
import LanguagesSettingsPage from './pages/admin/site-management/LanguagesSettingsPage'
// Analytics
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
// Server Management
import APIStatusPage from './pages/admin/server-management/APIStatusPage'
import ServerInfoPage from './pages/admin/server-management/ServerInfoPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuthStore()
  // Still bootstrapping — don't redirect yet
  if (loading) return null
  if (!token && !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { loadUser, token } = useAuthStore()

  useEffect(() => {
    if (token) loadUser()
  }, [token, loadUser])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/trading-pilot" element={<TradingPilotPage />} />

        {/* Main App */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="trade" element={<TradingPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="bots" element={<BotsPage />} />
          <Route path="deposit" element={<DepositPage />} />
          <Route path="withdraw" element={<WithdrawPage />} />
          <Route path="verify" element={<UserKYCPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Panel */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />

          {/* Transactions */}
          <Route path="transactions/all" element={<AllTradesPage />} />
          <Route path="transactions/open" element={<OpenTradesPage />} />
          <Route path="transactions/closed" element={<ClosedTradesPage />} />
          <Route path="transactions/deposits" element={<DepositHistoryPage />} />
          <Route path="transactions/auto-gateways" element={<AutomaticGatewaysPage />} />
          <Route path="transactions/external" element={<ExternalPaymentsPage />} />
          <Route path="transactions/manual-gateways" element={<ManualGatewaysPage />} />
          <Route path="transactions/pending-withdraws" element={<PendingWithdrawsPage />} />
          <Route path="transactions/withdraw-history" element={<WithdrawHistoryPage />} />
          <Route path="transactions/withdraw-settings" element={<WithdrawSettingsPage />} />

          {/* User Management */}
          <Route path="users/all" element={<AllCustomersPage />} />
          <Route path="users/inactive" element={<InactiveCustomersPage />} />
          <Route path="users/staff" element={<AdminStaffsPage />} />

          {/* Leads Management */}
          <Route path="leads/clients" element={<ClientsPage />} />
          <Route path="leads/sales" element={<SalesPage />} />
          <Route path="leads/retention" element={<RetentionPage />} />
          <Route path="leads/live" element={<LiveLeadsPage />} />
          <Route path="leads/manual" element={<ManualLeadsPage />} />
          <Route path="leads/affiliate" element={<AffiliateLeadsPage />} />
          <Route path="leads/archived" element={<ArchivedLeadsPage />} />
          <Route path="leads/all-sales" element={<AllSalesLeadsPage />} />
          <Route path="leads/manual-sales" element={<ManualSalesLeadsPage />} />
          <Route path="leads/live-sales" element={<LiveSalesLeadsPage />} />
          <Route path="leads/kyc" element={<KYCPage />} />
          <Route path="leads/statuses" element={<SalesStatusesPage />} />
          <Route path="leads/promo" element={<PromoCodePage />} />
          <Route path="leads/teams" element={<TeamsPage />} />

          {/* Trade Management */}
          <Route path="trade/pairs" element={<TradingPairsPage />} />
          <Route path="trade/forex" element={<ForexPage />} />
          <Route path="trade/commodities" element={<CommoditiesPage />} />
          <Route path="trade/index" element={<IndexPage />} />
          <Route path="trade/crypto" element={<CryptoPage />} />
          <Route path="trade/stock" element={<StockPage />} />
          <Route path="trade/spread-settings" element={<SpreadSettingsPage />} />
          <Route path="trade/lot-settings" element={<LotSettingsPage />} />
          <Route path="trade/apis" element={<APIsPage />} />
          <Route path="trade/pricing" element={<PricingPlanPage />} />

          {/* Site Management */}
          <Route path="site/settings" element={<SiteSettingsPage />} />
          <Route path="site/languages" element={<LanguagesSettingsPage />} />

          {/* Analytics */}
          <Route path="analytics" element={<AdminAnalyticsPage />} />

          {/* Server Management */}
          <Route path="server/api-status" element={<APIStatusPage />} />
          <Route path="server/info" element={<ServerInfoPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </ErrorBoundary>
  )
}
