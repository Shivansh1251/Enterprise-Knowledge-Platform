const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_BATCH_SIZE = 64;

function isEmbeddingConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
}

function vectorLiteral(vector) {
    if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected an embedding with ${EMBEDDING_DIMENSIONS} dimensions.`);
    }
    if (vector.some((value) => !Number.isFinite(value))) {
        throw new Error('Embedding contains a non-finite value.');
    }
    return `[${vector.join(',')}]`;
}

async function requestEmbeddingBatch(texts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
                signal: AbortSignal.timeout(45_000),
            });

            if (!response.ok) {
                const detail = await response.json().catch(() => ({}));
                const message = detail.error?.message || `Embeddings API returned ${response.status}.`;
                const error = new Error(message);
                error.retryable = response.status === 429 || response.status >= 500;
                throw error;
            }

            const payload = await response.json();
            if (!Array.isArray(payload.data) || payload.data.length !== texts.length) {
                throw new Error('Embeddings API returned an unexpected number of vectors.');
            }

            return texts.map((_, index) => {
                const item = payload.data.find((entry) => entry.index === index) || payload.data[index];
                const vector = item?.embedding;
                vectorLiteral(vector);
                return vector;
            });
        } catch (error) {
            lastError = error;
            if (error.retryable === false || attempt === 2) break;
            await new Promise((resolve) => setTimeout(resolve, 400 * (2 ** attempt)));
        }
    }

    throw lastError;
}

async function embedTexts(texts) {
    if (!isEmbeddingConfigured()) throw new Error('OPENAI_API_KEY is not configured.');
    if (!Array.isArray(texts) || texts.some((text) => typeof text !== 'string' || !text.trim())) {
        throw new Error('Embedding input must contain non-empty text strings.');
    }

    const vectors = [];
    for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
        vectors.push(...await requestEmbeddingBatch(batch));
    }
    return vectors;
}

async function storeEmbeddings(items) {
    for (let offset = 0; offset < items.length; offset += EMBEDDING_BATCH_SIZE) {
        const batch = items.slice(offset, offset + EMBEDDING_BATCH_SIZE);
        if (batch.length === 0) continue;

        const rows = batch.map(({ id, embedding }) => Prisma.sql`(
            ${id}::text,
            ${vectorLiteral(embedding)}::vector(${EMBEDDING_DIMENSIONS}),
            ${EMBEDDING_MODEL}::text
        )`);

        await prisma.$executeRaw(Prisma.sql`
            UPDATE "document_chunks" AS chunk
            SET "embedding" = input.embedding,
                "embedding_model" = input.model
            FROM (VALUES ${Prisma.join(rows)}) AS input(id, embedding, model)
            WHERE chunk.id = input.id
        `);
    }
}

async function hasVectorStorage() {
    const rows = await prisma.$queryRaw`
        SELECT
            EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
            AND EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'document_chunks'
                  AND column_name = 'embedding'
                  AND udt_name = 'vector'
            ) AS available
    `;
    return rows[0]?.available === true;
}

async function searchSimilarChunks({ organizationId, embedding, limit = 30 }) {
    const literal = vectorLiteral(embedding);
    return prisma.$queryRaw`
        SELECT
            chunk.id AS "chunkId",
            doc.id AS "documentId",
            doc.name AS "documentName",
            chunk.content AS "content",
            chunk.page_number AS "pageNumber",
            chunk.chunk_index AS "chunkIndex",
            1 - (chunk.embedding <=> ${literal}::vector(${EMBEDDING_DIMENSIONS})) AS "semanticScore"
        FROM "document_chunks" AS chunk
        INNER JOIN "documents" AS doc ON doc.id = chunk.document_id
        WHERE doc.organization_id = ${organizationId}
          AND doc.status = 'READY'
          AND chunk.embedding IS NOT NULL
          AND chunk.embedding_model = ${EMBEDDING_MODEL}
        ORDER BY chunk.embedding <=> ${literal}::vector(${EMBEDDING_DIMENSIONS})
        LIMIT ${limit}
    `;
}

module.exports = {
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    embedTexts,
    hasVectorStorage,
    isEmbeddingConfigured,
    searchSimilarChunks,
    storeEmbeddings,
};
