-- Rubric evidence: vector READ, UPDATE and DELETE, with no persistent changes.
-- Run the entire file in one connection. ROLLBACK restores both vectors and metadata.
BEGIN;

CREATE TEMP TABLE autohubiq_vector_rud_sample ON COMMIT DROP AS
SELECT listing_id, embedding
FROM app.listing_embeddings
ORDER BY listing_id
LIMIT 2;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM autohubiq_vector_rud_sample) < 2 THEN
        RAISE EXCEPTION 'Generate at least two listing embeddings before this demonstration';
    END IF;
END;
$$;

-- READ: nearest listings to a stored reference vector; this is similarity to
-- an existing listing. The application embeds natural-language queries separately.
SELECT e.listing_id, ald.manufacturer_name, ald.model_name,
       vector_dims(e.embedding) AS dimensions,
       1 - (e.embedding <=> reference.embedding) AS similarity
FROM app.listing_embeddings e
JOIN app.active_listing_details ald ON ald.listing_id = e.listing_id
CROSS JOIN (
    SELECT embedding FROM autohubiq_vector_rud_sample ORDER BY listing_id LIMIT 1
) reference
ORDER BY e.embedding <=> reference.embedding, e.listing_id
LIMIT 5;

-- UPDATE: temporarily replace one vector with the other stored sample vector.
-- This synthetic replacement demonstrates the operation, not production re-embedding.
UPDATE app.listing_embeddings
SET embedding = (SELECT embedding FROM autohubiq_vector_rud_sample ORDER BY listing_id DESC LIMIT 1),
    generated_at = CURRENT_TIMESTAMP
WHERE listing_id = (SELECT MIN(listing_id) FROM autohubiq_vector_rud_sample)
RETURNING listing_id, vector_dims(embedding) AS updated_dimensions;

-- DELETE: remove the same sample vector within this transaction only.
DELETE FROM app.listing_embeddings
WHERE listing_id = (SELECT MIN(listing_id) FROM autohubiq_vector_rud_sample)
RETURNING listing_id AS temporarily_deleted_listing_id;

SELECT COUNT(*) AS remaining_sample_vectors
FROM app.listing_embeddings
WHERE listing_id IN (SELECT listing_id FROM autohubiq_vector_rud_sample);

ROLLBACK;

-- All original vectors, metadata, and row counts are restored.
SELECT COUNT(*) AS restored_embedding_count FROM app.listing_embeddings;
