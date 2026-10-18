import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import AskFloatingAction from './AskFloatingAction'
import ToastProvider from '../feedback/ToastProvider'
import './AppLayout.css'

export default function AppLayout() {
    return (
        <ToastProvider>
            <div className="hank-shell">
                <Navbar />
                <main className="hank-main"><Outlet /></main>
                <AskFloatingAction />
            </div>
        </ToastProvider>
    )
}
