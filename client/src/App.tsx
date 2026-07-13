import React, { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import ToastContainer from './components/ui/Toast'
import { BrandMark } from './components/ui/BrandMark'

// Eager: the app shell + the two most common entry points. Everything else is
// route-split so a mobile visitor downloads only the screen they're on — the
// 43-page admin CRM never ships to a normal trader.
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'

// ── Public / marketing (lazy) ──
const LandingPage        = lazy(() => import('./pages/LandingPage'))
const TradingPilotPage   = lazy(() => import('./pages/TradingPilotPage'))
const AccountTypesPage   = lazy(() => import('./pages/AccountTypesPage'))
const ScamsPublicPage    = lazy(() => import('./pages/ScamsPublicPage'))

// ── Trader dashboard (lazy) ──
const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const TradingPage        = lazy(() => import('./pages/TradingPage'))
const PortfolioPage      = lazy(() => import('./pages/PortfolioPage'))
const OrdersPage         = lazy(() => import('./pages/OrdersPage'))
const ScannerPage        = lazy(() => import('./pages/ScannerPage'))
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage'))
const ProfilePage        = lazy(() => import('./pages/ProfilePage'))
const LeaderboardPage    = lazy(() => import('./pages/LeaderboardPage'))
const AlertsPage         = lazy(() => import('./pages/AlertsPage'))
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage'))
const BotsPage           = lazy(() => import('./pages/BotsPage'))
const DepositPage        = lazy(() => import('./pages/DepositPage'))
const WithdrawPage       = lazy(() => import('./pages/WithdrawPage'))
const UserKYCPage        = lazy(() => import('./pages/KYCPage'))
const BlogPage           = lazy(() => import('./pages/BlogPage'))
const TradingScamsPage   = lazy(() => import('./pages/TradingScamsPage'))
const EconomicCalendarPage = lazy(() => import('./pages/EconomicCalendarPage'))
const ForexCalculatorsPage = lazy(() => import('./pages/ForexCalculatorsPage'))
const WebTVPage          = lazy(() => import('./pages/WebTVPage'))
const WatchlistsPage     = lazy(() => import('./pages/WatchlistsPage'))

// ── Admin back-office (lazy — its own chunks, never loaded for traders) ──
const AdminLayout          = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboardPage   = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AllTradesPage        = lazy(() => import('./pages/admin/transactions/AllTradesPage'))
const OpenTradesPage       = lazy(() => import('./pages/admin/transactions/OpenTradesPage'))
const ClosedTradesPage     = lazy(() => import('./pages/admin/transactions/ClosedTradesPage'))
const DepositHistoryPage   = lazy(() => import('./pages/admin/transactions/DepositHistoryPage'))
const AutomaticGatewaysPage = lazy(() => import('./pages/admin/transactions/AutomaticGatewaysPage'))
const ExternalPaymentsPage = lazy(() => import('./pages/admin/transactions/ExternalPaymentsPage'))
const ManualGatewaysPage   = lazy(() => import('./pages/admin/transactions/ManualGatewaysPage'))
const PendingWithdrawsPage = lazy(() => import('./pages/admin/transactions/PendingWithdrawsPage'))
const WithdrawHistoryPage  = lazy(() => import('./pages/admin/transactions/WithdrawHistoryPage'))
const WithdrawSettingsPage = lazy(() => import('./pages/admin/transactions/WithdrawSettingsPage'))
const AllCustomersPage     = lazy(() => import('./pages/admin/users/AllCustomersPage'))
const InactiveCustomersPage = lazy(() => import('./pages/admin/users/InactiveCustomersPage'))
const AdminStaffsPage      = lazy(() => import('./pages/admin/users/AdminStaffsPage'))
const ClientsPage          = lazy(() => import('./pages/admin/leads/ClientsPage'))
const SalesPage            = lazy(() => import('./pages/admin/leads/SalesPage'))
const RetentionPage        = lazy(() => import('./pages/admin/leads/RetentionPage'))
const LiveLeadsPage        = lazy(() => import('./pages/admin/leads/LiveLeadsPage'))
const ManualLeadsPage      = lazy(() => import('./pages/admin/leads/ManualLeadsPage'))
const AffiliateLeadsPage   = lazy(() => import('./pages/admin/leads/AffiliateLeadsPage'))
const ArchivedLeadsPage    = lazy(() => import('./pages/admin/leads/ArchivedPage'))
const AllSalesLeadsPage    = lazy(() => import('./pages/admin/leads/AllSalesLeadsPage'))
const ManualSalesLeadsPage = lazy(() => import('./pages/admin/leads/ManualSalesLeadsPage'))
const LiveSalesLeadsPage   = lazy(() => import('./pages/admin/leads/LiveSalesLeadsPage'))
const KYCPage              = lazy(() => import('./pages/admin/leads/KYCPage'))
const SalesStatusesPage    = lazy(() => import('./pages/admin/leads/SalesStatusesPage'))
const PromoCodePage        = lazy(() => import('./pages/admin/leads/PromoCodePage'))
const TeamsPage            = lazy(() => import('./pages/admin/leads/TeamsPage'))
const TradingPairsPage     = lazy(() => import('./pages/admin/trade-management/TradingPairsPage'))
const ForexPage            = lazy(() => import('./pages/admin/trade-management/ForexPage'))
const CommoditiesPage      = lazy(() => import('./pages/admin/trade-management/CommoditiesPage'))
const IndexPage            = lazy(() => import('./pages/admin/trade-management/IndexPage'))
const CryptoPage           = lazy(() => import('./pages/admin/trade-management/CryptoPage'))
const StockPage            = lazy(() => import('./pages/admin/trade-management/StockPage'))
const SpreadSettingsPage   = lazy(() => import('./pages/admin/trade-management/SpreadSettingsPage'))
const LotSettingsPage      = lazy(() => import('./pages/admin/trade-management/LotSettingsPage'))
const APIsPage             = lazy(() => import('./pages/admin/trade-management/APIsPage'))
const PricingPlanPage      = lazy(() => import('./pages/admin/trade-management/PricingPlanPage'))
const SiteSettingsPage     = lazy(() => import('./pages/admin/site-management/SiteSettingsPage'))
const LanguagesSettingsPage = lazy(() => import('./pages/admin/site-management/LanguagesSettingsPage'))
const AdminAnalyticsPage   = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const APIStatusPage        = lazy(() => import('./pages/admin/server-management/APIStatusPage'))
const ServerInfoPage       = lazy(() => import('./pages/admin/server-management/ServerInfoPage'))

/* Branded route-transition fallback — a calm pulse on the espresso ground so
   lazy chunks feel intentional, never like a broken blank screen. */
function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--t-bg)', backgroundImage: 'var(--t-bg-glow)',
    }}>
      <style>{`@keyframes lx-appload { 0%,100%{opacity:.4;transform:scale(0.96)} 50%{opacity:1;transform:scale(1)} }`}</style>
      <div style={{ animation: 'lx-appload 1.3s ease-in-out infinite' }}>
        <BrandMark size={48} />
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuthStore()
  // Still bootstrapping - don't redirect yet
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
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/trading-pilot" element={<TradingPilotPage />} />
        <Route path="/account-types" element={<AccountTypesPage />} />
        <Route path="/trading-scams" element={<ScamsPublicPage />} />

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
          <Route path="watchlists" element={<WatchlistsPage />} />
          <Route path="trade" element={<TradingPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="bots" element={<BotsPage />} />
          <Route path="deposit" element={<DepositPage />} />
          <Route path="withdraw" element={<WithdrawPage />} />
          <Route path="verify" element={<UserKYCPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="trading-scams" element={<TradingScamsPage />} />
          <Route path="economic-calendar" element={<EconomicCalendarPage />} />
          <Route path="forex-calculators" element={<ForexCalculatorsPage />} />
          <Route path="web-tv" element={<WebTVPage />} />
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
      </Suspense>
      <ToastContainer />
    </ErrorBoundary>
  )
}
