-- Query 11: Vehicles priced above their city's average

SELECT
    c.city_name,
    m.manufacturer_name,
    vm.model_name,
    vl.asking_price,
    (
        SELECT ROUND(AVG(vl2.asking_price), 2)
        FROM app.vehicle_listings vl2
        JOIN app.vehicles v2
            ON vl2.vehicle_id = v2.vehicle_id
        JOIN app.dealer_profiles dp2
            ON v2.dealer_id = dp2.dealer_id
        JOIN app.cities c2
            ON dp2.city_id = c2.city_id
        WHERE c2.city_id = c.city_id
          AND vl2.listing_status = 'active'
    ) AS city_average_price
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
  AND vl.asking_price > (
      SELECT AVG(vl2.asking_price)
      FROM app.vehicle_listings vl2
      JOIN app.vehicles v2
          ON vl2.vehicle_id = v2.vehicle_id
      JOIN app.dealer_profiles dp2
          ON v2.dealer_id = dp2.dealer_id
      JOIN app.cities c2
          ON dp2.city_id = c2.city_id
      WHERE c2.city_id = c.city_id
        AND vl2.listing_status = 'active'
  )
ORDER BY c.city_name, vl.asking_price DESC;