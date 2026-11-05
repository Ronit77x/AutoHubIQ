SELECT
    vl.listing_id,
    c.city_name,
    dp.dealership_name,
    m.manufacturer_name,
    vm.model_name,
    vv.variant_name,
    v.manufacturing_year,
    v.kms_driven,
    v.colour,
    vl.asking_price,
    li.image_url AS primary_image
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
   AND li.is_primary = TRUE
WHERE c.city_name = 'Bangalore'
  AND vl.listing_status = 'active'
ORDER BY vl.published_at DESC NULLS LAST,
         vl.created_at DESC;