import { Building2, CircleUserRound, LockKeyhole, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './SettingsPage.css'

function SettingRow({ label, value }) {
    return (
        <div className="settings-row">
            <span>{label}</span>
            <strong>{value || '—'}</strong>
        </div>
    )
}

export default function SettingsPage() {
    const { user, org } = useAuth()

    return (
        <div className="settings-page">
            <div className="settings-intro">
                <span className="dashboard-overline">PREFERENCES</span>
                <p>Your account and workspace information.</p>
            </div>
            <section className="settings-card">
                <div className="settings-card-heading">
                    <span><CircleUserRound size={17} /></span>
                    <div><strong>Your profile</strong><small>Account details used to sign in</small></div>
                </div>
                <SettingRow label="Name" value={user?.name} />
                <SettingRow label="Email" value={user?.email} />
            </section>
            <section className="settings-card">
                <div className="settings-card-heading">
                    <span><Building2 size={17} /></span>
                    <div><strong>Organization</strong><small>Your private knowledge workspace</small></div>
                </div>
                <SettingRow label="Workspace name" value={org?.name} />
            </section>
            <section className="settings-card settings-info-card">
                <div className="settings-card-heading">
                    <span><LockKeyhole size={17} /></span>
                    <div><strong>Search and privacy</strong><small>How this workspace handles your searches</small></div>
                </div>
                <p><Search size={14} /> Search results are limited to documents in your organization.</p>
                <p>When semantic search is configured, document chunks and search queries are sent to the configured embedding provider.</p>
            </section>
        </div>
    )
}
