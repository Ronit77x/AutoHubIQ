
-- =====================================================
-- AutoHubIQ
-- File: 02_create_core_tables.sql
-- Database: autohubiq
-- Schema: app
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- TABLE 1: CITIES
-- Stores the supported marketplace locations.
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.cities (
    city_id       SMALLINT GENERATED ALWAYS AS IDENTITY,
    city_name     VARCHAR(100) NOT NULL,
    state_name    VARCHAR(100) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_cities PRIMARY KEY (city_id),
    CONSTRAINT uq_cities_name_state UNIQUE (city_name, state_name)
);

-- -----------------------------------------------------
-- TABLE 2: USERS
-- Stores all registered application accounts.
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS app.users (
    user_id       BIGINT GENERATED ALWAYS AS IDENTITY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    password_hash TEXT NOT NULL,
    user_role     VARCHAR(20) NOT NULL DEFAULT 'customer',
    account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_users PRIMARY KEY (user_id),

    CONSTRAINT uq_users_email UNIQUE (email),

    CONSTRAINT chk_users_role
        CHECK (user_role IN ('customer', 'dealer', 'admin')),

    CONSTRAINT chk_users_status
        CHECK (account_status IN ('active', 'suspended', 'pending'))
);

-- Index for case-insensitive email lookups.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
ON app.users (LOWER(email));

COMMIT;
