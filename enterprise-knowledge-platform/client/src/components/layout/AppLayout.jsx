import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import './AppLayout.css'

const PAGE_META = {
    '/': { eyebrow: 'WORKSPACE', title: 'Dashboard' },
    '/search': { eyebrow: 'KNOWLEDGE', title: 'Search' },
    '/knowledge-base': { eyebrow: 'KNOWLEDGE', title: 'Documents' },
    '/settings': { eyebrow: 'WORKSPACE', title: 'Settings' },
}

export default function AppLayout() {
    const { pathname } = useLocation()
    const page = PAGE_META[pathname] || PAGE_META['/']

    return (
        <div className="ek-shell">
            <Navbar />
            <div className="ek-workspace">
                <header className="ek-topbar">
                    <div>
                        <div className="ek-eyebrow">{page.eyebrow} <span>/</span> {page.title.toUpperCase()}</div>
                        <h1>{page.title}</h1>
                    </div>
                    <div className="ek-topbar-note">
                        <span className="ek-status-dot" />
                        <span>Private workspace</span>
                    </div>
                </header>
                <main className="ek-main">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
