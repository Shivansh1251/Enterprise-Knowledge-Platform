import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function ProtectedRoute({ children }) {
    const { isAuth } = useAuth()
    return isAuth ? children : <Navigate to="/login" replace />
}
