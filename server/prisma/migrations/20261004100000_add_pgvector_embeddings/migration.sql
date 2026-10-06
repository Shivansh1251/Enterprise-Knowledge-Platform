CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "document_chunks"
ADD COLUMN "embedding" vector(1536),
ADD COLUMN "embedding_model" TEXT;

CREATE INDEX "document_chunks_embedding_model_idx"
ON "document_chunks"("embedding_model");

CREATE INDEX "document_chunks_embedding_hnsw_idx"
ON "document_chunks"
USING hnsw ("embedding" vector_cosine_ops)
WHERE "embedding" IS NOT NULL;
