BEGIN;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c
            ON c.oid = t.tgrelid
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'app'
          AND c.relname = 'vehicles'
          AND t.tgname = 'trg_vehicles_set_updated_at'
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_vehicles_set_updated_at
        BEFORE UPDATE ON app.vehicles
        FOR EACH ROW
        EXECUTE FUNCTION app.set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c
            ON c.oid = t.tgrelid
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'app'
          AND c.relname = 'vehicle_listings'
          AND t.tgname = 'trg_vehicle_listings_set_updated_at'
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_vehicle_listings_set_updated_at
        BEFORE UPDATE ON app.vehicle_listings
        FOR EACH ROW
        EXECUTE FUNCTION app.set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c
            ON c.oid = t.tgrelid
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'app'
          AND c.relname = 'dealer_profiles'
          AND t.tgname = 'trg_dealer_profiles_set_updated_at'
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_dealer_profiles_set_updated_at
        BEFORE UPDATE ON app.dealer_profiles
        FOR EACH ROW
        EXECUTE FUNCTION app.set_updated_at();
    END IF;
END;
$$;

CREATE OR REPLACE VIEW app.active_listing_details AS
SELECT
    vl.listing_id,
    v.vehicle_id,
    vl.asking_price,
    vl.description,
    vl.source_type,
    v.manufacturing_year,
    v.registration_year,
    v.kms_driven,
    v.colour,
    v.ownership_count,
    v.condition,
    m.manufacturer_name,
    vm.model_name,
    vm.body_type,
    vv.variant_name,
    vv.fuel_type,
    vv.transmission,
    dp.dealer_id,
    dp.dealership_name,
    c.city_id,
    c.city_name,
    estimate.estimated_price,
    estimate.lower_price,
    estimate.upper_price,
    CASE
        WHEN estimate.estimated_price IS NULL THEN 'estimate_unavailable'
        WHEN vl.asking_price < COALESCE(estimate.lower_price, estimate.estimated_price)
            THEN 'below_estimate_range'
        WHEN vl.asking_price > COALESCE(estimate.upper_price, estimate.estimated_price)
            THEN 'above_estimate_range'
        ELSE 'within_estimate_range'
    END AS estimate_comparison
FROM app.vehicle_listings vl
JOIN app.vehicles v
    ON v.vehicle_id = vl.vehicle_id
JOIN app.vehicle_variants vv
    ON vv.variant_id = v.variant_id
JOIN app.vehicle_models vm
    ON vm.model_id = vv.model_id
JOIN app.manufacturers m
    ON m.manufacturer_id = vm.manufacturer_id
JOIN app.dealer_profiles dp
    ON dp.dealer_id = v.dealer_id
JOIN app.cities c
    ON c.city_id = dp.city_id
LEFT JOIN LATERAL (
    SELECT
        lpe.estimated_price,
        lpe.lower_price,
        lpe.upper_price
    FROM app.listing_price_estimates lpe
    WHERE lpe.listing_id = vl.listing_id
    ORDER BY lpe.assessed_at DESC, lpe.estimate_id DESC
    LIMIT 1
) estimate ON TRUE
WHERE vl.listing_status = 'active';

CREATE OR REPLACE VIEW app.dealer_inventory_summary AS
SELECT
    dp.dealer_id,
    dp.dealership_name,
    c.city_name,
    COUNT(vl.listing_id) FILTER (
        WHERE vl.listing_status = 'active'
    ) AS active_listing_count,
    COALESCE(
        SUM(vl.asking_price) FILTER (
            WHERE vl.listing_status = 'active'
        ),
        0
    ) AS active_asking_price_total,
    ROUND(
        AVG(vl.asking_price) FILTER (
            WHERE vl.listing_status = 'active'
        ),
        2
    ) AS active_average_asking_price
FROM app.dealer_profiles dp
JOIN app.cities c
    ON c.city_id = dp.city_id
LEFT JOIN app.vehicles v
    ON v.dealer_id = dp.dealer_id
LEFT JOIN app.vehicle_listings vl
    ON vl.vehicle_id = v.vehicle_id
GROUP BY dp.dealer_id, dp.dealership_name, c.city_name;

CREATE OR REPLACE FUNCTION app.search_active_listings(
    p_city_id SMALLINT DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL,
    p_fuel_type TEXT DEFAULT NULL,
    p_transmission TEXT DEFAULT NULL
)
RETURNS TABLE (
    listing_id BIGINT,
    manufacturer_name TEXT,
    model_name TEXT,
    variant_name TEXT,
    city_name TEXT,
    asking_price NUMERIC,
    fuel_type TEXT,
    transmission TEXT,
    estimated_price NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        ald.listing_id,
        ald.manufacturer_name::TEXT,
        ald.model_name::TEXT,
        ald.variant_name::TEXT,
        ald.city_name::TEXT,
        ald.asking_price,
        ald.fuel_type::TEXT,
        ald.transmission::TEXT,
        ald.estimated_price
    FROM app.active_listing_details ald
    WHERE (p_city_id IS NULL OR ald.city_id = p_city_id)
      AND (p_max_price IS NULL OR ald.asking_price <= p_max_price)
      AND (
          p_fuel_type IS NULL
          OR LOWER(ald.fuel_type) = LOWER(p_fuel_type)
      )
      AND (
          p_transmission IS NULL
          OR LOWER(ald.transmission) = LOWER(p_transmission)
      )
    ORDER BY ald.asking_price, ald.listing_id;
$$;

COMMIT;
