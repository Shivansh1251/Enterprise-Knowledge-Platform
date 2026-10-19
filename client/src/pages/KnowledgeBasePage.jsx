import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    AlertCircle, BookOpen, Check, CheckCircle2, Clock3, FileText, FileUp,
    LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, Trash2, UploadCloud, X,
} from 'lucide-react'
import api from '../lib/api'
import StaggeredText from '../components/StaggeredText'
import { useAuth } from '../context/useAuth'
import './KnowledgeBasePage.css'

const STATUS = {
    READY: { label: 'Ready', Icon: CheckCircle2 },
    PROCESSING: { label: 'Indexing', Icon: Clock3 },
    UPLOADED: { label: 'Queued', Icon: Clock3 },
    FAILED: { label: 'Failed', Icon: AlertCircle },
}
const MAX_FILE_SIZE = 25 * 1024 * 1024

function StatusBadge({ status }) {
    const { label, Icon } = STATUS[status] || STATUS.UPLOADED
    return <span className={`kb-status kb-status-${status.toLowerCase()}`}><Icon size={13} />{label}</span>
}

function formatDate(value) {
    if (!value) return 'Date unavailable'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function DeleteDialog({ document, onCancel, onConfirm, deleting }) {
    const dialogRef = useRef(null)
    const cancelButtonRef = useRef(null)

    useEffect(() => {
        if (!document) return undefined
        const previousFocus = window.document.activeElement
        const previousOverflow = window.document.body.style.overflow
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !deleting) {
                onCancel()
                return
            }
            if (event.key !== 'Tab') return
            const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled)')
            if (!focusable?.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && window.document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && window.document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        window.document.body.style.overflow = 'hidden'
        window.document.addEventListener('keydown', handleKeyDown)
        cancelButtonRef.current?.focus()
        return () => {
            window.document.body.style.overflow = previousOverflow
            window.document.removeEventListener('keydown', handleKeyDown)
            if (previousFocus instanceof HTMLElement) previousFocus.focus()
        }
    }, [document, deleting, onCancel])

    if (!document) return null
    return (
        <div className="kb-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onCancel() }}>
            <section ref={dialogRef} className="kb-dialog" role="alertdialog" aria-modal="true" aria-labelledby="kb-delete-title" aria-describedby="kb-delete-copy">
                <div className="kb-dialog-icon"><Trash2 size={19} /></div>
                <button className="kb-dialog-close" type="button" onClick={onCancel} disabled={deleting} aria-label="Close confirmation"><X size={17} /></button>
                <h2 id="kb-delete-title">Remove this document?</h2>
                <p id="kb-delete-copy"><strong>{document.name}</strong> and its indexed passages will be removed from this workspace.</p>
                <div className="kb-dialog-actions">
                    <button ref={cancelButtonRef} type="button" className="kb-button kb-button-secondary" onClick={onCancel} disabled={deleting}><StaggeredText>Keep document</StaggeredText></button>
                    <button type="button" className="kb-button kb-button-danger" onClick={onConfirm} disabled={deleting}>{deleting ? <LoaderCircle size={15} className="kb-spin" /> : <Trash2 size={15} />}<StaggeredText>{deleting ? 'Removing…' : 'Remove document'}</StaggeredText></button>
                </div>
            </section>
        </div>
    )
}

