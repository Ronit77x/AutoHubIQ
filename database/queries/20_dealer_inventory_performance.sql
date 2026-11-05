-- Query 20: Dealer inventory performance

SELECT
    dp.dealership_name,
    c.city_name,

    COUNT(v.vehicle_id) AS total_vehicles,

    COUNT(vl.listing_id) FILTER (
        WHERE vl.listing_status = 'active'
    ) AS active_listings,

    COUNT(vl.listing_id) FILTER (
        WHERE vl.listing_status = 'sold'
    ) AS sold_listings,

    ROUND(
        AVG(vl.asking_price) FILTER (
            WHERE vl.listing_status = 'active'
        ), 2
    ) AS average_active_price,

    COALESCE(
        SUM(vl.asking_price) FILTER (
            WHERE vl.listing_status = 'active'
        ), 0
    ) AS active_inventory_value

FROM app.dealer_profiles dp
JOIN app.cities c
    ON dp.city_id = c.city_id
LEFT JOIN app.vehicles v
    ON dp.dealer_id = v.dealer_id
LEFT JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id

GROUP BY
    dp.dealer_id,
    dp.dealership_name,
    c.city_name

ORDER BY active_inventory_value DESC;