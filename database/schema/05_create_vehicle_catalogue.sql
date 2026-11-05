
-- =====================================================
-- AutoHubIQ
-- File: 05_create_vehicle_catalogue.sql
-- Purpose: Create the vehicle catalogue
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- TABLE 1: MANUFACTURERS
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.manufacturers (

    manufacturer_id SMALLINT GENERATED ALWAYS AS IDENTITY,

    manufacturer_name VARCHAR(100) NOT NULL,

    country_of_origin VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_manufacturers
        PRIMARY KEY (manufacturer_id),

    CONSTRAINT uq_manufacturer_name
        UNIQUE (manufacturer_name)
);


-- -----------------------------------------------------
-- TABLE 2: VEHICLE MODELS
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.vehicle_models (

    model_id BIGINT GENERATED ALWAYS AS IDENTITY,

    manufacturer_id SMALLINT NOT NULL,

    model_name VARCHAR(120) NOT NULL,

    body_type VARCHAR(30) NOT NULL,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle_models
        PRIMARY KEY (model_id),

    CONSTRAINT fk_vehicle_models_manufacturer
        FOREIGN KEY (manufacturer_id)
        REFERENCES app.manufacturers(manufacturer_id),

    CONSTRAINT uq_manufacturer_model
        UNIQUE (manufacturer_id, model_name),

    CONSTRAINT chk_vehicle_body_type
        CHECK (
            body_type IN (
                'Hatchback',
                'Sedan',
                'SUV',
                'MUV',
                'Coupe',
                'Convertible',
                'Pickup',
                'Other'
            )
        )
);


-- -----------------------------------------------------
-- TABLE 3: VEHICLE VARIANTS
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.vehicle_variants (

    variant_id BIGINT GENERATED ALWAYS AS IDENTITY,

    model_id BIGINT NOT NULL,

    variant_name VARCHAR(120) NOT NULL,

    fuel_type VARCHAR(20) NOT NULL,

    transmission VARCHAR(20) NOT NULL,

    engine_displacement_cc INTEGER,

    battery_capacity_kwh NUMERIC(6,2),

    seating_capacity SMALLINT NOT NULL DEFAULT 5,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle_variants
        PRIMARY KEY (variant_id),

    CONSTRAINT fk_vehicle_variants_model
        FOREIGN KEY (model_id)
        REFERENCES app.vehicle_models(model_id),

    CONSTRAINT uq_model_variant
        UNIQUE (model_id, variant_name),

    CONSTRAINT chk_variant_fuel_type
        CHECK (
            fuel_type IN (
                'Petrol',
                'Diesel',
                'CNG',
                'LPG',
                'Electric',
                'Hybrid'
            )
        ),

    CONSTRAINT chk_variant_transmission
        CHECK (
            transmission IN (
                'Manual',
                'Automatic',
                'AMT',
                'CVT',
                'DCT',
                'Single-speed'
            )
        ),

    CONSTRAINT chk_engine_displacement
        CHECK (
            engine_displacement_cc IS NULL
            OR engine_displacement_cc > 0
        ),

    CONSTRAINT chk_battery_capacity
        CHECK (
            battery_capacity_kwh IS NULL
            OR battery_capacity_kwh > 0
        ),

    CONSTRAINT chk_seating_capacity
        CHECK (seating_capacity BETWEEN 1 AND 20)
);


-- -----------------------------------------------------
-- INDEXES
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_vehicle_models_manufacturer
ON app.vehicle_models(manufacturer_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_variants_model
ON app.vehicle_variants(model_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_variants_fuel
ON app.vehicle_variants(fuel_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_variants_transmission
ON app.vehicle_variants(transmission);

COMMIT;
