BEGIN;

-- Create three demo dealer accounts.
-- These placeholder hashes are not valid login credentials.
INSERT INTO app.users (
    full_name,
    email,
    phone,
    password_hash,
    user_role,
    account_status
)
VALUES
    (
        'Aarav Sharma',
        'aarav@autohubiq.demo',
        '9000000001',
        'DEMO_ACCOUNT_NO_LOGIN',
        'dealer',
        'active'
    ),
    (
        'Priya Mehta',
        'priya@autohubiq.demo',
        '9000000002',
        'DEMO_ACCOUNT_NO_LOGIN',
        'dealer',
        'active'
    ),
    (
        'Arjun Das',
        'arjun@autohubiq.demo',
        '9000000003',
        'DEMO_ACCOUNT_NO_LOGIN',
        'dealer',
        'active'
    )
ON CONFLICT (email) DO NOTHING;


-- Create the corresponding dealership profiles.
INSERT INTO app.dealer_profiles (
    user_id,
    city_id,
    dealership_name,
    business_phone,
    business_email,
    street_address,
    description,
    verification_status
)
SELECT
    u.user_id,
    c.city_id,
    d.dealership_name,
    d.business_phone,
    d.business_email,
    d.street_address,
    d.description,
    'verified'
FROM (
    VALUES
        (
            'aarav@autohubiq.demo',
            'Bangalore',
            'Bangalore Auto Hub',
            '9000000001',
            'bangalore@autohubiq.demo',
            'Whitefield, Bangalore',
            'Demo dealership offering inspected pre-owned vehicles.'
        ),
        (
            'priya@autohubiq.demo',
            'Mumbai',
            'Mumbai Motors',
            '9000000002',
            'mumbai@autohubiq.demo',
            'Andheri, Mumbai',
            'Demo dealership specialising in quality used cars.'
        ),
        (
            'arjun@autohubiq.demo',
            'Kolkata',
            'Kolkata Car Point',
            '9000000003',
            'kolkata@autohubiq.demo',
            'Salt Lake, Kolkata',
            'Demo dealership offering a range of pre-owned vehicles.'
        )
) AS d (
    email,
    city_name,
    dealership_name,
    business_phone,
    business_email,
    street_address,
    description
)
JOIN app.users u
    ON u.email = d.email
JOIN app.cities c
    ON c.city_name = d.city_name
WHERE NOT EXISTS (
    SELECT 1
    FROM app.dealer_profiles existing
    WHERE existing.user_id = u.user_id
);

COMMIT;