import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronDown, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import HankMark from './HankMark'

export default function Navbar() {
    const { user, org, demoRole, logout } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!menuOpen) return undefined
        const handleOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
        }
        const handleEscape = (event) => {
            if (event.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [menuOpen])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }
    const initials = (user?.name || 'U').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

    return (
        <header className="hank-topbar">
            <NavLink to="/" className="hank-brand" aria-label="Hank home">
                <HankMark size={34} />
                <span><strong>Hank</strong><small>KNOWLEDGE ASSISTANT</small></span>
            </NavLink>
            <div className="hank-topbar-right">
                {org?.name && <span className="hank-org-name" title={org.name}>{org.name}</span>}
                <nav className="hank-primary-nav" aria-label="Main navigation">
                    <NavLink to="/" end className={({ isActive }) => `hank-nav-link${isActive ? ' active' : ''}`}>
                        <span>Ask Hank</span>
                    </NavLink>
                    <NavLink to="/knowledge-base" className={({ isActive }) => `hank-nav-link${isActive ? ' active' : ''}`}>
                        <BookOpen size={15} /> <span>Knowledge base</span>
                    </NavLink>
                </nav>
                <div className="hank-account-menu" ref={menuRef}>
                    <button className="hank-account-trigger" type="button" aria-expanded={menuOpen} aria-controls="hank-account-popover" onClick={() => setMenuOpen((open) => !open)}>
                        <span className="hank-avatar">{initials}</span>
                        <span className="hank-account-trigger-copy"><strong>{user?.name || 'Account'}</strong><small>{demoRole ? `${demoRole} demo` : org?.name || user?.email || 'Workspace member'}</small></span>
                        <ChevronDown size={14} />
                    </button>
                    {menuOpen && <div className="hank-account-popover" id="hank-account-popover" role="group" aria-label="Account actions">
                        <div className="hank-account-popover-head"><span className="hank-avatar large">{initials}</span><span><strong>{user?.name || 'Account'}</strong><small>{user?.email || ''}</small></span></div>
                        {demoRole && <div className="hank-demo-access-note">{demoRole === 'guest' ? 'Guest preview · read only' : 'Admin demo workspace'}</div>}
                        <NavLink to="/settings" onClick={() => setMenuOpen(false)}><Settings size={15} /> Account & workspace</NavLink>
                        <button type="button" onClick={handleLogout}><LogOut size={15} /> Sign out</button>
                    </div>}
                </div>
            </div>
        </header>
    )
}
