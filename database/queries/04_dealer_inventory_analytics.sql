SELECT
    dp.dealership_name,
    c.city_name,
    COUNT(vl.listing_id) AS total_active_listings,
    ROUND(AVG(vl.asking_price), 2) AS average_asking_price,
    MIN(vl.asking_price) AS lowest_asking_price,
    MAX(vl.asking_price) AS highest_asking_price
FROM app.dealer_profiles dp
JOIN app.cities c
    ON dp.city_id = c.city_id
LEFT JOIN app.vehicles v
    ON dp.dealer_id = v.dealer_id
LEFT JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id
   AND vl.listing_status = 'active'
GROUP BY
    dp.dealer_id,
    dp.dealership_name,
    c.city_name
ORDER BY total_active_listings DESC;