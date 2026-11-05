-- Query 8: Listing Status Transaction Test
-- Purpose: Demonstrate UPDATE, transaction control and ROLLBACK.

BEGIN;

-- Temporarily change listing 1 from active to reserved.
UPDATE app.vehicle_listings
SET
    listing_status = 'reserved',
    updated_at = CURRENT_TIMESTAMP
WHERE listing_id = 1;

-- Verify the temporary change.
SELECT
    listing_id,
    listing_status,
    updated_at
FROM app.vehicle_listings
WHERE listing_id = 1;

-- Undo the change and restore the original status.
ROLLBACK;


-- Verify that the original status is restored.
SELECT
    listing_id,
    listing_status
FROM app.vehicle_listings
WHERE listing_id = 1;