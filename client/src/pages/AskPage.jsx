import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import {
    AlertCircle, ArrowLeft, BookOpen, Check, ChevronRight, CircleHelp,
    FileText, Layers3, LoaderCircle, Mic, MicOff, Paperclip, Search, X,
} from 'lucide-react'
import api from '../lib/api'
import HankMark from '../components/layout/HankMark'
import RollingAskButton from '../components/RollingAskButton'
import './AskPage.css'

const SUGGESTIONS = [
    'What is our leave policy?',
    'How does onboarding work?',
    'What expenses can I claim?',
]

function getFileType(name = '') {
    const ext = name.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? 'PDF' : ext === 'txt' ? 'TXT' : 'Document'
}

function excerpt(content = '', limit = 245) {
    return content.length > limit ? `${content.slice(0, limit).trimEnd()}…` : content
}

function CitationCard({ result, index, onOpen }) {
    const documentName = result.citation?.documentName || result.documentName || 'Knowledge base document'
    const pageNumber = result.citation?.pageNumber ?? result.pageNumber
    const chunkIndex = result.citation?.chunkIndex ?? result.chunkIndex
    return (
        <button className="hank-result-card" onClick={() => onOpen(result)}>
            <div className="hank-card-topline">
                <span className="hank-ticket-number">SOURCE {String(index + 1).padStart(2, '0')}</span>
                <span className={`hank-file-badge hank-file-${getFileType(documentName).toLowerCase()}`}>
                    <FileText size={12} /> {getFileType(documentName)}
                </span>
            </div>
            <h3>{documentName}</h3>
            <p>{excerpt(result.content)}</p>
            <div className="hank-card-footer">
                <span>{pageNumber ? `Page ${pageNumber}` : `Chunk ${(chunkIndex ?? 0) + 1}`}</span>
                <span className="hank-card-open">Open source <ChevronRight size={14} /></span>
            </div>
        </button>
    )
}

