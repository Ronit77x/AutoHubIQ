-- Query 13: CTE-based city price analysis

WITH city_averages AS (
    SELECT
        dp.city_id,
        AVG(vl.asking_price) AS average_price
    FROM app.vehicle_listings vl
    JOIN app.vehicles v
        ON vl.vehicle_id = v.vehicle_id
    JOIN app.dealer_profiles dp
        ON v.dealer_id = dp.dealer_id
    WHERE vl.listing_status = 'active'
    GROUP BY dp.city_id
)
SELECT
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    vl.asking_price,
    ROUND(ca.average_price, 2) AS city_average,
    ROUND(vl.asking_price - ca.average_price, 2) AS price_difference
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
JOIN city_averages ca
    ON dp.city_id = ca.city_id
WHERE vl.listing_status = 'active'
ORDER BY c.city_name, price_difference DESC;