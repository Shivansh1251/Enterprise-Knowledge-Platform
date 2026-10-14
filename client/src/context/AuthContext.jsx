import { useState } from 'react'
import api from '../lib/api'
import AuthContext from './AuthContextValue'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ekp_user')) } catch { return null }
    })
    const [org, setOrg] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ekp_org')) } catch { return null }
    })
    const [demoRole, setDemoRole] = useState(() => localStorage.getItem('ekp_demo_role') || '')

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('ekp_token', data.token)
        localStorage.setItem('ekp_user', JSON.stringify(data.user))
        localStorage.setItem('ekp_org', JSON.stringify(data.organization))
        localStorage.removeItem('ekp_demo_role')
        setUser(data.user)
        setOrg(data.organization)
        setDemoRole('')
        return data
    }

    const register = async (name, email, password, organizationName) => {
        const { data } = await api.post('/auth/register', { name, email, password, organizationName })
        localStorage.setItem('ekp_token', data.token)
        localStorage.setItem('ekp_user', JSON.stringify(data.user))
        localStorage.setItem('ekp_org', JSON.stringify(data.organization))
        localStorage.removeItem('ekp_demo_role')
        setUser(data.user)
        setOrg(data.organization)
        setDemoRole('')
        return data
    }

    const demoLogin = async (role) => {
        const { data } = await api.post('/auth/demo', { role })
        localStorage.setItem('ekp_token', data.token)
        localStorage.setItem('ekp_user', JSON.stringify(data.user))
        localStorage.setItem('ekp_org', JSON.stringify(data.organization))
        localStorage.setItem('ekp_demo_role', role)
        setUser(data.user)
        setOrg(data.organization)
        setDemoRole(role)
        return data
    }

    const logout = () => {
        localStorage.removeItem('ekp_token')
        localStorage.removeItem('ekp_user')
        localStorage.removeItem('ekp_org')
        localStorage.removeItem('ekp_demo_role')
        setUser(null)
        setOrg(null)
        setDemoRole('')
    }

    return (
        <AuthContext.Provider value={{ user, org, demoRole, login, register, demoLogin, logout, isAuth: Boolean(user && localStorage.getItem('ekp_token')) }}>
            {children}
        </AuthContext.Provider>
    )
}
