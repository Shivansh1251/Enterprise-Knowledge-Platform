const prisma = require('../lib/prisma');
const { sendError } = require('../utils/errors');
const {
    embedTexts,
    hasVectorStorage,
    isEmbeddingConfigured,
    searchSimilarChunks,
} = require('../services/embeddings');

const RESULT_LIMIT = 10;
const CANDIDATE_LIMIT = 40;
const VALID_MODES = new Set(['hybrid', 'semantic', 'keyword']);
const SEARCH_STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'can', 'do', 'does', 'for', 'how',
    'i', 'in', 'is', 'it', 'of', 'on', 'our', 'the', 'to', 'we', 'what',
    'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

function withCitation(result) {
    return {
        ...result,
        citation: {
            documentId: result.documentId,
            documentName: result.documentName,
            pageNumber: result.pageNumber,
            chunkId: result.chunkId,
            chunkIndex: result.chunkIndex,
        },
    };
}

function countOccurrences(content, term) {
    const normalizedContent = content.toLocaleLowerCase();
    const normalizedTerm = term.toLocaleLowerCase();
    let count = 0;
    let offset = 0;
    while ((offset = normalizedContent.indexOf(normalizedTerm, offset)) !== -1) {
        count += 1;
        offset += normalizedTerm.length;
    }
    return count;
}

async function searchKeywords(query, organizationId) {
    const allTerms = [...new Set((query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []))];
    const usefulTerms = allTerms.filter((term) => !SEARCH_STOP_WORDS.has(term));
    const terms = (usefulTerms.length ? usefulTerms : allTerms).slice(0, 20);
    const chunks = await prisma.documentChunk.findMany({
        where: {
            OR: terms.map((term) => ({ content: { contains: term, mode: 'insensitive' } })),
            document: { organizationId, status: 'READY' },
        },
        select: {
            id: true,
            documentId: true,
            chunkIndex: true,
            content: true,
            pageNumber: true,
            document: { select: { id: true, name: true } },
        },
        take: CANDIDATE_LIMIT,
        orderBy: [{ documentId: 'asc' }, { chunkIndex: 'asc' }],
    });

    return chunks.map((chunk) => ({
        documentId: chunk.document.id,
        documentName: chunk.document.name,
        chunkId: chunk.id,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        lexicalScore: terms.reduce((score, term) => {
            const occurrences = countOccurrences(chunk.content, term);
            return score + (occurrences ? 3 + Math.min(occurrences, 4) : 0);
        }, 0),
    })).sort((left, right) => right.lexicalScore - left.lexicalScore || left.chunkIndex - right.chunkIndex);
}

async function searchSemantically(query, organizationId) {
    const [queryEmbedding] = await embedTexts([query]);
    return searchSimilarChunks({
        organizationId,
        embedding: queryEmbedding,
        limit: CANDIDATE_LIMIT,
    });
}

function reciprocalRankFuse(keywordResults, semanticResults) {
    const fused = new Map();
    const addRankedResults = (results) => {
        results.forEach((result, index) => {
            const existing = fused.get(result.chunkId) || { ...result, rankScore: 0 };
            existing.rankScore += 1 / (60 + index + 1);
            if (result.semanticScore !== undefined) existing.semanticScore = result.semanticScore;
            fused.set(result.chunkId, existing);
        });
    };

    addRankedResults(keywordResults);
    addRankedResults(semanticResults);

    return [...fused.values()]
        .sort((left, right) => right.rankScore - left.rankScore)
        .slice(0, RESULT_LIMIT)
        .map(({ lexicalScore, ...result }) => withCitation({
            ...result,
            rankScore: Number(result.rankScore.toFixed(6)),
        }));
}

function semanticUnavailableMessage() {
    if (!isEmbeddingConfigured()) {
        return 'Set OPENAI_API_KEY and apply the pgvector migration to enable semantic search.';
    }
    return 'Apply the pgvector migration to enable semantic search.';
}

