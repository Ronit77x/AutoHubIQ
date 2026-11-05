
BEGIN;

INSERT INTO app.listing_price_estimates (
    listing_id,
    estimated_price,
    lower_price,
    upper_price,
    methodology,
    source_summary
)
SELECT
    proposed.listing_id,
    proposed.estimated_price,
    proposed.lower_price,
    proposed.upper_price,
    'Indicative market estimate based on comparable used-car online asking prices, model year, location, mileage and available vehicle details. Not a confirmed transaction value.',
    proposed.source_summary
FROM (
    VALUES
    (
        1, 530000, 480000, 580000,
        '2021 Maruti Suzuki Swift: Bengaluru used-car price guides and comparable listings.'
    ),
    (
        2, 1750000, 1600000, 1900000,
        '2022 Mahindra XUV700: comparable 2022 listings and model-year price guidance. Exact trim unspecified.'
    ),
    (
        3, 280000, 250000, 320000,
        '2020 Renault Kwid: comparable 2020 used listings in Kolkata.'
    ),
    (
        4, 1090000, 1010000, 1170000,
        '2022 Kia Seltos: Mumbai used-car price guide and comparable listings.'
    ),
    (
        5, 1510000, 1430000, 1590000,
        '2019 Toyota Innova Crysta: Mumbai used-car price guide and comparable listings.'
    ),
    (
        6, 490000, 450000, 540000,
        '2021 Maruti Suzuki Baleno: comparable 2021 listings in Kolkata.'
    ),
    (
        7, 910000, 850000, 1000000,
        '2021 Honda City CVT: comparable Bengaluru listings. Exact trim unspecified.'
    ),
    (
        8, 3400000, 3100000, 3500000,
        '2020 BMW 3 Series: comparable Bengaluru listings. Exact trim unspecified; estimate is provisional.'
    ),
    (
        9, 1150000, 1050000, 1250000,
        '2023 Volkswagen Virtus Automatic: comparable Kolkata listings. Exact trim unspecified.'
    ),
    (
        10, 660000, 620000, 700000,
        '2023 MG Comet EV: comparable Mumbai listings with similar model year and mileage.'
    ),
    (
        11, 1350000, 1150000, 1550000,
        '2022 Hyundai Creta Diesel Automatic: comparable Bengaluru listings. Exact trim unspecified.'
    ),
    (
        12, 750000, 680000, 830000,
        '2020 Tata Nexon Diesel AMT: Bengaluru used-car price guides and comparable listings.'
    )
) AS proposed (
    listing_id,
    estimated_price,
    lower_price,
    upper_price,
    source_summary
)
WHERE NOT EXISTS (
    SELECT 1
    FROM app.listing_price_estimates existing
    WHERE existing.listing_id = proposed.listing_id
);

COMMIT;
