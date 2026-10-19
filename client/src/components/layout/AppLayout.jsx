import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import AskFloatingAction from './AskFloatingAction'
import ToastProvider from '../feedback/ToastProvider'
import './AppLayout.css'

export default function AppLayout() {
    const location = useLocation()

    return (
        <ToastProvider>
            <div className="hank-shell">
                <Navbar />
                <main className="hank-main"><Outlet /></main>
                <AskFloatingAction key={location.pathname} />
            </div>
        </ToastProvider>
    )
}
