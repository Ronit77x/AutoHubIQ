-- Query 17: Vehicle price segmentation

SELECT
    CASE
        WHEN asking_price < 500000
            THEN 'Budget (Below 5 Lakh)'
        WHEN asking_price < 1000000
            THEN 'Mid-range (5-10 Lakh)'
        WHEN asking_price < 2000000
            THEN 'Premium (10-20 Lakh)'
        ELSE 'Luxury (Above 20 Lakh)'
    END AS price_category,

    COUNT(*) AS total_vehicles,

    ROUND(AVG(asking_price), 2) AS average_price,
    MIN(asking_price) AS minimum_price,
    MAX(asking_price) AS maximum_price

FROM app.vehicle_listings
WHERE listing_status = 'active'

GROUP BY price_category
ORDER BY minimum_price;