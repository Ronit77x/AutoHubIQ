-- Local reference galleries for illustrative demo listings only.
-- Source provenance: frontend/lib/demo-gallery-sources.json.
-- Preserves dealer uploads and any existing non-placeholder image at an occupied slot.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('AutoHubIQ demo image galleries'));
CREATE TEMP TABLE autohubiq_demo_gallery (model_name TEXT, image_url TEXT, display_order SMALLINT) ON COMMIT DROP;
INSERT INTO autohubiq_demo_gallery VALUES
    ('Nexon', '/cars/nexon.jpg', 1),
    ('Nexon', '/cars/gallery/nexon/dashboard.jpg', 2),
    ('Nexon', '/cars/gallery/nexon/rear-seats.jpg', 3),
    ('Nexon', '/cars/gallery/nexon/cabin.jpg', 4),
    ('Swift', '/cars/swift.jpg', 1),
    ('Swift', '/cars/gallery/swift/dashboard.jpg', 2),
    ('Swift', '/cars/gallery/swift/instruments.jpg', 3),
    ('Creta', '/cars/creta.jpg', 1),
    ('Creta', '/cars/gallery/creta/dashboard.jpg', 2),
    ('Creta', '/cars/gallery/creta/rear-seats.jpg', 3),
    ('Creta', '/cars/gallery/creta/boot.jpg', 4),
    ('XUV700', '/cars/xuv700.jpg', 1),
    ('XUV700', '/cars/gallery/xuv700/dashboard.jpg', 2),
    ('XUV700', '/cars/gallery/xuv700/cabin.jpg', 3),
    ('XUV700', '/cars/gallery/xuv700/boot.jpg', 4),
    ('Innova Crysta', '/cars/innova_crysta.jpg', 1),
    ('Innova Crysta', '/cars/gallery/innova_crysta/dashboard.jpg', 2),
    ('Innova Crysta', '/cars/gallery/innova_crysta/rear-seats.jpg', 3),
    ('Innova Crysta', '/cars/gallery/innova_crysta/boot.jpg', 4),
    ('City', '/cars/city.jpg', 1),
    ('City', '/cars/gallery/city/dashboard.jpg', 2),
    ('City', '/cars/gallery/city/cabin.jpg', 3),
    ('City', '/cars/gallery/city/boot.jpg', 4),
    ('Baleno', '/cars/baleno.jpg', 1),
    ('Baleno', '/cars/gallery/baleno/dashboard.jpg', 2),
    ('Baleno', '/cars/gallery/baleno/cabin.jpg', 3),
    ('Baleno', '/cars/gallery/baleno/infotainment.jpg', 4),
    ('Virtus', '/cars/virtus.jpg', 1),
    ('Virtus', '/cars/gallery/virtus/dashboard.jpg', 2),
    ('Virtus', '/cars/gallery/virtus/seats.jpg', 3),
    ('Comet EV', '/cars/comet_ev.jpg', 1),
    ('Comet EV', '/cars/gallery/comet_ev/dashboard.jpg', 2),
    ('Comet EV', '/cars/gallery/comet_ev/cabin.jpg', 3),
    ('Seltos', '/cars/seltos.jpg', 1),
    ('Seltos', '/cars/gallery/seltos/dashboard.jpg', 2),
    ('Seltos', '/cars/gallery/seltos/rear-seats.jpg', 3),
    ('Kwid', '/cars/kwid.jpg', 1),
    ('Kwid', '/cars/gallery/kwid/dashboard.jpg', 2),
    ('Kwid', '/cars/gallery/kwid/rear-seats.jpg', 3),
    ('3 Series', '/cars/bmw_3_series.jpg', 1),
    ('3 Series', '/cars/gallery/bmw_3_series/dashboard.jpg', 2),
    ('3 Series', '/cars/gallery/bmw_3_series/rear-seats.jpg', 3);

UPDATE app.listing_images image
SET image_url = desired.image_url, is_primary = (desired.display_order = 1)
FROM autohubiq_demo_gallery desired, app.vehicle_listings vl,
     app.vehicles v, app.vehicle_variants vv, app.vehicle_models vm
WHERE image.listing_id = vl.listing_id AND vl.vehicle_id = v.vehicle_id
  AND v.variant_id = vv.variant_id AND vv.model_id = vm.model_id
  AND vl.source_type = 'demo' AND vm.model_name = desired.model_name
  AND image.display_order = desired.display_order
  AND image.image_url LIKE 'https://placehold.co/%';

INSERT INTO app.listing_images (listing_id, image_url, display_order, is_primary)
SELECT vl.listing_id, desired.image_url, desired.display_order, (desired.display_order = 1)
FROM autohubiq_demo_gallery desired
JOIN app.vehicle_models vm ON vm.model_name = desired.model_name
JOIN app.vehicle_variants vv ON vv.model_id = vm.model_id
JOIN app.vehicles v ON v.variant_id = vv.variant_id
JOIN app.vehicle_listings vl ON vl.vehicle_id = v.vehicle_id AND vl.source_type = 'demo'
WHERE NOT EXISTS (SELECT 1 FROM app.listing_images image
  WHERE image.listing_id = vl.listing_id AND image.display_order = desired.display_order);
COMMIT;
