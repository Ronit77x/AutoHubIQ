BEGIN;

SELECT pg_advisory_xact_lock(hashtext('AutoHubIQ demo price estimate seed'));

INSERT INTO app.listing_price_estimates (
    listing_id,
    estimated_price,
    lower_price,
    upper_price,
    methodology,
    source_summary
)
SELECT
    vl.listing_id,
    proposed.estimated_price,
    proposed.lower_price,
    proposed.upper_price,
    'Provisional illustrative estimate for project demonstration only; no verified external source or comparable listings are recorded.',
    proposed.source_summary
FROM (
    VALUES
    (
        'KA01DEMO001', 530000, 480000, 580000,
        'Bengaluru Swift demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    ),
    (
        'WB01DEMO002', 1750000, 1600000, 1900000,
        'Kolkata XUV700 demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'WB01DEMO003', 280000, 250000, 320000,
        'Kolkata Kwid demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'MH01DEMO001', 1090000, 1010000, 1170000,
        'Mumbai Seltos demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    ),
    (
        'MH01DEMO002', 1510000, 1430000, 1590000,
        'Mumbai Innova Crysta demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    ),
    (
        'WB01DEMO001', 490000, 450000, 540000,
        'Kolkata Baleno demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    ),
    (
        'KA01DEMO004', 910000, 850000, 1000000,
        'Bengaluru City CVT demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    ),
    (
        'MH01DEMO003', 3400000, 3100000, 3500000,
        'Mumbai BMW 3 Series demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'WB01DEMO004', 1150000, 1050000, 1250000,
        'Kolkata Virtus demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'MH01DEMO004', 660000, 620000, 700000,
        'Mumbai Comet EV demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'KA01DEMO002', 1350000, 1150000, 1550000,
        'Bengaluru Creta diesel automatic demo estimate; exact manufacturer trim/grade unspecified and estimate provisional. No verified external source or comparable listings recorded.'
    ),
    (
        'KA01DEMO003', 750000, 680000, 830000,
        'Bengaluru Nexon diesel AMT demo estimate; exact manufacturer trim/grade unspecified. No verified external source or comparable listings recorded.'
    )
) AS proposed (
    registration_number,
    estimated_price,
    lower_price,
    upper_price,
    source_summary
)
JOIN app.vehicles v
    ON v.registration_number = proposed.registration_number
JOIN app.vehicle_listings vl
    ON vl.vehicle_id = v.vehicle_id
   AND vl.listing_status = 'active'
   AND vl.source_type = 'demo'
WHERE NOT EXISTS (
    SELECT 1
    FROM app.listing_price_estimates existing
    WHERE existing.listing_id = vl.listing_id
);

DO $verify$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            VALUES
                ('KA01DEMO001'),
                ('KA01DEMO002'),
                ('KA01DEMO003'),
                ('KA01DEMO004'),
                ('MH01DEMO001'),
                ('MH01DEMO002'),
                ('MH01DEMO003'),
                ('MH01DEMO004'),
                ('WB01DEMO001'),
                ('WB01DEMO002'),
                ('WB01DEMO003'),
                ('WB01DEMO004')
        ) expected(registration_number)
        LEFT JOIN app.vehicles v
            ON v.registration_number = expected.registration_number
        LEFT JOIN app.vehicle_listings vl
            ON vl.vehicle_id = v.vehicle_id
           AND vl.listing_status = 'active'
           AND vl.source_type = 'demo'
        LEFT JOIN app.listing_price_estimates lpe
            ON lpe.listing_id = vl.listing_id
        GROUP BY expected.registration_number, vl.listing_id
        HAVING vl.listing_id IS NULL
            OR COUNT(lpe.estimate_id) <> 1
    ) THEN
        RAISE EXCEPTION
            'Estimate seed must leave exactly one estimate for each of the 12 active demo listings';
    END IF;
END
$verify$;

COMMIT;
