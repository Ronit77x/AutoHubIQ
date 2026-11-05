
-- =====================================================
-- AutoHubIQ
-- File: 04_create_dealer_profiles.sql
-- Purpose: Store dealership-specific information
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS app.dealer_profiles (

    dealer_id BIGINT GENERATED ALWAYS AS IDENTITY,

    user_id BIGINT NOT NULL,

    city_id SMALLINT NOT NULL,

    dealership_name VARCHAR(150) NOT NULL,

    business_phone VARCHAR(20),

    business_email VARCHAR(255),

    street_address TEXT NOT NULL,

    description TEXT,

    verification_status VARCHAR(20)
        NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_dealer_profiles
        PRIMARY KEY (dealer_id),

    CONSTRAINT uq_dealer_profiles_user
        UNIQUE (user_id),

    CONSTRAINT fk_dealer_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES app.users(user_id),

    CONSTRAINT fk_dealer_profiles_city
        FOREIGN KEY (city_id)
        REFERENCES app.cities(city_id),

    CONSTRAINT chk_dealer_verification_status
        CHECK (
            verification_status IN (
                'pending',
                'verified',
                'rejected'
            )
        )
);

-- Index for finding dealerships by city.
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_city
ON app.dealer_profiles(city_id);

COMMIT;
