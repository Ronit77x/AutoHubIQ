
CREATE TABLE IF NOT EXISTS app.listing_price_estimates (
    estimate_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    listing_id BIGINT NOT NULL
        REFERENCES app.vehicle_listings(listing_id)
        ON DELETE CASCADE,

    estimated_price NUMERIC(12, 2) NOT NULL,
    lower_price NUMERIC(12, 2),
    upper_price NUMERIC(12, 2),

    methodology TEXT NOT NULL,
    source_summary TEXT,
    source_url TEXT,

    assessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_estimated_price_positive
        CHECK (estimated_price > 0),

    CONSTRAINT chk_price_range
        CHECK (
            (lower_price IS NULL OR lower_price > 0)
            AND
            (upper_price IS NULL OR upper_price > 0)
            AND
            (lower_price IS NULL OR upper_price IS NULL
                OR lower_price <= upper_price)
        )
);

CREATE INDEX IF NOT EXISTS idx_price_estimates_listing
ON app.listing_price_estimates(listing_id, assessed_at DESC);
