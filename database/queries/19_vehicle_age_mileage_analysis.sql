-- Query 19: Vehicle age and mileage analysis

SELECT
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    v.manufacturing_year,
    (2026 - v.manufacturing_year) AS vehicle_age,
    v.kms_driven,

    CASE
        WHEN v.kms_driven < 20000 THEN 'Low Mileage'
        WHEN v.kms_driven < 50000 THEN 'Moderate Mileage'
        ELSE 'High Mileage'
    END AS mileage_category,

    vl.asking_price

FROM app.vehicles v
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
JOIN app.vehicle_listings vl
    ON v.vehicle_id = vl.vehicle_id

WHERE vl.listing_status = 'active'

ORDER BY vehicle_age DESC, v.kms_driven DESC;