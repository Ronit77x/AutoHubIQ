-- Query 18: Fuel-type distribution by city

SELECT
    c.city_name,
    vv.fuel_type,
    COUNT(vl.listing_id) AS total_listings,
    ROUND(AVG(vl.asking_price), 2) AS average_price
FROM app.vehicle_listings vl
JOIN app.vehicles v
    ON vl.vehicle_id = v.vehicle_id
JOIN app.dealer_profiles dp
    ON v.dealer_id = dp.dealer_id
JOIN app.cities c
    ON dp.city_id = c.city_id
JOIN app.vehicle_variants vv
    ON v.variant_id = vv.variant_id
WHERE vl.listing_status = 'active'
GROUP BY c.city_name, vv.fuel_type
ORDER BY c.city_name, total_listings DESC;