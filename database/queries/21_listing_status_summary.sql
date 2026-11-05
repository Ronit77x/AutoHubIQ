-- Query 21: Listing status summary

SELECT
    listing_status,
    COUNT(*) AS total_listings,

    ROUND(
        COUNT(*) * 100.0 /
        (SELECT COUNT(*) FROM app.vehicle_listings),
        2
    ) AS percentage,

    ROUND(
        COALESCE(SUM(asking_price), 0),
        2
    ) AS total_asking_value,

    ROUND(
        COALESCE(AVG(asking_price), 0),
        2
    ) AS average_asking_price

FROM app.vehicle_listings

GROUP BY listing_status
ORDER BY total_listings DESC;