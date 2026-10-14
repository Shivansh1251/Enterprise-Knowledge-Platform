const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/errors');
const {
    embedTexts,
    hasVectorStorage,
    isEmbeddingConfigured,
    storeEmbeddings,
} = require('../services/embeddings');

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/** Split normalized text into overlapping chunks while preserving PDF page numbers. */
function chunkText(text, pageNumber = null) {
    const normalized = String(text || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim();
    const chunks = [];
    let start = 0;

    while (start < normalized.length) {
        let end = Math.min(start + CHUNK_SIZE, normalized.length);
        if (end < normalized.length) {
            const boundary = normalized.lastIndexOf(' ', end);
            if (boundary > start + CHUNK_SIZE * 0.6) end = boundary;
        }

        const content = normalized.slice(start, end).trim();
        if (content) chunks.push({ content, pageNumber });
        if (end >= normalized.length) break;
        start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }

    return chunks;
}

async function extractPages(document) {
    const buffer = await fs.promises.readFile(document.storagePath);

    if (document.mimeType === 'application/pdf') {
        if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
            throw new Error('The uploaded file is not a valid PDF.');
        }

        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.pages.map((page) => ({ text: page.text, pageNumber: page.num }));
        } finally {
            await parser.destroy();
        }
    }

    if (document.mimeType === 'text/plain') {
        return [{ text: buffer.toString('utf8'), pageNumber: null }];
    }

    throw new Error('Unsupported document type.');
}

const upload = async (req, res, next) => {
    if (!req.file) {
        return sendError(res, 'NO_FILE', 'No file was uploaded', 400);
    }

    let document;
    try {
        document = await prisma.$transaction(async (tx) => {
            const created = await tx.document.create({
                data: {
                    organizationId: req.organizationId,
                    uploadedBy: req.user.id,
                    name: req.file.displayName,
                    mimeType: req.file.mimetype,
                    storagePath: req.file.path,
                    status: 'PROCESSING',
                },
            });

            await tx.auditLog.create({
                data: {
                    organizationId: req.organizationId,
                    userId: req.user.id,
                    action: 'DOCUMENT_UPLOAD',
                    resource: 'document',
                    resourceId: created.id,
                },
            });

            return created;
        });
    } catch (err) {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return next(err);
    }

    void ingestDocument(document);
    return res.status(201).json({ id: document.id, status: document.status });
};

async function ingestDocument(document) {
    try {
        const pages = await extractPages(document);
        const chunks = pages.flatMap((page) => chunkText(page.text, page.pageNumber));

        if (chunks.length === 0) {
            throw new Error('No extractable text was found in the document.');
        }

        await prisma.documentChunk.createMany({
            data: chunks.map((chunk, index) => ({
                documentId: document.id,
                chunkIndex: index,
                content: chunk.content,
                pageNumber: chunk.pageNumber,
                metadata: {
                    documentId: document.id,
                    documentName: document.name,
                    organizationId: document.organizationId,
                    chunkIndex: index,
                    pageNumber: chunk.pageNumber,
                },
            })),
        });

        if (isEmbeddingConfigured()) {
            try {
                if (await hasVectorStorage()) {
                    const storedChunks = await prisma.documentChunk.findMany({
                        where: { documentId: document.id },
                        select: { id: true, content: true },
                        orderBy: { chunkIndex: 'asc' },
                    });
                    const BATCH_SIZE = 64;
                    for (let offset = 0; offset < storedChunks.length; offset += BATCH_SIZE) {
                        const batch = storedChunks.slice(offset, offset + BATCH_SIZE);
                        const vectors = await embedTexts(batch.map((chunk) => chunk.content));
                        await storeEmbeddings(batch.map((chunk, index) => ({
                            id: chunk.id,
                            embedding: vectors[index],
                        })));
                    }
                } else {
                    console.warn('Skipping document embeddings: pgvector migration is not available.');
                }
            } catch (embeddingError) {
                console.error('Embedding generation failed for', document.id, embeddingError.message);
            }
        }

        await prisma.document.update({
            where: { id: document.id },
            data: { status: 'READY' },
        });
    } catch (err) {
        console.error('Ingestion error for', document.id, err);
        try {
            await prisma.document.update({
                where: { id: document.id },
                data: { status: 'FAILED' },
            });
        } catch (statusError) {
            console.error('Could not mark document as failed:', document.id, statusError);
        }
    }
}

const list = async (req, res, next) => {
    try {
        const documents = await prisma.document.findMany({
            where: { organizationId: req.organizationId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                mimeType: true,
                status: true,
                createdAt: true,
                uploader: { select: { name: true, email: true } },
                _count: { select: { chunks: true } },
            },
        });
        return res.json({ documents });
    } catch (err) {
        return next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const document = await prisma.document.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
            select: {
                id: true,
                name: true,
                mimeType: true,
                status: true,
                createdAt: true,
                uploader: { select: { name: true, email: true } },
                _count: { select: { chunks: true } },
            },
        });
        if (!document) {
            return sendError(res, 'DOCUMENT_NOT_FOUND', 'Document was not found', 404);
        }
        return res.json({ document });
    } catch (err) {
        return next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const document = await prisma.document.findFirst({
            where: { id: req.params.id, organizationId: req.organizationId },
        });
        if (!document) {
            return sendError(res, 'DOCUMENT_NOT_FOUND', 'Document was not found', 404);
        }

        await prisma.$transaction(async (tx) => {
            await tx.auditLog.create({
                data: {
                    organizationId: req.organizationId,
                    userId: req.user.id,
                    action: 'DOCUMENT_DELETE',
                    resource: 'document',
                    resourceId: document.id,
                },
            });
            await tx.document.delete({ where: { id: document.id } });
        });

        if (document.storagePath) {
            await fs.promises.unlink(document.storagePath).catch((err) => {
                if (err.code !== 'ENOENT') console.error('Could not remove uploaded file:', err);
            });
        }
        return res.json({ message: 'Document deleted' });
    } catch (err) {
        return next(err);
    }
};

module.exports = { upload, list, getOne, remove };
