-- Query 12: Rank vehicles by price within each city

SELECT
    city_name,
    manufacturer_name,
    model_name,
    asking_price,
    RANK() OVER (
        PARTITION BY city_name
        ORDER BY asking_price DESC
    ) AS price_rank
FROM (
    SELECT
        c.city_name,
        m.manufacturer_name,
        vm.model_name,
        vl.asking_price
    FROM app.vehicle_listings vl
    JOIN app.vehicles v
        ON vl.vehicle_id = v.vehicle_id
    JOIN app.dealer_profiles dp
        ON v.dealer_id = dp.dealer_id
    JOIN app.cities c
        ON dp.city_id = c.city_id
    JOIN app.vehicle_variants vv
        ON v.variant_id = vv.variant_id
    JOIN app.vehicle_models vm
        ON vv.model_id = vm.model_id
    JOIN app.manufacturers m
        ON vm.manufacturer_id = m.manufacturer_id
    WHERE vl.listing_status = 'active'
) AS city_vehicles
ORDER BY city_name, price_rank;