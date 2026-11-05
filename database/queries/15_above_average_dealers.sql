-- Query 15: Dealers with above-average active listings

SELECT
    dp.dealership_name,
    c.city_name,
    COUNT(vl.listing_id) AS total_active_listings
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
HAVING COUNT(vl.listing_id) > (
    SELECT AVG(listing_count)
    FROM (
        SELECT
            COUNT(vl2.listing_id) AS listing_count
        FROM app.dealer_profiles dp2
        LEFT JOIN app.vehicles v2
            ON dp2.dealer_id = v2.dealer_id
        LEFT JOIN app.vehicle_listings vl2
            ON v2.vehicle_id = vl2.vehicle_id
            AND vl2.listing_status = 'active'
        GROUP BY dp2.dealer_id
    ) AS dealer_counts
)
ORDER BY total_active_listings DESC;