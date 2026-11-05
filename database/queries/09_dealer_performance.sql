-- Query 9: Dealer Performance Analysis
-- Purpose: Identify dealerships with at least 4 active listings.

SELECT
    dp.dealership_name,
    c.city_name,
    COUNT(vl.listing_id) AS total_listings,
    ROUND(AVG(vl.asking_price), 2) AS average_price
FROM app.dealer_profiles dp
JOIN app.cities c
    ON dp.city_id = c.city_id
JOIN app.vehicles v
    ON dp.dealer_id = v.dealer_id
JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id
WHERE vl.listing_status = 'active'
GROUP BY
    dp.dealer_id,
    dp.dealership_name,
    c.city_name
HAVING COUNT(vl.listing_id) >= 4
ORDER BY average_price DESC;