function DetailDialog({ result, query, mode, onClose }) {
    const closeButtonRef = useRef(null)
    useEffect(() => {
        if (!result) return undefined
        const previousFocus = document.activeElement
        const previousOverflow = document.body.style.overflow
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose()
            if (event.key === 'Tab') {
                event.preventDefault()
                closeButtonRef.current?.focus()
            }
        }
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', handleKeyDown)
        closeButtonRef.current?.focus()
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', handleKeyDown)
            if (previousFocus instanceof HTMLElement) previousFocus.focus()
        }
    }, [result, onClose])

    if (!result) return null
    const name = result.citation?.documentName || result.documentName || 'Knowledge base document'
    const page = result.citation?.pageNumber ?? result.pageNumber
    const chunk = result.citation?.chunkIndex ?? result.chunkIndex
    return (
        <div className="hank-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <section className="hank-detail-modal" role="dialog" aria-modal="true" aria-labelledby="hank-detail-title">
                <header className="hank-modal-header">
                    <div className="hank-modal-title"><span>Knowledge source</span><span className="hank-modal-status"><Check size={13} /> Retrieved</span></div>
                    <button ref={closeButtonRef} className="hank-icon-button" onClick={onClose} aria-label="Close source details"><X size={19} /></button>
                </header>
                <div className="hank-modal-body">
                    <div className="hank-detail-kicker"><FileText size={15} /> {getFileType(name)} <span>·</span> {page ? `Page ${page}` : `Chunk ${(chunk ?? 0) + 1}`}</div>
                    <h2 id="hank-detail-title">{name}</h2>
                    <div className="hank-question-quote"><span>Your question</span><p>{query}</p></div>
                    <div className="hank-reply-box">
                        <div className="hank-reply-heading"><HankMark size={25} /><strong>Hank found this passage</strong></div>
                        <p>{result.content}</p>
                    </div>
                    <div className="hank-why-block">
                        <div className="hank-why-title"><CircleHelp size={15} /> WHY THIS SOURCE</div>
                        <p>This passage was retrieved from <strong>{name}</strong> using {mode} search for your question. It is shown as a source excerpt so you can verify the information in its original context.</p>
                        <div className="hank-citation-line"><BookOpen size={14} /> Citation: {name}{page ? `, page ${page}` : `, chunk ${(chunk ?? 0) + 1}`}</div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default function AskPage() {
    const { demoRole } = useAuth()
    const { toast } = useToast()
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [query, setQuery] = useState(() => searchParams.get('q') || '')
    const [searchMode, setSearchMode] = useState('hybrid')
    const [results, setResults] = useState([])
    const [searchInfo, setSearchInfo] = useState(null)
    const [view, setView] = useState('landing')
    const [step, setStep] = useState(0)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState('')
    const [filter, setFilter] = useState('All')
    const [selectedResult, setSelectedResult] = useState(null)
    const [listening, setListening] = useState(false)
    const [voiceNotice, setVoiceNotice] = useState('')
    const questionRef = useRef(null)
    const recognitionRef = useRef(null)
    const voiceBaseRef = useRef('')
    const finalTranscriptRef = useRef('')
    const closeResult = useCallback(() => setSelectedResult(null), [])

    useEffect(() => {
        const textarea = questionRef.current
        if (!textarea) return
        textarea.style.height = 'auto'
        const nextHeight = Math.min(textarea.scrollHeight, 220)
        textarea.style.height = `${nextHeight}px`
        textarea.style.overflowY = textarea.scrollHeight > 220 ? 'auto' : 'hidden'
    }, [query])

    useEffect(() => {
        if (!location.state?.focusComposer) return
        questionRef.current?.focus()
        navigate(location.pathname, { replace: true, state: null })
    }, [location.pathname, location.state, navigate])

    useEffect(() => () => {
        const recognition = recognitionRef.current
        if (recognition) {
            recognition.onstart = null
            recognition.onresult = null
            recognition.onerror = null
            recognition.onend = null
            recognition.abort()
        }
    }, [])

    const runSearch = useCallback(async (searchQuery, mode) => {
        const cleanQuery = searchQuery.trim()
        if (!cleanQuery) return
        setError('')
        setSubmitted(cleanQuery)
        setSearchInfo(null)
        setResults([])
        setStep(0)
        setView('processing')

        let stepTimer
        try {
            const minAnimation = new Promise((resolve) => setTimeout(resolve, 850))
            stepTimer = setInterval(() => setStep((current) => Math.min(current + 1, 2)), 420)
            const [{ data }] = await Promise.all([
                api.get('/search', { params: { q: cleanQuery, mode } }),
                minAnimation,
            ])
            setResults(Array.isArray(data.results) ? data.results : [])
            const resultCount = Array.isArray(data.results) ? data.results.length : 0
            toast({
                title: resultCount ? `Found ${resultCount} ${resultCount === 1 ? 'source' : 'sources'}` : 'No matching sources found',
                description: resultCount ? 'Hank found passages in your knowledge base.' : 'Try another question or add more documents.',
                variant: resultCount ? 'success' : 'info',
            })
            setSearchInfo({ mode: data.retrievalMode || mode, degraded: Boolean(data.degraded), message: data.message || '' })
            setFilter('All')
            setView('results')
        } catch (err) {
            const message = err.response?.data?.error?.message || 'Hank could not search the knowledge base. Please try again.'
            setError(message)
            toast({ title: 'Search could not complete', description: message, variant: 'error' })
            setView('landing')
        } finally {
            clearInterval(stepTimer)
        }
    }, [toast])

    const linkedQuery = searchParams.get('q')
    useEffect(() => {
        if (!linkedQuery?.trim()) return
        // A query parameter is an external navigation event that should start a search.
        // oxlint-disable-next-line react/set-state-in-effect
        void runSearch(linkedQuery, 'hybrid')
    }, [linkedQuery, runSearch])

    const handleSubmit = (event) => {
        event.preventDefault()
        void runSearch(query, searchMode)
    }

    const toggleVoiceInput = () => {
        if (listening) {
            recognitionRef.current?.stop()
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            setVoiceNotice('Voice input is not supported in this browser. You can type your question instead.')
            return
        }

        setVoiceNotice('')
        voiceBaseRef.current = query.trim()
        finalTranscriptRef.current = ''
        const recognition = new SpeechRecognition()
        recognition.lang = navigator.language || 'en-US'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onstart = () => setListening(true)
        recognition.onresult = (event) => {
            let interimTranscript = ''
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const transcript = event.results[index][0].transcript.trim()
                if (event.results[index].isFinal) {
                    finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim()
                } else {
                    interimTranscript = `${interimTranscript} ${transcript}`.trim()
                }
            }
            const transcript = `${finalTranscriptRef.current} ${interimTranscript}`.trim()
            setQuery([voiceBaseRef.current, transcript].filter(Boolean).join(voiceBaseRef.current ? '\n' : '').slice(0, 200))
        }
        recognition.onerror = (event) => {
            setListening(false)
            recognitionRef.current = null
            setVoiceNotice(event.error === 'not-allowed'
                ? 'Microphone access was blocked. Allow access in your browser settings to dictate a question.'
                : 'Voice input stopped. You can try again or type your question.')
        }
        recognition.onend = () => {
            setListening(false)
            recognitionRef.current = null
        }
        recognitionRef.current = recognition
        try {
            recognition.start()
        } catch {
            recognitionRef.current = null
            setListening(false)
            setVoiceNotice('Voice input could not start. You can try again or type your question.')
        }
    }

    const availableFilters = ['All', ...new Set(results.map((result) => getFileType(result.documentName || result.citation?.documentName)).filter((type) => type !== 'Document'))]
    const filteredResults = filter === 'All'
        ? results
        : results.filter((result) => getFileType(result.documentName || result.citation?.documentName) === filter)

    if (view === 'processing') {
        const steps = ['Reading your question', 'Searching your organization’s documents', 'Preparing source citations']
        return (
            <section className="hank-processing" aria-live="polite">
                <HankMark size={58} />
                <div className="hank-processing-ticket"><span>YOUR QUESTION</span><strong>{submitted}</strong></div>
                <h1>Searching your knowledge…</h1>
                <p className="hank-processing-copy">{steps[step]}</p>
                <div className="hank-progress-count">{Math.min(step + 1, steps.length)} of {steps.length} steps</div>
                <div className="hank-progress-track" aria-label={`${step + 1} of ${steps.length} steps complete`}>
                    {steps.map((label, index) => <span key={label} className={index <= step ? 'done' : ''} />)}
                </div>
                <div className="hank-consulting">
                    <span>CONSULTING SOURCES</span>
                    <p><LoaderCircle size={15} /> Searching your knowledge base…</p>
                </div>
            </section>
        )
    }

    if (view === 'results') {
        return (
            <section className="hank-results-view">
                <header className="hank-results-header">
                    <div className="hank-results-heading">
                        <HankMark size={34} />
                        <div><h1>Hank found {results.length} {results.length === 1 ? 'source' : 'sources'}</h1><p>For “{submitted}” · {searchInfo?.mode || searchMode} search</p></div>
                    </div>
                    <button type="button" className="hank-new-question" onClick={() => { setView('landing'); setError(''); setSelectedResult(null) }}><ArrowLeft size={15} /> Ask another question</button>
                </header>
                {searchInfo?.message && <div className={`hank-search-notice${searchInfo.degraded ? ' degraded' : ''}`}><AlertCircle size={15} />{searchInfo.message}</div>}
                <div className="hank-results-toolbar">
                    <div className="hank-filter-tabs" role="group" aria-label="Filter source results">
                        {availableFilters.map((item) => <button type="button" key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>)}
                    </div>
                    <span className="hank-result-count">{filteredResults.length} {filteredResults.length === 1 ? 'source' : 'sources'}</span>
                </div>
                <div className="hank-section-label"><Layers3 size={16} /><strong>Relevant passages</strong><span>{filteredResults.length}</span></div>
                {filteredResults.length ? (
                    <div className="hank-results-grid">{filteredResults.map((result, index) => <CitationCard key={result.chunkId || `${result.documentId}-${index}`} result={result} index={index} onOpen={setSelectedResult} />)}</div>
                ) : (
                    <div className="hank-empty-results"><Search size={23} /><h2>No matching passages found</h2><p>Try a different question, or add more documents to your knowledge base.</p><button type="button" onClick={() => { setView('landing'); setQuery('') }}>Ask Hank another question</button></div>
                )}
                {selectedResult && <DetailDialog result={selectedResult} query={submitted} mode={searchInfo?.mode || searchMode} onClose={closeResult} />}
            </section>
        )
    }

    return (
        <section className="hank-landing">
            <div className="hank-hero-mark"><HankMark size={58} /></div>
            <h1>Ask Hank about your knowledge base</h1>
            <p className="hank-hero-subtitle">Ask a question and Hank will find the most relevant passages in your organization’s documents.</p>
            <form className={`hank-composer${listening ? ' is-listening' : ''}`} onSubmit={handleSubmit} aria-busy={listening}>
                <label className="sr-only" htmlFor="hank-question">Ask your knowledge base</label>
                <textarea ref={questionRef} id="hank-question" aria-describedby="hank-enter-hint" value={query} onChange={(event) => { setQuery(event.target.value); setVoiceNotice('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Ask Hank anything…" maxLength={200} />
                <div className="hank-composer-bottom">
                    <div className="hank-composer-options">
                        {demoRole !== 'guest' && <NavLinkUpload />}
                        <label className="hank-mode-select">Search mode
                            <select aria-label="Search mode" value={searchMode} onChange={(event) => setSearchMode(event.target.value)}>
                                <option value="hybrid">Hybrid</option><option value="semantic">Semantic</option><option value="keyword">Keyword</option>
                            </select>
                        </label>
                    </div>
                    <div className="hank-composer-actions">
                        <button className={`hank-mic-button${listening ? ' is-listening' : ''}`} type="button" aria-label={listening ? 'Stop voice input' : 'Start voice input'} aria-pressed={listening} title={listening ? 'Stop voice input' : 'Dictate a question'} onClick={toggleVoiceInput}>
                            {listening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                        <RollingAskButton disabled={!query.trim()} />
                    </div>
                </div>
            </form>
            {voiceNotice && <p className="hank-voice-notice" role="status">{voiceNotice}</p>}
            {listening && <p className="hank-voice-listening" role="status"><span /> Listening… speak your question, then tap the microphone to stop.</p>}
            <p id="hank-enter-hint" className="hank-enter-hint">Press <kbd>Enter</kbd> to ask · <kbd>Shift + Enter</kbd> for a new line</p>
            {error && <div className="hank-error"><AlertCircle size={16} />{error}</div>}
            <div className="hank-suggestions"><span>TRY ASKING</span><div>{SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion} onClick={() => setQuery(suggestion)}>{suggestion}</button>)}</div></div>
            <p className="hank-landing-footnote">Hank searches your organization’s uploaded documents and shows the source for every match.</p>
        </section>
    )
}

function NavLinkUpload() {
    return <Link className="hank-upload-link" to="/knowledge-base"><Paperclip size={15} /> Add documents</Link>
}
