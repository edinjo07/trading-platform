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

// ── Superadmin back-office (lazy; email-allowlist gated inside AdminLayout) ──
const AdminLayout        = lazy(() => import('./components/admin/AdminLayout'))
const AdminOverviewPage  = lazy(() => import('./pages/admin/OverviewPage'))
const AdminUsersPage     = lazy(() => import('./pages/admin/UsersPage'))
const AdminTransactionsPage = lazy(() => import('./pages/admin/TransactionsPage'))
const AdminKYCPage       = lazy(() => import('./pages/admin/KYCPage'))

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

        {/* Superadmin — email-allowlist gated inside AdminLayout */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="kyc" element={<AdminKYCPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
      <ToastContainer />
    </ErrorBoundary>
  )
}
