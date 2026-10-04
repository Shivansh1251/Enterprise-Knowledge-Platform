require('dotenv/config');

const prisma = require('../lib/prisma');
const {
    embedTexts,
    hasVectorStorage,
    isEmbeddingConfigured,
    storeEmbeddings,
} = require('../services/embeddings');

const BATCH_SIZE = 64;

async function main() {
    if (!isEmbeddingConfigured()) {
        throw new Error('Set OPENAI_API_KEY before running the embedding backfill.');
    }
    if (!await hasVectorStorage()) {
        throw new Error('Apply the pgvector migration before running the embedding backfill.');
    }

    let embeddedCount = 0;
    while (true) {
        const chunks = await prisma.documentChunk.findMany({
            where: {
                embeddingModel: null,
                document: { status: 'READY' },
            },
            select: { id: true, content: true },
            orderBy: { id: 'asc' },
            take: BATCH_SIZE,
        });
        if (chunks.length === 0) break;

        const vectors = await embedTexts(chunks.map((chunk) => chunk.content));
        await storeEmbeddings(chunks.map((chunk, index) => ({
            id: chunk.id,
            embedding: vectors[index],
        })));
        embeddedCount += chunks.length;
        console.log(`Embedded ${embeddedCount} chunks.`);
    }

    console.log(`Embedding backfill complete. Updated ${embeddedCount} chunks.`);
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
