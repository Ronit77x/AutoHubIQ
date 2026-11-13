-- CTE: summarize active inventory and rank cities by listing volume.
WITH city_listing_stats AS (
    SELECT
        c.city_id,
        c.city_name,
        COUNT(vl.listing_id) AS active_listing_count,
        ROUND(AVG(vl.asking_price), 2) AS average_asking_price,
        MIN(vl.asking_price) AS lowest_asking_price,
        MAX(vl.asking_price) AS highest_asking_price
    FROM app.cities c
    LEFT JOIN app.dealer_profiles dp
        ON dp.city_id = c.city_id
    LEFT JOIN app.vehicles v
        ON v.dealer_id = dp.dealer_id
    LEFT JOIN app.vehicle_listings vl
        ON vl.vehicle_id = v.vehicle_id
       AND vl.listing_status = 'active'
    GROUP BY c.city_id, c.city_name
),
ranked_city_inventory AS (
    SELECT
        city_listing_stats.*,
        DENSE_RANK() OVER (
            ORDER BY active_listing_count DESC
        ) AS inventory_rank
    FROM city_listing_stats
)
SELECT *
FROM ranked_city_inventory
ORDER BY inventory_rank, city_name;

-- View: listing information with the latest estimate comparison.
SELECT
    listing_id,
    manufacturer_name,
    model_name,
    city_name,
    asking_price,
    estimated_price,
    lower_price,
    upper_price,
    estimate_comparison
FROM app.active_listing_details
ORDER BY city_name, listing_id;

-- View: dealership inventory analytics.
SELECT *
FROM app.dealer_inventory_summary
ORDER BY city_name, dealership_name;

-- SQL function: combine structured filters for marketplace search.
SELECT *
FROM app.search_active_listings(
    p_city_id := 1::SMALLINT,
    p_max_price := 1500000::NUMERIC,
    p_fuel_type := 'Diesel'::TEXT,
    p_transmission := 'Automatic'::TEXT
);
