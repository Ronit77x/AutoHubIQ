SELECT
    dp.dealership_name,
    vl.listing_status,
    COUNT(*) AS total_listings
FROM app.dealer_profiles dp
JOIN app.vehicles v
    ON dp.dealer_id = v.dealer_id
JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id
GROUP BY
    dp.dealer_id,
    dp.dealership_name,
    vl.listing_status
ORDER BY
    dp.dealership_name,
    vl.listing_status;