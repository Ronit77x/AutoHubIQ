BEGIN;

-- Images live with the database so uploads survive application redeployments.
CREATE TABLE IF NOT EXISTS app.listing_image_data (
    image_id BIGINT PRIMARY KEY REFERENCES app.listing_images(image_id) ON DELETE CASCADE,
    content BYTEA NOT NULL CHECK (octet_length(content) <= 2097152),
    content_type TEXT NOT NULL DEFAULT 'image/jpeg' CHECK (content_type = 'image/jpeg')
);

CREATE TABLE IF NOT EXISTS app.listing_enquiries (
    enquiry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES app.vehicle_listings(listing_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app.users(user_id),
    message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 2000),
    phone VARCHAR(20),
    request_type TEXT NOT NULL CHECK (request_type IN ('enquiry', 'test_drive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing_created ON app.listing_enquiries(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_user_created ON app.listing_enquiries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app.request_limits (
    key_hash TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL
);

COMMIT;
