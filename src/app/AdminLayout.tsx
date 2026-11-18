import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Building2, ChevronLeft, ChevronRight, CreditCard,
  LayoutDashboard, LogOut, Menu, ShieldCheck,
  Users, UserRound, X,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Button, Modal } from '../components/ui'
import { authApi } from '../services/api'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
  { to: '/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles.view' },
  { to: '/projects', label: 'Projects', icon: Building2, permission: 'projects.view' },
  { to: '/customers', label: 'Customers', icon: UserRound, permission: 'customers.view' },
  { to: '/collections', label: 'Collections', icon: CreditCard, permission: 'payments.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { profile, has } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const current = navigation.find((item) => item.to === location.pathname)?.label ?? 'RK Group Admin'
  const closeLogout = () => {
    if (signingOut) return
    setConfirmingLogout(false)
    setLogoutError('')
  }
  const confirmLogout = async () => {
    setSigningOut(true)
    setLogoutError('')
    try {
      await authApi.signOut()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
      setSigningOut(false)
    }
  }
  return (
    <div className={`admin-shell ${collapsed ? 'admin-shell--collapsed' : ''}`}>
      {open && <button className="nav-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Show navigation drawer' : 'Hide navigation drawer'}
          title={collapsed ? 'Show navigation drawer' : 'Hide navigation drawer'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className="brand">
          <img src="/rk-logo.png" alt="RK Group" />
          <div><strong>RK Group</strong><span>Admin workspace</span></div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)}><X /></button>
        </div>
        <nav>
          {navigation.filter((item) => has(item.permission)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} /><span>{label}</span><ChevronRight size={16} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-profile">
          <button className="sidebar-profile-link" onClick={() => { setOpen(false); navigate('/settings') }} aria-label="Open profile settings">
            <div className="avatar">{profile?.full_name?.slice(0, 1).toUpperCase() ?? 'R'}</div>
            <div><strong>{profile?.full_name}</strong><span>{profile?.role?.name ?? profile?.designation}</span></div>
          </button>
          <button className="icon-button" onClick={() => setConfirmingLogout(true)} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      <section className="admin-main">
        <div className="mobile-bar"><button className="icon-button" onClick={() => setOpen(true)}><Menu /></button><strong>{current}</strong></div>
        <main>{children}</main>
      </section>
      {confirmingLogout && <Modal title="Confirm logout" onClose={closeLogout} width={440}>
        <div className="modal-form logout-confirmation">
          <p>Are you sure you want to log out of the RK Group Admin panel?</p>
          {logoutError && <div className="alert alert--error">{logoutError}</div>}
          <div className="modal-actions"><Button type="button" variant="secondary" onClick={closeLogout} disabled={signingOut}>Cancel</Button><Button type="button" variant="danger" onClick={() => void confirmLogout()} loading={signingOut}><LogOut size={17} /> Logout</Button></div>
        </div>
      </Modal>}
    </div>
  )
}
