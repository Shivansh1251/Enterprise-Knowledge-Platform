import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowUpRight, BookOpen, CheckCircle2, Clock3, FileText, Search, Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import api from '../lib/api'
import './DashboardPage.css'

const SUGGESTED_QUESTIONS = [
    'What is our leave policy?',
    'How does onboarding work?',
    'Where can I find expense guidance?',
]

function DocumentStatus({ status }) {
    const ready = status === 'READY'
    const failed = status === 'FAILED'
    const Icon = ready ? CheckCircle2 : failed ? FileText : Clock3
    return (
        <span className={`dashboard-status${ready ? ' is-ready' : failed ? ' is-failed' : ''}`}>
            <Icon size={12} /> {ready ? 'Ready' : failed ? 'Failed' : 'Processing'}
        </span>
    )
}

export default function DashboardPage() {
    const { user, org } = useAuth()
    const [renderedAt] = useState(() => Date.now())
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        api.get('/documents')
            .then(({ data }) => {
                if (active) setDocuments(data.documents || [])
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || 'Could not load recent documents.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => { active = false }
    }, [])

    const readyCount = documents.filter((document) => document.status === 'READY').length
    const processingCount = documents.filter((document) => ['UPLOADED', 'PROCESSING'].includes(document.status)).length
    const recentDocuments = documents.slice(0, 4)

    return (
        <div className="dashboard-page">
            <div className="dashboard-welcome">
                <div>
                    <div className="dashboard-overline">YOUR KNOWLEDGE WORKSPACE</div>
                    <h2>Welcome back, {user?.name?.split(' ')[0] || 'there'}</h2>
                    <p>Everything your team knows, ready when you need it.</p>
                </div>
                <div className="dashboard-org-pill"><span />{org?.name || 'Your organization'}</div>
            </div>

            <section className="dashboard-hero">
                <div className="dashboard-hero-copy">
                    <span className="dashboard-hero-tag"><Sparkles size={13} /> KNOWLEDGE ASSISTANT</span>
                    <h3>Ask anything about your company.</h3>
                    <p>Search policies, guides, and internal documents. Get useful passages with their source attached.</p>
                    <Link className="dashboard-primary-button" to="/search">
                        <Search size={16} /> Ask your knowledge base <ArrowUpRight size={15} />
                    </Link>
                </div>
                <div className="dashboard-hero-art" aria-hidden="true">
                    <div className="dashboard-art-orbit orbit-one" />
                    <div className="dashboard-art-orbit orbit-two" />
                    <div className="dashboard-art-book"><BookOpen size={34} strokeWidth={1.6} /></div>
                    <span className="dashboard-art-spark spark-one">✦</span>
                    <span className="dashboard-art-spark spark-two">✧</span>
                </div>
            </section>

            <section className="dashboard-stat-grid" aria-label="Knowledge base summary">
                <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon icon-docs"><FileText size={17} /></span>
                    <div><span>Documents</span><strong>{loading ? '—' : documents.length}</strong></div>
                    <small>in your workspace</small>
                </article>
                <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon icon-ready"><CheckCircle2 size={17} /></span>
                    <div><span>Ready to search</span><strong>{loading ? '—' : readyCount}</strong></div>
                    <small>indexed documents</small>
                </article>
                <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon icon-processing"><Clock3 size={17} /></span>
                    <div><span>Processing</span><strong>{loading ? '—' : processingCount}</strong></div>
                    <small>being prepared</small>
                </article>
            </section>

            <div className="dashboard-lower-grid">
                <section className="dashboard-panel recent-panel">
                    <div className="dashboard-section-heading">
                        <div><span className="dashboard-overline">YOUR LIBRARY</span><h3>Recent knowledge</h3></div>
                        <Link to="/knowledge-base" className="dashboard-text-link">View all <ArrowUpRight size={14} /></Link>
                    </div>
                    {error ? (
                        <div className="dashboard-empty-state">{error}</div>
                    ) : recentDocuments.length === 0 && !loading ? (
                        <div className="dashboard-empty-state">
                            <FileText size={21} />
                            <strong>Your library is ready for its first document</strong>
                            <span>Upload a PDF or text file to make it searchable.</span>
                            <Link to="/knowledge-base">Add a document <ArrowUpRight size={13} /></Link>
                        </div>
                    ) : (
                        <div className="dashboard-document-list">
                            {(loading ? Array.from({ length: 3 }, (_, index) => ({ id: `loading-${index}`, name: 'Loading documents…', status: 'PROCESSING' })) : recentDocuments).map((document) => (
                                <Link to="/knowledge-base" className="dashboard-document-row" key={document.id}>
                                    <span className="dashboard-file-icon"><FileText size={16} /></span>
                                    <span className="dashboard-document-info">
                                        <strong>{document.name}</strong>
                                        <small>{document._count?.chunks || 0} chunks · {new Date(document.createdAt || renderedAt).toLocaleDateString()}</small>
                                    </span>
                                    <DocumentStatus status={document.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-panel prompts-panel">
                    <div className="dashboard-section-heading">
                        <div><span className="dashboard-overline">GET STARTED</span><h3>Try asking</h3></div>
                        <span className="dashboard-prompt-mark"><Sparkles size={16} /></span>
                    </div>
                    <p className="dashboard-prompt-intro">A few questions to explore your team's knowledge.</p>
                    <div className="dashboard-prompt-list">
                        {SUGGESTED_QUESTIONS.map((question) => (
                            <Link key={question} to={`/search?q=${encodeURIComponent(question)}`} className="dashboard-prompt-link">
                                <span>{question}</span><ArrowUpRight size={14} />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
