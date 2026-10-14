import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import './AppLayout.css'

export default function AppLayout() {
    return (
        <div className="hank-shell">
            <Navbar />
            <main className="hank-main"><Outlet /></main>
        </div>
    )
}
