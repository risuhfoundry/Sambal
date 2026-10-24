import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, ClipboardList, Database, LayoutDashboard, MapPinned, PackageSearch, Settings, ShieldCheck, ShoppingBag, Store, Waves } from 'lucide-react'
import { DemoStore, useDemo } from './state/DemoStore'
import { Activity as ActivityPage, FindResources, Listings, Orders, Overview, Requests, Reviews, Settings as SettingsPage, Simulator, Warehouses } from './screens'
import type { Role } from './domain/models'

const navigation = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/resources', label: 'Find resources', icon: PackageSearch },
  { to: '/requests', label: 'Assistance requests', icon: ClipboardList },
  { to: '/orders', label: 'My orders', icon: ShoppingBag },
  { to: '/listings', label: 'Manage listings', icon: Store },
  { to: '/warehouses', label: 'Warehouses', icon: MapPinned },
  { to: '/reviews', label: 'Coordinator review', icon: ShieldCheck },
  { to: '/simulator', label: 'Resilience simulator', icon: Waves },
  { to: '/activity', label: 'Activity & audit log', icon: Activity },
  { to: '/settings', label: 'Settings & demo reset', icon: Settings },
]

const titleByPath: Record<string, string> = Object.fromEntries(navigation.map(item => [item.to, item.label]))

function Shell() {
  const { state, setRole } = useDemo()
  const location = useLocation()
  const title = titleByPath[location.pathname] || 'Community resilience workspace'
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <NavLink to="/overview" className="brand"><span className="brand-symbol"><Activity size={19} strokeWidth={2.4} /></span><span><strong>LIFELINE</strong><small>COMMUNITY RESILIENCE</small></span></NavLink>
      <div className="workspace-label"><span>WORKSPACE</span><strong>Sambal response demo</strong><small><span className="online-dot" />Local demo environment</small></div>
      <nav aria-label="Main navigation" className="side-nav">
        <span className="nav-caption">COORDINATE</span>
        {navigation.slice(0, 3).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}
        <span className="nav-caption nav-caption--spaced">RESOURCES</span>
        {navigation.slice(3, 6).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}
        <span className="nav-caption nav-caption--spaced">RESPONSE</span>
        {navigation.slice(6, 9).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-bottom"><NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}><Settings size={17} /><span>Settings & demo reset</span></NavLink><div className="sidebar-sdg"><span>SDG 11</span><span>SDG 13</span><small>Sustainable communities · climate resilience</small></div><div className="sidebar-user"><span className="user-avatar">{state.currentUser.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span><strong>{state.currentUser.name}</strong><small>{state.role} · demo role</small></span><Database size={15} /></div></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-heading"><span className="mobile-brand">LIFELINE</span><span className="topbar-divider" /><strong>{title}</strong></div><div className="topbar-actions"><span className="demo-chip"><span />SIMULATED DATA</span><label className="role-switch"><span>Viewing as</span><select value={state.role} onChange={event => setRole(event.target.value as Role)} aria-label="Switch demo role"><option>Taker</option><option>Giver</option><option>Coordinator</option><option>Warehouse Provider</option></select></label></div></header>
      <nav aria-label="Mobile navigation" className="mobile-nav">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`}><Icon size={16} /><span>{label}</span></NavLink>)}</nav>
      <main id="main-content" className="main-content"><Outlet /><footer className="page-footer"><span>Lifeline · Essential resources. Connected communities. Stronger recovery.</span><span>Local prototype · No live emergency data</span></footer></main>
    </div>
  </div>
}

export default function App() {
  return <BrowserRouter><DemoStore><Routes><Route element={<Shell />}><Route index element={<Navigate to="/overview" replace />} /><Route path="overview" element={<Overview />} /><Route path="resources" element={<FindResources />} /><Route path="requests" element={<Requests />} /><Route path="orders" element={<Orders />} /><Route path="listings" element={<Listings />} /><Route path="warehouses" element={<Warehouses />} /><Route path="reviews" element={<Reviews />} /><Route path="simulator" element={<Simulator />} /><Route path="activity" element={<ActivityPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/overview" replace />} /></Route></Routes></DemoStore></BrowserRouter>
}
