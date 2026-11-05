
-- =====================================================
-- AutoHubIQ
-- File: 06_create_inventory_tables.sql
-- Purpose: Create used-car inventory and listings
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- TABLE 1: VEHICLES
-- Stores the physical used-car details
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.vehicles (

    vehicle_id BIGINT GENERATED ALWAYS AS IDENTITY,

    dealer_id BIGINT NOT NULL,

    variant_id BIGINT NOT NULL,

    manufacturing_year SMALLINT NOT NULL,

    registration_year SMALLINT,

    kms_driven INTEGER NOT NULL,

    colour VARCHAR(40),

    ownership_count SMALLINT NOT NULL DEFAULT 1,

    condition VARCHAR(20) NOT NULL DEFAULT 'good',

    registration_number VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicles
        PRIMARY KEY (vehicle_id),

    CONSTRAINT fk_vehicles_dealer
        FOREIGN KEY (dealer_id)
        REFERENCES app.dealer_profiles(dealer_id),

    CONSTRAINT fk_vehicles_variant
        FOREIGN KEY (variant_id)
        REFERENCES app.vehicle_variants(variant_id),

    CONSTRAINT chk_manufacturing_year
        CHECK (manufacturing_year BETWEEN 1990 AND 2030),

    CONSTRAINT chk_registration_year
        CHECK (
            registration_year IS NULL
            OR registration_year BETWEEN 1990 AND 2030
        ),

    CONSTRAINT chk_kms_driven
        CHECK (kms_driven >= 0),

    CONSTRAINT chk_ownership_count
        CHECK (ownership_count BETWEEN 1 AND 10),

    CONSTRAINT chk_vehicle_condition
        CHECK (
            condition IN (
                'excellent',
                'good',
                'fair',
                'needs_repair'
            )
        )
);


-- -----------------------------------------------------
-- TABLE 2: VEHICLE LISTINGS
-- Stores marketplace listing information
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.vehicle_listings (

    listing_id BIGINT GENERATED ALWAYS AS IDENTITY,

    vehicle_id BIGINT NOT NULL,

    asking_price NUMERIC(12,2) NOT NULL,

    description TEXT NOT NULL,

    listing_status VARCHAR(20) NOT NULL DEFAULT 'draft',

    source_type VARCHAR(20) NOT NULL DEFAULT 'demo',

    source_url TEXT,

    source_verified_at TIMESTAMPTZ,

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle_listings
        PRIMARY KEY (listing_id),

    CONSTRAINT fk_vehicle_listings_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES app.vehicles(vehicle_id),

    CONSTRAINT chk_listing_price
        CHECK (asking_price > 0),

    CONSTRAINT chk_listing_status
        CHECK (
            listing_status IN (
                'draft',
                'active',
                'reserved',
                'sold',
                'withdrawn'
            )
        ),

    CONSTRAINT chk_listing_source
        CHECK (
            source_type IN (
                'demo',
                'dealer',
                'external_reference'
            )
        )
);


-- Only one active listing per physical vehicle.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_listing_per_vehicle
ON app.vehicle_listings(vehicle_id)
WHERE listing_status = 'active';


-- -----------------------------------------------------
-- TABLE 3: LISTING IMAGES
-- Each listing can have multiple images
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.listing_images (

    image_id BIGINT GENERATED ALWAYS AS IDENTITY,

    listing_id BIGINT NOT NULL,

    image_url TEXT NOT NULL,

    display_order SMALLINT NOT NULL DEFAULT 1,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_listing_images
        PRIMARY KEY (image_id),

    CONSTRAINT fk_listing_images_listing
        FOREIGN KEY (listing_id)
        REFERENCES app.vehicle_listings(listing_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_image_display_order
        CHECK (display_order > 0)
);


-- -----------------------------------------------------
-- INDEXES
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vehicles_dealer
ON app.vehicles(dealer_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_variant
ON app.vehicles(variant_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_year
ON app.vehicles(manufacturing_year);

CREATE INDEX IF NOT EXISTS idx_vehicles_kms
ON app.vehicles(kms_driven);

CREATE INDEX IF NOT EXISTS idx_listings_status
ON app.vehicle_listings(listing_status);

CREATE INDEX IF NOT EXISTS idx_listings_price
ON app.vehicle_listings(asking_price);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing
ON app.listing_images(listing_id);

COMMIT;