/** Search sources for a chat turn using the selected retrieval mode. */
async function retrieveForChat(query, organizationId, mode = 'hybrid') {
    const keywordResults = await searchKeywords(query, organizationId);
    const keywordResponse = (degraded = false, message = '') => ({
        retrievalMode: 'keyword',
        degraded,
        message,
        results: keywordResults.slice(0, RESULT_LIMIT)
            .map(({ lexicalScore, ...result }) => withCitation(result)),
    });

    if (mode === 'keyword') return keywordResponse(false, '');

    const embeddingsReady = isEmbeddingConfigured() && await hasVectorStorage();
    if (!embeddingsReady) return keywordResponse(true, `${semanticUnavailableMessage()} Showing keyword matches.`);

    try {
        if (mode === 'semantic') {
            const results = (await searchSemantically(query, organizationId)).slice(0, RESULT_LIMIT)
                .map((result) => withCitation(result));
            return { retrievalMode: 'semantic', degraded: false, message: '', results };
        }

        const semanticResults = await searchSemantically(query, organizationId);
        return {
            retrievalMode: 'hybrid',
            degraded: false,
            message: '',
            results: reciprocalRankFuse(keywordResults, semanticResults),
        };
    } catch (error) {
        console.error('Chat source retrieval failed:', error.message);
        return keywordResponse(true, 'Semantic retrieval is unavailable. Showing keyword matches.');
    }
}

/** GET /search?q=query&mode=hybrid|semantic|keyword */
const search = async (req, res, next) => {
    try {
        if (typeof req.query.q !== 'string') {
            return sendError(res, 'MISSING_QUERY', 'Provide one non-empty q query parameter', 400);
        }

        const query = req.query.q.trim();
        if (!query || query.length > 200) {
            return sendError(res, 'INVALID_QUERY', 'Search queries must be between 1 and 200 characters', 400);
        }

        const mode = req.query.mode ?? 'hybrid';
        if (typeof mode !== 'string' || !VALID_MODES.has(mode)) {
            return sendError(res, 'INVALID_SEARCH_MODE', 'mode must be hybrid, semantic, or keyword', 400);
        }

        if (mode === 'keyword') {
            const results = (await searchKeywords(query, req.organizationId))
                .slice(0, RESULT_LIMIT)
                .map(({ lexicalScore, ...result }) => withCitation(result));
            return res.json({ query, retrievalMode: 'keyword', degraded: false, results });
        }

        const embeddingsReady = isEmbeddingConfigured() && await hasVectorStorage();
        if (!embeddingsReady) {
            const message = semanticUnavailableMessage();
            if (mode === 'semantic') {
                return sendError(res, 'SEMANTIC_SEARCH_UNAVAILABLE', message, 503);
            }
            const results = (await searchKeywords(query, req.organizationId))
                .slice(0, RESULT_LIMIT)
                .map(({ lexicalScore, ...result }) => withCitation(result));
            return res.json({
                query,
                retrievalMode: 'keyword',
                degraded: true,
                message: `${message} Showing keyword matches for now.`,
                results,
            });
        }

        if (mode === 'semantic') {
            const results = (await searchSemantically(query, req.organizationId)).slice(0, RESULT_LIMIT)
                .map((result) => withCitation(result));
            return res.json({ query, retrievalMode: 'semantic', degraded: false, results });
        }

        const keywordResults = await searchKeywords(query, req.organizationId);
        try {
            const semanticResults = await searchSemantically(query, req.organizationId);
            const results = reciprocalRankFuse(keywordResults, semanticResults);
            return res.json({ query, retrievalMode: 'hybrid', degraded: false, results });
        } catch (embeddingError) {
            console.error('Hybrid semantic retrieval failed:', embeddingError.message);
            const results = keywordResults.slice(0, RESULT_LIMIT)
                .map(({ lexicalScore, ...result }) => withCitation(result));
            return res.json({
                query,
                retrievalMode: 'keyword',
                degraded: true,
                message: 'Semantic retrieval is temporarily unavailable. Showing keyword matches for now.',
                results,
            });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = { retrieveForChat, search };
