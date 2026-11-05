SELECT
    m.manufacturer_name,
    COUNT(vl.listing_id) AS total_listings,
    ROUND(AVG(vl.asking_price), 2) AS average_asking_price,
    MIN(vl.asking_price) AS minimum_price,
    MAX(vl.asking_price) AS maximum_price
FROM app.manufacturers m
JOIN app.vehicle_models vm
    ON m.manufacturer_id = vm.manufacturer_id
JOIN app.vehicle_variants vv
    ON vm.model_id = vv.model_id
JOIN app.vehicles v
    ON vv.variant_id = v.variant_id
JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id
WHERE vl.listing_status = 'active'
GROUP BY
    m.manufacturer_id,
    m.manufacturer_name
ORDER BY total_listings DESC,
         average_asking_price DESC;