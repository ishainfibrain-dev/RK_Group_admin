import { Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle, ShieldX } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from './app/AuthProvider'
import { AdminLayout } from './app/AdminLayout'
import { Button } from './components/ui'
import { authApi } from './services/api'
import { LoginPage } from './features/auth/LoginPage'
import { RecoveryPage } from './features/auth/RecoveryPage'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const UsersPage = lazy(() => import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const RolesPage = lazy(() => import('./features/roles/RolesPage').then((m) => ({ default: m.RolesPage })))
const ProjectsPage = lazy(() => import('./features/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const CustomersPage = lazy(() => import('./features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const BookingsPage = lazy(() => import('./features/bookings/BookingsPage').then((m) => ({ default: m.BookingsPage })))
const BookingDetailsPage = lazy(() => import('./features/bookings/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage })))
const CollectionsPage = lazy(() => import('./features/payments/CollectionsPage').then((m) => ({ default: m.CollectionsPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const RoutingPage = lazy(() => import('./features/routing/RoutingPage').then((m) => ({ default: m.RoutingPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const AuditPage = lazy(() => import('./features/audit/AuditPage').then((m) => ({ default: m.AuditPage })))

function Protected({ permission, children }: { permission: string; children: ReactNode }) {
  const { session, profile, loading, error, has } = useAuth()
  if (loading) return <div className="full-loader"><LoaderCircle className="spin" /><span>Loading RK Group Admin…</span></div>
  if (!session) return <Navigate to="/login" replace />
  if (error || !profile?.is_active || !has(permission)) return <div className="access-denied"><ShieldX /><h1>Access denied</h1><p>{error || 'Your account does not have permission to access this workspace.'}</p><Button onClick={() => void authApi.signOut()}>Return to sign in</Button></div>
  return <AdminLayout><Suspense fallback={<div className="loading"><LoaderCircle className="spin" /> Loading module…</div>}>{children}</Suspense></AdminLayout>
}

const protectedRoute = (permission: string, element: ReactNode) => <Protected permission={permission}>{element}</Protected>

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/recover" element={<RecoveryPage />} />
    <Route path="/" element={protectedRoute('dashboard.view', <DashboardPage />)} />
    <Route path="/users" element={protectedRoute('users.view', <UsersPage />)} />
    <Route path="/roles" element={protectedRoute('roles.view', <RolesPage />)} />
    <Route path="/projects" element={protectedRoute('projects.view', <ProjectsPage />)} />
    <Route path="/projects/:projectId" element={protectedRoute('projects.view', <InventoryPage />)} />
    <Route path="/inventory" element={protectedRoute('inventory.view', <InventoryPage />)} />
    <Route path="/inventory/:projectId" element={protectedRoute('inventory.view', <InventoryPage />)} />
    <Route path="/customers" element={protectedRoute('customers.view', <CustomersPage />)} />
    <Route path="/customers/:customerId" element={protectedRoute('customers.view', <CustomersPage />)} />
    <Route path="/bookings" element={protectedRoute('bookings.view', <BookingsPage />)} />
    <Route path="/bookings/:bookingId" element={protectedRoute('projects.view', <BookingDetailsPage />)} />
    <Route path="/collections" element={protectedRoute('payments.view', <CollectionsPage />)} />
    <Route path="/reports" element={protectedRoute('reports.view', <ReportsPage />)} />
    <Route path="/routing" element={protectedRoute('routing.view', <RoutingPage />)} />
    <Route path="/settings" element={protectedRoute('settings.view', <SettingsPage />)} />
    <Route path="/audit" element={protectedRoute('audit.view', <AuditPage />)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
