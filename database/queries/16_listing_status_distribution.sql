-- Query 16: Listing status distribution

SELECT
    listing_status,
    COUNT(*) AS total_listings,
    ROUND(
        COUNT(*) * 100.0 /
        (SELECT COUNT(*) FROM app.vehicle_listings),
        2
    ) AS percentage
FROM app.vehicle_listings
GROUP BY listing_status
ORDER BY total_listings DESC;