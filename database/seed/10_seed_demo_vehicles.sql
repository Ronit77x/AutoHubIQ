BEGIN;

WITH demo_vehicles (
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
    -- Bangalore
    ('aarav@autohubiq.demo', 'Maruti Suzuki', 'Swift',
     'Petrol Manual', 2021, 2021, 28000, 'Red', 1,
     'good', 'KA01DEMO001', 550000,
     'Demo listing: well-maintained petrol hatchback.'),

    ('aarav@autohubiq.demo', 'Hyundai', 'Creta',
     'Petrol Automatic', 2022, 2022, 22000, 'White', 1,
     'excellent', 'KA01DEMO002', 1250000,
     'Demo listing: compact SUV with automatic transmission.'),

    ('aarav@autohubiq.demo', 'Tata Motors', 'Nexon',
     'Diesel Manual', 2020, 2020, 42000, 'Blue', 2,
     'good', 'KA01DEMO003', 750000,
     'Demo listing: diesel compact SUV.'),

    ('aarav@autohubiq.demo', 'Honda', 'City',
     'Petrol CVT', 2021, 2021, 30000, 'Silver', 1,
     'excellent', 'KA01DEMO004', 950000,
     'Demo listing: automatic petrol sedan.'),

    -- Mumbai
    ('priya@autohubiq.demo', 'Kia', 'Seltos',
     'Petrol Manual', 2022, 2022, 25000, 'Grey', 1,
     'excellent', 'MH01DEMO001', 1150000,
     'Demo listing: petrol SUV in excellent condition.'),

    ('priya@autohubiq.demo', 'Toyota', 'Innova Crysta',
     'Diesel Manual', 2019, 2019, 65000, 'White', 2,
     'good', 'MH01DEMO002', 1450000,
     'Demo listing: family MPV with diesel engine.'),

    ('priya@autohubiq.demo', 'BMW', '3 Series',
     'Petrol Automatic', 2020, 2020, 35000, 'Black', 1,
     'excellent', 'MH01DEMO003', 3200000,
     'Demo listing: premium automatic sedan.'),

    ('priya@autohubiq.demo', 'MG Motor', 'Comet EV',
     'Electric Automatic', 2023, 2023, 12000, 'Green', 1,
     'excellent', 'MH01DEMO004', 650000,
     'Demo listing: electric city car.'),

    -- Kolkata
    ('arjun@autohubiq.demo', 'Maruti Suzuki', 'Baleno',
     'Petrol Manual', 2021, 2021, 32000, 'Blue', 1,
     'good', 'WB01DEMO001', 600000,
     'Demo listing: petrol premium hatchback.'),

    ('arjun@autohubiq.demo', 'Mahindra', 'XUV700',
     'Diesel Manual', 2022, 2022, 27000, 'Black', 1,
     'excellent', 'WB01DEMO002', 1750000,
     'Demo listing: diesel SUV.'),

    ('arjun@autohubiq.demo', 'Renault', 'Kwid',
     'Petrol Manual', 2020, 2020, 38000, 'Orange', 2,
     'good', 'WB01DEMO003', 350000,
     'Demo listing: affordable petrol hatchback.'),

    ('arjun@autohubiq.demo', 'Volkswagen', 'Virtus',
     'Petrol Automatic', 2023, 2023, 15000, 'Silver', 1,
     'excellent', 'WB01DEMO004', 1350000,
     'Demo listing: automatic petrol sedan.')
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
        dv.manufacturing_year,
        dv.registration_year,
        dv.kms_driven,
        dv.colour,
        dv.ownership_count,
        dv.vehicle_condition,
        dv.registration_number
    FROM demo_vehicles dv
    JOIN app.users u
        ON u.email = dv.dealer_email
    JOIN app.dealer_profiles dp
        ON dp.user_id = u.user_id
    JOIN app.manufacturers m
        ON m.manufacturer_name = dv.manufacturer_name
    JOIN app.vehicle_models vm
        ON vm.manufacturer_id = m.manufacturer_id
       AND vm.model_name = dv.model_name
    JOIN app.vehicle_variants vv
        ON vv.model_id = vm.model_id
       AND vv.variant_name = dv.variant_name
    RETURNING vehicle_id
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
    dv.asking_price,
    dv.description,
    'active',
    'demo'
FROM inserted_vehicles v
JOIN app.vehicles av
    ON av.vehicle_id = v.vehicle_id
JOIN demo_vehicles dv
    ON dv.registration_number = av.registration_number;

COMMIT;