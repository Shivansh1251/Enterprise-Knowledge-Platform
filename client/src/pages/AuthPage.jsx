import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Mail, Lock, User, Building2, ArrowRight, Loader2 } from 'lucide-react'

function InputWrapper({ icon: Icon, children }) {
    return (
        <div style={{ position: 'relative' }}>
            <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            {children}
        </div>
    )
}

export default function AuthPage() {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { login, register } = useAuth()
    const navigate = useNavigate()

    const set = (k) => (e) => {
        setForm((f) => ({ ...f, [k]: e.target.value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (mode === 'login') {
                await login(form.email, form.password)
            } else {
                await register(form.name, form.email, form.password, form.organizationName)
            }
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px 16px 12px 44px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        fontSize: 14,
        fontFamily: 'inherit',
        background: '#fff',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'border-color 0.15s ease',
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <div style={{
                width: '100%',
                maxWidth: 420,
                background: '#fff',
                borderRadius: 20,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-light)',
                padding: '40px 36px',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'var(--accent-green-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <BookOpen size={24} color="var(--accent-green)" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                        Enterprise Knowledge
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </p>
                </div>

                {/* Toggle */}
                <div style={{
                    display: 'flex', background: 'var(--bg-primary)', borderRadius: 10,
                    padding: 4, marginBottom: 28,
                }}>
                    {['login', 'register'].map((m) => (
                        <button key={m} onClick={() => { setMode(m); setError('') }}
                            style={{
                                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
                                fontSize: 14, fontWeight: mode === m ? 600 : 400,
                                background: mode === m ? '#fff' : 'transparent',
                                color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                                cursor: 'pointer', transition: 'all 0.15s ease',
                                fontFamily: 'inherit',
                            }}
                        >
                            {m === 'login' ? 'Sign In' : 'Register'}
                        </button>
                    ))}
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                        background: 'var(--accent-red-light)', color: 'var(--accent-red)',
                        fontSize: 13, border: '1px solid #fca5a5',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mode === 'register' && (
                        <>
                            <InputWrapper icon={User}>
                                <input id="name" style={inputStyle} placeholder="Full name" value={form.name}
                                    onChange={set('name')} required
                                    onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                />
                            </InputWrapper>
                            <InputWrapper icon={Building2}>
                                <input id="org" style={inputStyle} placeholder="Organization name (optional)" value={form.organizationName}
                                    onChange={set('organizationName')}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                />
                            </InputWrapper>
                        </>
                    )}
                    <InputWrapper icon={Mail}>
                        <input id="email" type="email" style={inputStyle} placeholder="Email address" value={form.email}
                            onChange={set('email')} required
                            onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </InputWrapper>
                    <InputWrapper icon={Lock}>
                        <input id="password" type="password" style={inputStyle} placeholder="Password" value={form.password}
                            onChange={set('password')} required minLength={6}
                            onFocus={e => e.target.style.borderColor = 'var(--accent-green)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </InputWrapper>

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '13px 0',
                        background: loading ? 'var(--accent-green-light)' : 'var(--accent-green)',
                        color: loading ? 'var(--accent-green)' : '#fff',
                        border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.15s ease', marginTop: 4,
                    }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    )
}
