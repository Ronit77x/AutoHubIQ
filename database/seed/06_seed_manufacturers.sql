
-- =====================================================
-- AutoHubIQ
-- File: 06_seed_manufacturers.sql
-- Purpose: Populate the manufacturer catalogue
-- =====================================================

INSERT INTO app.manufacturers
    (manufacturer_name, country_of_origin)
VALUES
    ('Maruti Suzuki', 'Japan'),
    ('Hyundai', 'South Korea'),
    ('Tata Motors', 'India'),
    ('Honda', 'Japan'),
    ('Toyota', 'Japan'),
    ('Mahindra', 'India'),
    ('Kia', 'South Korea'),
    ('Volkswagen', 'Germany'),
    ('Skoda', 'Czech Republic'),
    ('MG Motor', 'United Kingdom'),
    ('Renault', 'France'),
    ('Nissan', 'Japan'),
    ('BMW', 'Germany'),
    ('Mercedes-Benz', 'Germany'),
    ('Audi', 'Germany'),
    ('Ford', 'United States'),
    ('Jeep', 'United States'),
    ('Volvo', 'Sweden'),
    ('Lexus', 'Japan'),
    ('Porsche', 'Germany')
ON CONFLICT (manufacturer_name)
DO NOTHING;
