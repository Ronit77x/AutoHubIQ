BEGIN;

-- Model-year/powertrain references, never measurements of an individual used car.
CREATE TABLE IF NOT EXISTS app.fuel_economy_references (
    variant_id BIGINT NOT NULL REFERENCES app.vehicle_variants(variant_id),
    model_year SMALLINT NOT NULL CHECK (model_year BETWEEN 1990 AND 2100),
    value_low NUMERIC(6,2) NOT NULL CHECK (value_low > 0),
    value_high NUMERIC(6,2) NOT NULL CHECK (value_high >= value_low),
    unit TEXT NOT NULL CHECK (unit IN ('kmpl', 'km/kg', 'km/charge')),
    basis TEXT NOT NULL CHECK (basis IN ('advertised_reference', 'owner_reported_reference')),
    source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
    secondary_source_url TEXT CHECK (secondary_source_url LIKE 'https://%'),
    reference_trim TEXT NOT NULL,
    notes TEXT NOT NULL,
    checked_on DATE NOT NULL,
    PRIMARY KEY (variant_id, model_year)
);

COMMENT ON TABLE app.fuel_economy_references IS
  'Researched reference figures by model year and powertrain. Not verified economy of the listed vehicle; generic catalogue variants can cover multiple trims.';

COMMIT;
