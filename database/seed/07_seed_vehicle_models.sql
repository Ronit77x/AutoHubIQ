
-- =====================================================
-- AutoHubIQ
-- File: 07_seed_vehicle_models.sql
-- Purpose: Populate the vehicle model catalogue
-- =====================================================

INSERT INTO app.vehicle_models
    (manufacturer_id, model_name, body_type, description)

SELECT
    m.manufacturer_id,
    v.model_name,
    v.body_type,
    v.description

FROM (
    VALUES

    -- MARUTI SUZUKI
    ('Maruti Suzuki', 'Swift', 'Hatchback', 'Popular compact hatchback'),
    ('Maruti Suzuki', 'Baleno', 'Hatchback', 'Premium hatchback'),
    ('Maruti Suzuki', 'Brezza', 'SUV', 'Compact SUV'),
    ('Maruti Suzuki', 'Dzire', 'Sedan', 'Compact sedan'),
    ('Maruti Suzuki', 'Wagon R', 'Hatchback', 'Tall-boy hatchback'),
    ('Maruti Suzuki', 'Ertiga', 'MUV', 'Multi-purpose family vehicle'),

    -- HYUNDAI
    ('Hyundai', 'Creta', 'SUV', 'Mid-size SUV'),
    ('Hyundai', 'i20', 'Hatchback', 'Premium hatchback'),
    ('Hyundai', 'Venue', 'SUV', 'Subcompact SUV'),
    ('Hyundai', 'Verna', 'Sedan', 'Mid-size sedan'),

    -- TATA MOTORS
    ('Tata Motors', 'Nexon', 'SUV', 'Compact SUV'),
    ('Tata Motors', 'Tiago', 'Hatchback', 'Compact hatchback'),
    ('Tata Motors', 'Punch', 'SUV', 'Subcompact SUV'),
    ('Tata Motors', 'Harrier', 'SUV', 'Mid-size SUV'),

    -- HONDA
    ('Honda', 'City', 'Sedan', 'Mid-size sedan'),
    ('Honda', 'Amaze', 'Sedan', 'Compact sedan'),
    ('Honda', 'Jazz', 'Hatchback', 'Premium hatchback'),

    -- TOYOTA
    ('Toyota', 'Innova Crysta', 'MUV', 'Multi-purpose family vehicle'),
    ('Toyota', 'Fortuner', 'SUV', 'Full-size SUV'),
    ('Toyota', 'Glanza', 'Hatchback', 'Premium hatchback'),

    -- MAHINDRA
    ('Mahindra', 'XUV700', 'SUV', 'Mid-size SUV'),
    ('Mahindra', 'Scorpio-N', 'SUV', 'Body-on-frame SUV'),
    ('Mahindra', 'Thar', 'SUV', 'Off-road oriented SUV'),

    -- KIA
    ('Kia', 'Seltos', 'SUV', 'Mid-size SUV'),
    ('Kia', 'Sonet', 'SUV', 'Subcompact SUV'),
    ('Kia', 'Carens', 'MUV', 'Multi-purpose family vehicle'),

    -- VOLKSWAGEN
    ('Volkswagen', 'Polo', 'Hatchback', 'Premium hatchback'),
    ('Volkswagen', 'Virtus', 'Sedan', 'Mid-size sedan'),
    ('Volkswagen', 'Taigun', 'SUV', 'Mid-size SUV'),

    -- SKODA
    ('Skoda', 'Slavia', 'Sedan', 'Mid-size sedan'),
    ('Skoda', 'Kushaq', 'SUV', 'Mid-size SUV'),
    ('Skoda', 'Rapid', 'Sedan', 'Compact sedan'),

    -- MG MOTOR
    ('MG Motor', 'Hector', 'SUV', 'Mid-size SUV'),
    ('MG Motor', 'Comet EV', 'Hatchback', 'Electric city car'),

    -- RENAULT
    ('Renault', 'Kwid', 'Hatchback', 'Entry-level hatchback'),
    ('Renault', 'Kiger', 'SUV', 'Subcompact SUV'),
    ('Renault', 'Triber', 'MUV', 'Compact multi-purpose vehicle'),

    -- NISSAN
    ('Nissan', 'Magnite', 'SUV', 'Subcompact SUV'),
    ('Nissan', 'Sunny', 'Sedan', 'Compact sedan'),

    -- BMW
    ('BMW', '3 Series', 'Sedan', 'Luxury sports sedan'),
    ('BMW', 'X1', 'SUV', 'Luxury compact SUV'),

    -- MERCEDES-BENZ
    ('Mercedes-Benz', 'C-Class', 'Sedan', 'Luxury sedan'),
    ('Mercedes-Benz', 'GLA', 'SUV', 'Luxury compact SUV'),

    -- AUDI
    ('Audi', 'A4', 'Sedan', 'Luxury sedan'),
    ('Audi', 'Q3', 'SUV', 'Luxury compact SUV'),

    -- FORD
    ('Ford', 'EcoSport', 'SUV', 'Compact SUV'),
    ('Ford', 'Endeavour', 'SUV', 'Full-size SUV'),

    -- JEEP
    ('Jeep', 'Compass', 'SUV', 'Mid-size SUV'),

    -- VOLVO
    ('Volvo', 'XC60', 'SUV', 'Luxury mid-size SUV'),

    -- LEXUS
    ('Lexus', 'ES', 'Sedan', 'Luxury sedan'),

    -- PORSCHE
    ('Porsche', 'Cayenne', 'SUV', 'Luxury performance SUV')

) AS v(manufacturer_name, model_name, body_type, description)

JOIN app.manufacturers m
    ON m.manufacturer_name = v.manufacturer_name

ON CONFLICT (manufacturer_id, model_name)
DO NOTHING;
