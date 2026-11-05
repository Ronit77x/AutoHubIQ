-- Query 22: City-wise inventory and pricing

SELECT
    c.city_name,
    COUNT(v.vehicle_id) AS total_vehicles,
    COUNT(vl.listing_id) AS active_listings,

    ROUND(AVG(vl.asking_price), 2) AS average_price,

    MIN(vl.asking_price) AS lowest_price,
    MAX(vl.asking_price) AS highest_price,

    ROUND(SUM(vl.asking_price), 2) AS total_inventory_value

FROM app.cities c

JOIN app.dealer_profiles dp
    ON c.city_id = dp.city_id

JOIN app.vehicles v
    ON dp.dealer_id = v.dealer_id

JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id

WHERE vl.listing_status = 'active'

GROUP BY c.city_id, c.city_name
ORDER BY average_price DESC;