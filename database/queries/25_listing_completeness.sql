-- Query 25: Listing completeness check

SELECT
    vl.listing_id,
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    vl.listing_status,

    COUNT(DISTINCT li.image_id) AS image_count,

    CASE
        WHEN COUNT(DISTINCT li.image_id) = 0
        THEN 'Missing images'
        ELSE 'Images available'
    END AS image_status,

    CASE
        WHEN NULLIF(TRIM(vl.description), '') IS NULL
        THEN 'Missing description'
        ELSE 'Description available'
    END AS description_status,

    vl.source_type,

    CASE
        WHEN vl.source_type = 'external_reference'
             AND NULLIF(TRIM(vl.source_url), '') IS NULL
        THEN 'Missing source URL'
        ELSE 'Source information available'
    END AS source_status

FROM app.vehicle_listings vl

JOIN app.vehicles v
    ON vl.vehicle_id = v.vehicle_id

JOIN app.dealer_profiles dp
    ON v.dealer_id = dp.dealer_id

JOIN app.cities c
    ON dp.city_id = c.city_id

JOIN app.vehicle_variants vv
    ON v.variant_id = vv.variant_id

JOIN app.vehicle_models vm
    ON vv.model_id = vm.model_id

JOIN app.manufacturers m
    ON vm.manufacturer_id = m.manufacturer_id

LEFT JOIN app.listing_images li
    ON vl.listing_id = li.listing_id

GROUP BY
    vl.listing_id,
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    vl.listing_status,
    vl.description,
    vl.source_type,
    vl.source_url

ORDER BY vl.listing_id;