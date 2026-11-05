
-- =====================================================
-- AutoHubIQ
-- File: 08_seed_vehicle_variants.sql
-- Purpose: Populate vehicle variants
-- =====================================================

INSERT INTO app.vehicle_variants (
    model_id,
    variant_name,
    fuel_type,
    transmission,
    engine_displacement_cc,
    battery_capacity_kwh,
    seating_capacity
)

SELECT
    vm.model_id,
    v.variant_name,
    v.fuel_type,
    v.transmission,
    v.engine_cc::integer,
    v.battery_kwh::numeric,
    v.seating_capacity

FROM (
    VALUES

    -- MARUTI SUZUKI
    ('Maruti Suzuki', 'Swift', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Maruti Suzuki', 'Swift', 'Petrol AMT', 'Petrol', 'AMT', NULL, NULL, 5),
    ('Maruti Suzuki', 'Baleno', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Maruti Suzuki', 'Baleno', 'Petrol CVT', 'Petrol', 'CVT', NULL, NULL, 5),
    ('Maruti Suzuki', 'Brezza', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Maruti Suzuki', 'Dzire', 'Petrol AMT', 'Petrol', 'AMT', NULL, NULL, 5),
    ('Maruti Suzuki', 'Ertiga', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 7),

    -- HYUNDAI
    ('Hyundai', 'Creta', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Hyundai', 'Creta', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 5),
    ('Hyundai', 'i20', 'Petrol IVT', 'Petrol', 'CVT', NULL, NULL, 5),
    ('Hyundai', 'Venue', 'Petrol DCT', 'Petrol', 'DCT', NULL, NULL, 5),
    ('Hyundai', 'Verna', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),

    -- TATA MOTORS
    ('Tata Motors', 'Nexon', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Tata Motors', 'Nexon', 'Diesel AMT', 'Diesel', 'AMT', NULL, NULL, 5),
    ('Tata Motors', 'Tiago', 'Petrol AMT', 'Petrol', 'AMT', NULL, NULL, 5),
    ('Tata Motors', 'Punch', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Tata Motors', 'Harrier', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 5),

    -- HONDA
    ('Honda', 'City', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Honda', 'City', 'Petrol CVT', 'Petrol', 'CVT', NULL, NULL, 5),
    ('Honda', 'Amaze', 'Petrol CVT', 'Petrol', 'CVT', NULL, NULL, 5),

    -- TOYOTA
    ('Toyota', 'Innova Crysta', 'Diesel Manual', 'Diesel', 'Manual', NULL, NULL, 7),
    ('Toyota', 'Fortuner', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 7),
    ('Toyota', 'Glanza', 'Petrol AMT', 'Petrol', 'AMT', NULL, NULL, 5),

    -- MAHINDRA
    ('Mahindra', 'XUV700', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 7),
    ('Mahindra', 'XUV700', 'Diesel Manual', 'Diesel', 'Manual', NULL, NULL, 7),
    ('Mahindra', 'Scorpio-N', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 7),
    ('Mahindra', 'Thar', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 4),

    -- KIA
    ('Kia', 'Seltos', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Kia', 'Seltos', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 5),
    ('Kia', 'Sonet', 'Petrol DCT', 'Petrol', 'DCT', NULL, NULL, 5),
    ('Kia', 'Carens', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 6),

    -- VOLKSWAGEN
    ('Volkswagen', 'Virtus', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Volkswagen', 'Virtus', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),
    ('Volkswagen', 'Taigun', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),

    -- SKODA
    ('Skoda', 'Slavia', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Skoda', 'Kushaq', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),

    -- MG MOTOR
    ('MG Motor', 'Hector', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),
    ('MG Motor', 'Comet EV', 'Electric Single-speed', 'Electric', 'Single-speed', NULL, NULL, 4),

    -- RENAULT
    ('Renault', 'Kwid', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Renault', 'Kiger', 'Petrol CVT', 'Petrol', 'CVT', NULL, NULL, 5),
    ('Renault', 'Triber', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 7),

    -- NISSAN
    ('Nissan', 'Magnite', 'Petrol CVT', 'Petrol', 'CVT', NULL, NULL, 5),

    -- BMW
    ('BMW', '3 Series', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),
    ('BMW', 'X1', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 5),

    -- MERCEDES-BENZ
    ('Mercedes-Benz', 'C-Class', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),
    ('Mercedes-Benz', 'GLA', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),

    -- AUDI
    ('Audi', 'A4', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),
    ('Audi', 'Q3', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5),

    -- FORD
    ('Ford', 'EcoSport', 'Petrol Manual', 'Petrol', 'Manual', NULL, NULL, 5),
    ('Ford', 'Endeavour', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 7),

    -- JEEP
    ('Jeep', 'Compass', 'Diesel Automatic', 'Diesel', 'Automatic', NULL, NULL, 5),

    -- VOLVO
    ('Volvo', 'XC60', 'Hybrid Automatic', 'Hybrid', 'Automatic', NULL, NULL, 5),

    -- LEXUS
    ('Lexus', 'ES', 'Hybrid Automatic', 'Hybrid', 'Automatic', NULL, NULL, 5),

    -- PORSCHE
    ('Porsche', 'Cayenne', 'Petrol Automatic', 'Petrol', 'Automatic', NULL, NULL, 5)

) AS v(
    manufacturer_name,
    model_name,
    variant_name,
    fuel_type,
    transmission,
    engine_cc,
    battery_kwh,
    seating_capacity
)

JOIN app.manufacturers m
    ON m.manufacturer_name = v.manufacturer_name

JOIN app.vehicle_models vm
    ON vm.manufacturer_id = m.manufacturer_id
    AND vm.model_name = v.model_name

ON CONFLICT (model_id, variant_name)
DO NOTHING;