export default function KnowledgeBasePage() {
    const { demoRole } = useAuth()
    const readOnlyGuest = demoRole === 'guest'
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [filter, setFilter] = useState('All')
    const [searchTerm, setSearchTerm] = useState('')
    const [pendingDelete, setPendingDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const fileInputRef = useRef(null)
    const cancelDelete = useCallback(() => {
        if (!deleting) setPendingDelete(null)
    }, [deleting])

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await api.get('/documents')
            setDocuments(Array.isArray(data.documents) ? data.documents : [])
            setError('')
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Could not load documents. Check your connection and try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    const refreshDocuments = async () => {
        setRefreshing(true)
        await fetchDocuments()
        setRefreshing(false)
    }

    useEffect(() => {
        let active = true
        api.get('/documents')
            .then(({ data }) => {
                if (!active) return
                setDocuments(Array.isArray(data.documents) ? data.documents : [])
                setError('')
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.error?.message || 'Could not load documents. Check your connection and try again.')
            })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        const hasPendingDocuments = documents.some((document) => ['PROCESSING', 'UPLOADED'].includes(document.status))
        if (!hasPendingDocuments) return undefined
        const interval = window.setInterval(() => void fetchDocuments(), 3000)
        return () => window.clearInterval(interval)
    }, [documents, fetchDocuments])

    const handleUpload = async (file) => {
        if (!file || uploading) return
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!['pdf', 'txt'].includes(extension)) {
            setError('Choose a PDF or TXT file to add to your knowledge base.')
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setError('This file is larger than 25 MB. Choose a smaller file and try again.')
            return
        }

        setError('')
        setNotice('')
        setUploading(true)
        setUploadProgress(0)
        const form = new FormData()
        form.append('file', file)

        try {
            await api.post('/documents', form, {
                onUploadProgress: ({ loaded, total }) => {
                    if (total) setUploadProgress(Math.min(100, Math.round((loaded / total) * 100)))
                },
            })
            setNotice(`${file.name} uploaded. Hank is indexing it now.`)
            await fetchDocuments()
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Upload failed. Check the file and try again.')
        } finally {
            setUploading(false)
            setUploadProgress(0)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const confirmDelete = async () => {
        if (!pendingDelete || deleting) return
        setDeleting(true)
        setError('')
        try {
            await api.delete(`/documents/${pendingDelete.id}`)
            setDocuments((current) => current.filter((document) => document.id !== pendingDelete.id))
            setNotice(`${pendingDelete.name} was removed from the knowledge base.`)
            setPendingDelete(null)
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Could not remove this document. Please try again.')
        } finally {
            setDeleting(false)
        }
    }

    const counts = useMemo(() => ({
        total: documents.length,
        ready: documents.filter((document) => document.status === 'READY').length,
        processing: documents.filter((document) => ['PROCESSING', 'UPLOADED'].includes(document.status)).length,
    }), [documents])

    const visibleDocuments = useMemo(() => documents.filter((document) => {
        const matchesSearch = document.name.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase())
        const matchesFilter = filter === 'All' || (filter === 'Ready' && document.status === 'READY') || (filter === 'Processing' && ['PROCESSING', 'UPLOADED'].includes(document.status)) || (filter === 'Failed' && document.status === 'FAILED')
        return matchesSearch && matchesFilter
    }), [documents, filter, searchTerm])

    return (
        <div className="kb-page">
            <header className="kb-page-heading">
                <div>
                    <div className="kb-eyebrow"><BookOpen size={14} /> HANK WORKSPACE</div>
                    <h1>Knowledge base</h1>
                    <p>Manage the documents Hank can search and cite in its answers.</p>
                </div>
                <div className="kb-heading-actions">
                    <Link className="kb-button kb-button-secondary kb-ask-link" to="/"><BookOpen size={15} /> <StaggeredText>Ask Hank</StaggeredText></Link>
                    <button className="kb-button kb-button-secondary kb-refresh" type="button" onClick={() => void refreshDocuments()} disabled={refreshing}>
                        <RefreshCw size={15} className={refreshing ? 'kb-spin' : ''} /> <StaggeredText>{refreshing ? 'Refreshing' : 'Refresh'}</StaggeredText>
                    </button>
                </div>
            </header>

            <section className="kb-overview" aria-label="Knowledge base overview">
                <div className="kb-overview-item"><span className="kb-overview-icon"><FileText size={17} /></span><span><strong>{counts.total}</strong><small>{counts.total === 1 ? 'Document' : 'Documents'}</small></span></div>
                <div className="kb-overview-divider" />
                <div className="kb-overview-item"><span className="kb-overview-icon ready"><Check size={17} /></span><span><strong>{counts.ready}</strong><small>Ready to search</small></span></div>
                <div className="kb-overview-divider" />
                <div className="kb-overview-item"><span className="kb-overview-icon processing"><Clock3 size={17} /></span><span><strong>{counts.processing}</strong><small>Being indexed</small></span></div>
                {readOnlyGuest && <div className="kb-readonly-pill"><ShieldCheck size={14} /> Guest preview</div>}
            </section>

            {readOnlyGuest && <div className="kb-guest-note"><ShieldCheck size={16} /><span>This workspace is read-only in guest mode. You can search documents and open citations.</span></div>}

            {!readOnlyGuest && <section className={`kb-upload-zone${dragOver ? ' is-dragging' : ''}${uploading ? ' is-uploading' : ''}`} aria-busy={uploading} onDragOver={(event) => { event.preventDefault(); setDragOver(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false) }} onDrop={(event) => { event.preventDefault(); setDragOver(false); void handleUpload(event.dataTransfer.files[0]) }}>
                <input ref={fileInputRef} className="kb-file-input" id="kb-file-upload" type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={(event) => void handleUpload(event.target.files?.[0])} disabled={uploading} />
                <span className="kb-upload-icon">{uploading ? <LoaderCircle size={23} className="kb-spin" /> : <UploadCloud size={23} />}</span>
                <div className="kb-upload-copy">
                    <h2>{uploading ? `Uploading${uploadProgress ? ` · ${uploadProgress}%` : '…'}` : 'Drop files here'}</h2>
                    <p>{uploading ? 'Your file will be searchable once indexing is complete.' : 'Drop a PDF or TXT file here, or choose a file from your device.'}</p>
                    {uploading && <div className="kb-progress" role="progressbar" aria-label="File upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}><span style={{ width: `${uploadProgress}%` }} /></div>}
                    {!uploading && <span className="kb-upload-limit">PDF or TXT <i /> Up to 25 MB</span>}
                </div>
                <button className="kb-upload-action" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Choose files to upload" title="Choose files to upload">
                    <Plus size={20} aria-hidden="true" />
                </button>
            </section>}

            {error && <div className="kb-feedback kb-feedback-error" role="alert"><AlertCircle size={16} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
            {notice && <div className="kb-feedback kb-feedback-success" role="status"><CheckCircle2 size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

            <section className="kb-library" aria-labelledby="kb-library-title">
                <div className="kb-library-heading">
                    <div><h2 id="kb-library-title">Your documents</h2><p>Only ready documents are included in search results.</p></div>
                    <label className="kb-search-field"><Search size={15} /><span className="kb-sr-only">Search documents</span><input type="search" placeholder="Find a document" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label>
                </div>
                <div className="kb-list-toolbar">
                    <div className="kb-filter-tabs" role="group" aria-label="Filter documents">
                        {['All', 'Ready', 'Processing', 'Failed'].map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}><StaggeredText>{`${item}${item === 'All' ? ` ${counts.total}` : item === 'Ready' ? ` ${counts.ready}` : item === 'Processing' ? ` ${counts.processing}` : ''}`}</StaggeredText></button>)}
                    </div>
                </div>

                {loading ? <div className="kb-loading"><LoaderCircle size={23} className="kb-spin" /><span>Loading your documents…</span></div> : error && documents.length === 0 ? (
                    <div className="kb-empty kb-empty-error"><div className="kb-empty-icon"><AlertCircle size={22} /></div><h3>Couldn’t load the library</h3><p>Check that the API is running, then try again.</p><button className="kb-button kb-button-secondary" type="button" onClick={() => void refreshDocuments()}><RefreshCw size={14} /> <StaggeredText>Try again</StaggeredText></button></div>
                ) : visibleDocuments.length === 0 ? (
                    <div className="kb-empty"><div className="kb-empty-icon"><FileText size={22} /></div><h3>{documents.length === 0 ? 'Your library is ready for its first document' : 'No documents match this view'}</h3><p>{documents.length === 0 ? (readOnlyGuest ? 'No sample documents are available in this workspace yet.' : 'Add a PDF or text file to give Hank something useful to search.') : 'Try a different search or filter.'}</p>{documents.length === 0 && !readOnlyGuest && <button type="button" className="kb-button kb-button-primary" onClick={() => fileInputRef.current?.click()}><FileUp size={15} /> <StaggeredText>Choose a document</StaggeredText></button>}</div>
                ) : (
                    <div className="kb-document-list" role="list">
                        {visibleDocuments.map((document) => {
                            return <article className="kb-document-row" role="listitem" key={document.id}>
                                <span className="kb-document-icon"><FileText size={18} /></span>
                                <div className="kb-document-main"><h3 title={document.name}>{document.name}</h3><div className="kb-document-meta"><span>{document.uploader?.name || 'Workspace member'}</span><i /> <span>{formatDate(document.createdAt)}</span>{document._count?.chunks > 0 && <><i /><span>{document._count.chunks} indexed {document._count.chunks === 1 ? 'passage' : 'passages'}</span></>}</div></div>
                                <StatusBadge status={document.status} />
                                {!readOnlyGuest && <button className="kb-delete-button" type="button" onClick={() => setPendingDelete(document)} aria-label={`Remove ${document.name}`} title="Remove document"><Trash2 size={16} /></button>}
                            </article>
                        })}
                    </div>
                )}
                {!loading && documents.length > 0 && <p className="kb-library-footer">Showing {visibleDocuments.length} of {documents.length} {documents.length === 1 ? 'document' : 'documents'}</p>}
            </section>

            <DeleteDialog document={pendingDelete} onCancel={cancelDelete} onConfirm={() => void confirmDelete()} deleting={deleting} />
        </div>
    )
}
