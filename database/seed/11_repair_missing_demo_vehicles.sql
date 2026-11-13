BEGIN;

SELECT pg_advisory_xact_lock(hashtext('AutoHubIQ demo vehicle seed'));

WITH repair_vehicles (
    dealer_email,
    manufacturer_name,
    model_name,
    variant_name,
    manufacturing_year,
    registration_year,
    kms_driven,
    colour,
    ownership_count,
    vehicle_condition,
    registration_number,
    asking_price,
    description
) AS (
    VALUES
    ('aarav@autohubiq.demo', 'Hyundai', 'Creta',
     'Diesel Automatic', 2022, 2022, 22000, 'White', 1,
     'excellent', 'KA01DEMO002', 1250000,
     'Demo listing: diesel automatic compact SUV.'),
    ('aarav@autohubiq.demo', 'Tata Motors', 'Nexon',
     'Diesel AMT', 2020, 2020, 42000, 'Blue', 2,
     'good', 'KA01DEMO003', 750000,
     'Demo listing: diesel compact SUV.'),
    ('priya@autohubiq.demo', 'MG Motor', 'Comet EV',
     'Electric Single-speed', 2023, 2023, 12000, 'Green', 1,
     'excellent', 'MH01DEMO004', 650000,
     'Demo listing: electric city car.')
),
inserted_vehicles AS (
    INSERT INTO app.vehicles (
        dealer_id,
        variant_id,
        manufacturing_year,
        registration_year,
        kms_driven,
        colour,
        ownership_count,
        condition,
        registration_number
    )
    SELECT
        dp.dealer_id,
        vv.variant_id,
        repair.manufacturing_year,
        repair.registration_year,
        repair.kms_driven,
        repair.colour,
        repair.ownership_count,
        repair.vehicle_condition,
        repair.registration_number
    FROM repair_vehicles repair
    JOIN app.users u
        ON u.email = repair.dealer_email
    JOIN app.dealer_profiles dp
        ON dp.user_id = u.user_id
    JOIN app.manufacturers m
        ON m.manufacturer_name = repair.manufacturer_name
    JOIN app.vehicle_models vm
        ON vm.manufacturer_id = m.manufacturer_id
       AND vm.model_name = repair.model_name
    JOIN app.vehicle_variants vv
        ON vv.model_id = vm.model_id
       AND vv.variant_name = repair.variant_name
    WHERE NOT EXISTS (
        SELECT 1
        FROM app.vehicles existing
        WHERE existing.registration_number = repair.registration_number
    )
    RETURNING vehicle_id, registration_number
),
seed_vehicles AS (
    SELECT vehicle_id, registration_number
    FROM inserted_vehicles

    UNION ALL

    SELECT v.vehicle_id, v.registration_number
    FROM repair_vehicles repair
    JOIN app.vehicles v
        ON v.registration_number = repair.registration_number
    WHERE NOT EXISTS (
        SELECT 1
        FROM inserted_vehicles inserted
        WHERE inserted.vehicle_id = v.vehicle_id
    )
)
INSERT INTO app.vehicle_listings (
    vehicle_id,
    asking_price,
    description,
    listing_status,
    source_type
)
SELECT
    v.vehicle_id,
    repair.asking_price,
    repair.description,
    'active',
    'demo'
FROM repair_vehicles repair
JOIN seed_vehicles v
    ON v.registration_number = repair.registration_number
WHERE NOT EXISTS (
    SELECT 1
    FROM app.vehicle_listings existing
    WHERE existing.vehicle_id = v.vehicle_id
      AND existing.listing_status = 'active'
);

DO $verify$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            VALUES
                ('KA01DEMO002'),
                ('KA01DEMO003'),
                ('MH01DEMO004')
        ) expected(registration_number)
        LEFT JOIN app.vehicles v
            ON v.registration_number = expected.registration_number
        LEFT JOIN app.vehicle_listings vl
            ON vl.vehicle_id = v.vehicle_id
           AND vl.listing_status = 'active'
           AND vl.source_type = 'demo'
        WHERE v.vehicle_id IS NULL
           OR vl.listing_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'Demo repair seed did not produce all three active demo listings';
    END IF;
END
$verify$;

COMMIT;
