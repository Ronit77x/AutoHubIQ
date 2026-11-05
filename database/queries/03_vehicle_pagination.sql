SELECT
    vl.listing_id,
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    vv.fuel_type,
    v.manufacturing_year,
    vl.asking_price
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
WHERE vl.listing_status = 'active'
ORDER BY vl.asking_price ASC
LIMIT 5 OFFSET 0;