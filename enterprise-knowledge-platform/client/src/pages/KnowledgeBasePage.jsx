import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api'
import {
    FileText, Trash2, CheckCircle2, Clock, AlertCircle,
    Loader2, RefreshCw, FileUp, Calendar, User
} from 'lucide-react'

const STATUS_CONFIG = {
    READY: { label: 'Ready', color: 'var(--accent-green)', bg: 'var(--accent-green-light)', icon: CheckCircle2 },
    PROCESSING: { label: 'Processing', color: 'var(--accent-amber)', bg: 'var(--accent-amber-light)', icon: Clock },
    UPLOADED: { label: 'Uploaded', color: 'var(--accent-blue)', bg: 'var(--accent-blue-light)', icon: Clock },
    FAILED: { label: 'Failed', color: 'var(--accent-red)', bg: 'var(--accent-red-light)', icon: AlertCircle },
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPLOADED
    const Icon = cfg.icon
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
            color: cfg.color, background: cfg.bg,
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    )
}

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [error, setError] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef()

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await api.get('/documents')
            setDocuments(data.documents)
            setError('')
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to load documents')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchDocuments()
    }, [fetchDocuments])

    useEffect(() => {
        const hasPendingDocuments = documents.some(
            (document) => document.status === 'PROCESSING' || document.status === 'UPLOADED',
        )
        if (!hasPendingDocuments) return undefined

        const interval = setInterval(() => void fetchDocuments(), 3000)
        return () => clearInterval(interval)
    }, [documents, fetchDocuments])

    const handleUpload = async (file) => {
        if (!file) return
        setUploading(true)
        setError('')
        setUploadProgress('Uploading...')

        const form = new FormData()
        form.append('file', file)

        try {
            setUploadProgress('Uploading file...')
            await api.post('/documents', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setUploadProgress('Processing document...')
            await new Promise((r) => setTimeout(r, 500))
            await fetchDocuments()
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Upload failed')
        } finally {
            setUploading(false)
            setUploadProgress('')
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this document and all its chunks?')) return
        try {
            await api.delete(`/documents/${id}`)
            setDocuments((prev) => prev.filter((d) => d.id !== id))
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Delete failed')
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleUpload(file)
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>
                    Knowledge Base
                </h1>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>
                    Upload and manage your organization's documents
                </p>
            </div>

            {/* Upload zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? 'var(--accent-green)' : 'var(--border)'}`,
                    borderRadius: 16,
                    padding: '36px 24px',
                    textAlign: 'center',
                    background: dragOver ? 'var(--accent-green-light)' : '#fff',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: 28,
                }}
            >
                <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => handleUpload(e.target.files[0])}
                    disabled={uploading}
                />
                {uploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <Loader2 size={32} color="var(--accent-green)" style={{ animation: 'spin 1s linear infinite' }} />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-green)' }}>{uploadProgress}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                Extracting text and indexing chunks…
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'var(--accent-green-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 14px',
                        }}>
                            <FileUp size={22} color="var(--accent-green)" />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                            Drop a file here or click to upload
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            PDF or TXT · Up to 25 MB
                        </div>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '12px 16px', borderRadius: 12, marginBottom: 20,
                    background: 'var(--accent-red-light)', color: 'var(--accent-red)',
                    fontSize: 13, border: '1px solid #fca5a5',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <AlertCircle size={15} />
                    {error}
                </div>
            )}

            {/* Document list */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Documents ({documents.length})
                </h2>
                <button onClick={fetchDocuments} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 12px',
                    fontSize: 13, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit',
                }}>
                    <RefreshCw size={13} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
                    <Loader2 size={24} color="var(--text-muted)" />
                </div>
            ) : documents.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 24px',
                    background: '#fff', borderRadius: 16, border: '1px solid var(--border)',
                }}>
                    <FileText size={36} color="var(--text-muted)" style={{ marginBottom: 14 }} />
                    <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>
                        No documents yet. Upload your first PDF to get started.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {documents.map((doc) => (
                        <div key={doc.id} style={{
                            background: '#fff', borderRadius: 14,
                            border: '1px solid var(--border)',
                            padding: '18px 22px',
                            display: 'flex', alignItems: 'center', gap: 16,
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'box-shadow 0.15s ease',
                        }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 42, height: 42, borderRadius: 10,
                                background: 'var(--bg-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FileText size={18} color="var(--text-secondary)" />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                    <StatusBadge status={doc.status} />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                        <User size={11} />
                                        {doc.uploader?.name || 'Unknown'}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                                        <Calendar size={11} />
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </span>
                                    {doc._count?.chunks > 0 && (
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {doc._count.chunks} chunks
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Delete */}
                            <button
                                onClick={() => handleDelete(doc.id)}
                                title="Delete document"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: 8, borderRadius: 8,
                                    display: 'flex', alignItems: 'center',
                                    transition: 'all 0.15s ease', flexShrink: 0,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--accent-red-light)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
