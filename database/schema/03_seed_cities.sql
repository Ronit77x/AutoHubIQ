
-- =====================================================
-- AutoHubIQ
-- File: 03_seed_cities.sql
-- Purpose: Insert the three supported marketplace cities
-- =====================================================

INSERT INTO app.cities (city_name, state_name)
VALUES
    ('Bangalore', 'Karnataka'),
    ('Mumbai', 'Maharashtra'),
    ('Kolkata', 'West Bengal')
ON CONFLICT (city_name, state_name)
DO NOTHING;
