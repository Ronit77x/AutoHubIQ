BEGIN;

INSERT INTO app.listing_images (
    listing_id,
    image_url,
    display_order,
    is_primary
)
SELECT
    vl.listing_id,
    'https://placehold.co/800x600/png?text=DEMO+CAR+'
        || v.registration_number
        || '+IMAGE+'
        || image_number,
    image_number,
    (image_number = 1)
FROM app.vehicle_listings vl
JOIN app.vehicles v
    ON v.vehicle_id = vl.vehicle_id
CROSS JOIN generate_series(1, 2) AS image_number
WHERE vl.source_type = 'demo'
  AND vl.listing_status = 'active'
  AND NOT EXISTS (
      SELECT 1
      FROM app.listing_images existing
      WHERE existing.listing_id = vl.listing_id
        AND existing.display_order = image_number
  );

COMMIT;