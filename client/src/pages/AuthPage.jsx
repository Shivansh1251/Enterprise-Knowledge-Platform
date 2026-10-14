import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    AlertCircle, ArrowRight, BookOpen, Building2, FileText, LoaderCircle,
    LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, Eye, EyeOff,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import api from '../lib/api'
import HankMark from '../components/layout/HankMark'
import './AuthPage.css'

function Field({ id, label, icon: Icon, children }) {
    return (
        <div className="auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="auth-input-wrap"><Icon size={16} aria-hidden="true" />{children}</div>
        </div>
    )
}

export default function AuthPage() {
    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState('')
    const [error, setError] = useState('')
    const [demoStatus, setDemoStatus] = useState('checking')
    const { login, register, demoLogin } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        let active = true
        api.get('/auth/demo-status')
            .then(({ data }) => { if (active) setDemoStatus(data.enabled ? 'enabled' : 'disabled') })
            .catch(() => { if (active) setDemoStatus('unavailable') })
        return () => { active = false }
    }, [])

    const updateField = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }))
        setError('')
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setLoading('account')
        try {
            if (mode === 'login') {
                await login(form.email, form.password)
            } else {
                await register(form.name, form.email, form.password, form.organizationName)
            }
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading('')
        }
    }

    const handleDemoLogin = async (role) => {
        setError('')
        setLoading(role)
        try {
            await demoLogin(role)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Demo access is not available right now.')
        } finally {
            setLoading('')
        }
    }

    const changeMode = (nextMode) => {
        setMode(nextMode)
        setError('')
    }

    return (
        <div className="auth-scene">
            <header className="auth-brandbar">
                <a className="auth-brand" href="/login" aria-label="Hank sign in">
                    <HankMark size={38} />
                    <span><strong>Hank</strong><small>KNOWLEDGE ASSISTANT</small></span>
                </a>
                <span className="auth-brandbar-note"><ShieldCheck size={14} /> Your workspace stays yours</span>
            </header>

            <main className="auth-layout">
                <section className="auth-story" aria-label="About Hank">
                    <div className="auth-story-badge"><Sparkles size={14} /> ASK YOUR KNOWLEDGE BASE</div>
                    <h1>Good answers start with what your team already knows.</h1>
                    <p>Bring your organization’s guides and policies together. Hank finds useful passages and shows you where each one came from.</p>
                    <div className="auth-sample-preview">
                        <div className="auth-preview-heading"><span className="auth-preview-dot" /><span>Sample knowledge base</span><span className="auth-preview-count">4 docs</span></div>
                        <div className="auth-preview-row"><span className="auth-file-icon"><FileText size={15} /></span><span><strong>Annual Leave Policy</strong><small>20 days annual leave · 1 source</small></span><BookOpen size={14} className="auth-preview-open" /></div>
                        <div className="auth-preview-row"><span className="auth-file-icon"><FileText size={15} /></span><span><strong>Employee Onboarding Guide</strong><small>First week checklist · 1 source</small></span><BookOpen size={14} className="auth-preview-open" /></div>
                        <div className="auth-preview-row"><span className="auth-file-icon"><FileText size={15} /></span><span><strong>Expense Reimbursement</strong><small>Claims and approvals · 1 source</small></span><BookOpen size={14} className="auth-preview-open" /></div>
                    </div>
                    <div className="auth-story-foot"><HankMark size={28} /><span>Search documents. Open sources. Know why.</span></div>
                </section>

                <section className="auth-card" aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
                    <div className="auth-card-heading">
                        <div className="auth-mobile-mark"><HankMark size={39} /></div>
                        <p className="auth-eyebrow">YOUR KNOWLEDGE, AT HAND</p>
                        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                        <p className="auth-subtitle">{mode === 'login' ? 'Sign in to ask Hank about your team’s knowledge.' : 'Set up your workspace and add your first documents.'}</p>
                    </div>

                    <div className="auth-mode-tabs" role="group" aria-label="Account access">
                        <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => changeMode('login')}>Sign in</button>
                        <button type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'selected' : ''} onClick={() => changeMode('register')}>Sign up</button>
                    </div>

                    {error && <div className="auth-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}

                    <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading === 'account'}>
                        {mode === 'register' && <>
                            <Field id="auth-name" label="Your name" icon={UserRound}>
                                <input id="auth-name" name="name" autoComplete="name" placeholder="e.g. Alex Morgan" value={form.name} onChange={updateField('name')} required />
                            </Field>
                            <Field id="auth-organization" label="Organization" icon={Building2}>
                                <input id="auth-organization" name="organizationName" autoComplete="organization" placeholder="Your team or company" value={form.organizationName} onChange={updateField('organizationName')} />
                            </Field>
                        </>}
                        <Field id="auth-email" label="Work email" icon={Mail}>
                            <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={updateField('email')} required />
                        </Field>
                        <Field id="auth-password" label="Password" icon={LockKeyhole}>
                            <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'} value={form.password} onChange={updateField('password')} minLength={mode === 'register' ? 6 : undefined} required />
                            <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </Field>
                        <button className="auth-submit" type="submit" disabled={Boolean(loading)}>
                            {loading === 'account' ? <LoaderCircle size={17} className="auth-spin" /> : <span>{mode === 'login' ? 'Sign in to Hank' : 'Create account'}</span>}
                            {loading !== 'account' && <ArrowRight size={17} />}
                        </button>
                    </form>

                    {demoStatus === 'enabled' && <>
                        <div className="auth-divider"><span>OR TRY A SAMPLE WORKSPACE</span></div>
                        <div className="auth-demo-options">
                            <button type="button" className="auth-demo-button" onClick={() => handleDemoLogin('guest')} disabled={Boolean(loading)}>
                                <span className="auth-demo-icon guest"><BookOpen size={17} /></span>
                                <span className="auth-demo-copy"><strong>{loading === 'guest' ? 'Opening guest access…' : 'Continue as guest'}</strong><small>Explore Hank and sample documents</small></span>
                                {loading === 'guest' ? <LoaderCircle size={15} className="auth-spin" /> : <ArrowRight size={15} />}
                            </button>
                            <button type="button" className="auth-demo-button" onClick={() => handleDemoLogin('admin')} disabled={Boolean(loading)}>
                                <span className="auth-demo-icon admin"><ShieldCheck size={17} /></span>
                                <span className="auth-demo-copy"><strong>{loading === 'admin' ? 'Opening admin demo…' : 'Admin demo'}</strong><small>View the sample workspace as admin</small></span>
                                {loading === 'admin' ? <LoaderCircle size={15} className="auth-spin" /> : <ArrowRight size={15} />}
                            </button>
                        </div>
                        <p className="auth-demo-note">Demo access uses a separate sample workspace with example documents.</p>
                    </>}
                    {demoStatus !== 'enabled' && <div className="auth-card-footer">New to Hank? <button type="button" onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in instead'}</button></div>}
                    {demoStatus === 'unavailable' && <p className="auth-demo-unavailable">Sample access isn’t available right now. Check that the API and database are running.</p>}
                </section>
            </main>
            <footer className="auth-footer">Hank searches only the documents in your organization’s knowledge base.</footer>
        </div>
    )
}
