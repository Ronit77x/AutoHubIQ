BEGIN;

-- 1. Insert the three missing vehicles.
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
    d.manufacturing_year,
    d.registration_year,
    d.kms_driven,
    d.colour,
    d.ownership_count,
    d.vehicle_condition,
    d.registration_number
FROM (
    VALUES
        (
            'aarav@autohubiq.demo',
            'Hyundai', 'Creta', 'Diesel Automatic',
            2022, 2022, 22000, 'White', 1,
            'excellent', 'KA01DEMO002'
        ),
        (
            'aarav@autohubiq.demo',
            'Tata Motors', 'Nexon', 'Diesel AMT',
            2020, 2020, 42000, 'Blue', 2,
            'good', 'KA01DEMO003'
        ),
        (
            'priya@autohubiq.demo',
            'MG Motor', 'Comet EV', 'Electric Single-speed',
            2023, 2023, 12000, 'Green', 1,
            'excellent', 'MH01DEMO004'
        )
) AS d (
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
    registration_number
)
JOIN app.users u
    ON u.email = d.dealer_email
JOIN app.dealer_profiles dp
    ON dp.user_id = u.user_id
JOIN app.manufacturers m
    ON m.manufacturer_name = d.manufacturer_name
JOIN app.vehicle_models vm
    ON vm.manufacturer_id = m.manufacturer_id
   AND vm.model_name = d.model_name
JOIN app.vehicle_variants vv
    ON vv.model_id = vm.model_id
   AND vv.variant_name = d.variant_name
WHERE NOT EXISTS (
    SELECT 1
    FROM app.vehicles existing
    WHERE existing.registration_number = d.registration_number
);

-- 2. Create active demo listings for these vehicles.
INSERT INTO app.vehicle_listings (
    vehicle_id,
    asking_price,
    description,
    listing_status,
    source_type
)
SELECT
    v.vehicle_id,
    d.asking_price,
    d.description,
    'active',
    'demo'
FROM (
    VALUES
        ('KA01DEMO002', 1250000::numeric,
         'Demo listing: diesel automatic compact SUV.'),
        ('KA01DEMO003', 750000::numeric,
         'Demo listing: diesel compact SUV.'),
        ('MH01DEMO004', 650000::numeric,
         'Demo listing: electric city car.')
) AS d(registration_number, asking_price, description)
JOIN app.vehicles v
    ON v.registration_number = d.registration_number
WHERE NOT EXISTS (
    SELECT 1
    FROM app.vehicle_listings existing
    WHERE existing.vehicle_id = v.vehicle_id
);

COMMIT;