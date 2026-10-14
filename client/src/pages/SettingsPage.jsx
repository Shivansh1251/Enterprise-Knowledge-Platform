import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, Check, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import './SettingsPage.css'

function DetailRow({ label, value, icon: Icon }) {
    return <div className="settings-detail-row"><span className="settings-detail-label">{Icon && <Icon size={14} />}{label}</span><strong>{value || '—'}</strong></div>
}

export default function SettingsPage() {
    const { user, org, demoRole } = useAuth()

    return (
        <div className="settings-page">
            <Link className="settings-back-link" to="/"><ArrowLeft size={14} /> Back to Ask Hank</Link>
            <header className="settings-page-heading">
                <span>WORKSPACE</span>
                <h1>Account & workspace</h1>
                <p>Your profile, organization, and data access at a glance.</p>
            </header>

            {demoRole && <div className="settings-demo-notice"><ShieldCheck size={16} /><span>You’re using the {demoRole} demo. This session is connected to sample workspace data.</span></div>}

            <div className="settings-card-grid">
                <section className="settings-card">
                    <div className="settings-card-heading"><span className="settings-card-icon profile"><UserRound size={17} /></span><span><strong>Your profile</strong><small>Account used to access Hank</small></span></div>
                    <DetailRow label="Name" value={user?.name} />
                    <DetailRow label="Email" value={user?.email} icon={Mail} />
                </section>
                <section className="settings-card">
                    <div className="settings-card-heading"><span className="settings-card-icon workspace"><Building2 size={17} /></span><span><strong>Workspace</strong><small>Your organization’s private knowledge base</small></span></div>
                    <DetailRow label="Organization" value={org?.name} />
                    <DetailRow label="Access" value={demoRole ? `${demoRole[0].toUpperCase()}${demoRole.slice(1)} demo` : 'Organization member'} icon={ShieldCheck} />
                </section>
                <section className="settings-card settings-security-card">
                    <div className="settings-card-heading"><span className="settings-card-icon security"><LockKeyhole size={17} /></span><span><strong>Search & privacy</strong><small>How your workspace data is used</small></span></div>
                    <div className="settings-privacy-item"><span><Check size={14} /></span><p>Search is scoped to documents in this organization.</p></div>
                    <div className="settings-privacy-item"><span><Check size={14} /></span><p>Each result links to its source passage so you can verify the context.</p></div>
                    <p className="settings-privacy-note">When semantic search is configured, your query and document passages are sent to the configured embedding provider.</p>
                </section>
            </div>
        </div>
    )
}
