import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { Search, FileText, Loader2, BookOpen } from 'lucide-react'

export default function AskPage() {
    const [searchParams] = useSearchParams()
    const [query, setQuery] = useState('')
    const [searchMode, setSearchMode] = useState('hybrid')
    const [results, setResults] = useState(null)
    const [searchInfo, setSearchInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState('')

    const runSearch = useCallback(async (searchQuery, mode) => {
        if (!searchQuery.trim()) return
        setLoading(true)
        setError('')
        setResults(null)
        setSearchInfo(null)
        setSubmitted(searchQuery.trim())
        try {
            const { data } = await api.get('/search', {
                params: { q: searchQuery.trim(), mode },
            })
            setResults(data.results)
            setSearchInfo({
                mode: data.retrievalMode,
                degraded: data.degraded,
                message: data.message,
            })
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Search failed')
        } finally {
            setLoading(false)
        }
    }, [])

    const linkedQuery = searchParams.get('q')
    useEffect(() => {
        if (!linkedQuery?.trim()) return
        setQuery(linkedQuery)
        void runSearch(linkedQuery, 'hybrid')
    }, [linkedQuery, runSearch])

    const handleSearch = (event) => {
        event.preventDefault()
        void runSearch(query, searchMode)
    }

    return (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: 'var(--accent-green-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                }}>
                    <BookOpen size={28} color="var(--accent-green)" />
                </div>
                <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                    Ask your knowledge base
                </h1>
                <p style={{ margin: 0, fontSize: 16, color: 'var(--text-secondary)' }}>
                    Search across all your organization's documents instantly
                </p>
            </div>

            {/* Search form */}
            <form onSubmit={handleSearch} style={{
                display: 'flex', gap: 10, marginBottom: 40,
                background: '#fff', borderRadius: 16,
                padding: 8,
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
            }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        id="ask-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="What is our leave policy?"
                        style={{
                            width: '100%', padding: '14px 14px 14px 44px',
                            border: 'none', outline: 'none',
                            fontSize: 16, fontFamily: 'inherit',
                            color: 'var(--text-primary)', background: 'transparent',
                        }}
                    />
                </div>
                <button type="submit" disabled={loading || !query.trim()} style={{
                    padding: '0 24px',
                    background: !query.trim() || loading ? 'var(--accent-green-light)' : 'var(--accent-green)',
                    color: !query.trim() || loading ? 'var(--accent-green)' : '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                }}>
                    {loading ? <Loader2 size={16} /> : <Search size={16} />}
                    {loading ? 'Searching...' : 'Ask'}
                </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -28, marginBottom: 32 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Search mode
                    <select
                        aria-label="Search mode"
                        value={searchMode}
                        onChange={(e) => setSearchMode(e.target.value)}
                        style={{
                            padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8,
                            background: '#fff', color: 'var(--text-primary)', font: 'inherit',
                        }}
                    >
                        <option value="hybrid">Hybrid</option>
                        <option value="semantic">Semantic</option>
                        <option value="keyword">Keyword</option>
                    </select>
                </label>
            </div>

            {/* Suggestions */}
            {results === null && !loading && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {['leave policy', 'onboarding process', 'expense reimbursement', 'code of conduct'].map((s) => (
                        <button key={s} onClick={() => setQuery(s)} style={{
                            padding: '8px 16px',
                            background: '#fff', border: '1px solid var(--border)',
                            borderRadius: 999, fontSize: 13, color: 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'var(--accent-red-light)', color: 'var(--accent-red)',
                    fontSize: 14, border: '1px solid #fca5a5',
                }}>
                    {error}
                </div>
            )}

            {/* Results */}
            {results !== null && (
                <div>
                    {searchInfo && (
                        <div style={{
                            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
                            background: searchInfo.degraded ? 'var(--accent-amber-light)' : 'var(--accent-green-light)',
                            color: searchInfo.degraded ? 'var(--accent-amber)' : 'var(--accent-green)',
                            fontSize: 13,
                        }}>
                            {searchInfo.message || `${searchInfo.mode[0].toUpperCase()}${searchInfo.mode.slice(1)} retrieval`}
                        </div>
                    )}
                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Search results for</p>
                            <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                                "{submitted}"
                            </h2>
                        </div>
                        <span style={{
                            background: 'var(--accent-green-light)', color: 'var(--accent-green)',
                            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                        }}>
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {results.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '48px 24px',
                            background: '#fff', borderRadius: 16, border: '1px solid var(--border)',
                        }}>
                            <FileText size={32} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>
                                No results found. Try different keywords or upload more documents.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {results.map((r) => (
                                <div key={r.chunkId} style={{
                                    background: '#fff', borderRadius: 14,
                                    border: '1px solid var(--border)',
                                    padding: '20px 24px',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'box-shadow 0.15s ease',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                                >
                                    {/* Source */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 7,
                                            background: 'var(--accent-green-light)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <FileText size={13} color="var(--accent-green)" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {r.documentName}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {r.pageNumber ? `Page ${r.pageNumber} · ` : ''}Chunk {r.chunkIndex + 1}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Excerpt */}
                                    <p style={{
                                        margin: 0, fontSize: 14, lineHeight: 1.7,
                                        color: 'var(--text-secondary)',
                                    }}>
                                        {r.content.length > 320 ? r.content.slice(0, 320) + '…' : r.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
