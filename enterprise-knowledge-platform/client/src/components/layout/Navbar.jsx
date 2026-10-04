import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
    BookOpen, LayoutDashboard, Search, Files, Settings, LogOut, Building2,
} from 'lucide-react'

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/knowledge-base', label: 'Documents', icon: Files },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Navbar() {
    const { user, org, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <aside className="ek-sidebar">
            <NavLink to="/" className="ek-brand" aria-label="Enterprise Knowledge home">
                <span className="ek-brand-icon"><BookOpen size={19} strokeWidth={2.2} /></span>
                <span className="ek-brand-name">Enterprise <strong>Knowledge</strong></span>
            </NavLink>

            <div className="ek-sidebar-label">WORKSPACE</div>
            <nav className="ek-nav" aria-label="Main navigation">
                {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        title={label}
                        className={({ isActive }) => `ek-nav-link${isActive ? ' is-active' : ''}`}
                    >
                        <Icon size={17} strokeWidth={1.9} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="ek-sidebar-spacer" />

            <div className="ek-org-card">
                <span className="ek-org-icon"><Building2 size={15} /></span>
                <div className="ek-org-copy">
                    <span>ORGANIZATION</span>
                    <strong title={org?.name}>{org?.name || 'Your workspace'}</strong>
                </div>
            </div>

            <div className="ek-profile">
                <div className="ek-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
                <div className="ek-profile-copy">
                    <strong>{user?.name || 'User'}</strong>
                    <span>{user?.email || 'Workspace member'}</span>
                </div>
                <button className="ek-logout" onClick={handleLogout} title="Sign out" aria-label="Sign out">
                    <LogOut size={16} />
                </button>
            </div>
        </aside>
    )
}
