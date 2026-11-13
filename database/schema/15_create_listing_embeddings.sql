CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS app.listing_embeddings (
    listing_id BIGINT PRIMARY KEY
        REFERENCES app.vehicle_listings(listing_id)
        ON DELETE CASCADE,

    embedding VECTOR(384) NOT NULL,
    source_text TEXT NOT NULL,
    model_name TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listing_embeddings_cosine
ON app.listing_embeddings
USING hnsw (embedding vector_cosine_ops);
