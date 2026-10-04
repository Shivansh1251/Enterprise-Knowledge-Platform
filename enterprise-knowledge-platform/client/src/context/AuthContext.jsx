import { createContext, useContext, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ekp_user')) } catch { return null }
    })
    const [org, setOrg] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ekp_org')) } catch { return null }
    })

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('ekp_token', data.token)
        localStorage.setItem('ekp_user', JSON.stringify(data.user))
        localStorage.setItem('ekp_org', JSON.stringify(data.organization))
        setUser(data.user)
        setOrg(data.organization)
        return data
    }

    const register = async (name, email, password, organizationName) => {
        const { data } = await api.post('/auth/register', { name, email, password, organizationName })
        localStorage.setItem('ekp_token', data.token)
        localStorage.setItem('ekp_user', JSON.stringify(data.user))
        localStorage.setItem('ekp_org', JSON.stringify(data.organization))
        setUser(data.user)
        setOrg(data.organization)
        return data
    }

    const logout = () => {
        localStorage.removeItem('ekp_token')
        localStorage.removeItem('ekp_user')
        localStorage.removeItem('ekp_org')
        setUser(null)
        setOrg(null)
    }

    return (
        <AuthContext.Provider value={{ user, org, login, register, logout, isAuth: !!user }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
