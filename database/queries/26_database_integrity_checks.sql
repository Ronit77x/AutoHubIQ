-- Query 26: Database integrity checks

SELECT
    'Vehicles without dealer profiles' AS check_name,
    COUNT(*) AS issue_count
FROM app.vehicles v
LEFT JOIN app.dealer_profiles dp
    ON v.dealer_id = dp.dealer_id
WHERE dp.dealer_id IS NULL

UNION ALL

SELECT
    'Vehicles without valid variants',
    COUNT(*)
FROM app.vehicles v
LEFT JOIN app.vehicle_variants vv
    ON v.variant_id = vv.variant_id
WHERE vv.variant_id IS NULL

UNION ALL

SELECT
    'Listings without vehicles',
    COUNT(*)
FROM app.vehicle_listings vl
LEFT JOIN app.vehicles v
    ON vl.vehicle_id = v.vehicle_id
WHERE v.vehicle_id IS NULL

UNION ALL

SELECT
    'Images without listings',
    COUNT(*)
FROM app.listing_images li
LEFT JOIN app.vehicle_listings vl
    ON li.listing_id = vl.listing_id
WHERE vl.listing_id IS NULL;