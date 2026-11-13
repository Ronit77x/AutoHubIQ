BEGIN;
SELECT pg_advisory_xact_lock(hashtext('AutoHubIQ demo vehicle seed'));
INSERT INTO app.users (full_name, email, password_hash, user_role, account_status)
VALUES ('Neha Rao', 'neha@autohubiq.demo', 'DEMO_ACCOUNT_NO_LOGIN', 'dealer', 'active'),
       ('Rohan Shah', 'rohan@autohubiq.demo', 'DEMO_ACCOUNT_NO_LOGIN', 'dealer', 'active'),
       ('Ishita Sen', 'ishita@autohubiq.demo', 'DEMO_ACCOUNT_NO_LOGIN', 'dealer', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO app.dealer_profiles (user_id, city_id, dealership_name, business_email, street_address, description, verification_status)
SELECT u.user_id, c.city_id, d.name, d.email, d.address,
       'Illustrative demo dealership for local marketplace demonstrations.', 'verified'
FROM (VALUES ('neha@autohubiq.demo', 'Bangalore', 'Bangalore City Motors', 'Indiranagar, Bangalore'),
             ('rohan@autohubiq.demo', 'Mumbai', 'Mumbai Auto Select', 'Powai, Mumbai'),
             ('ishita@autohubiq.demo', 'Kolkata', 'Kolkata City Motors', 'New Town, Kolkata')) d(email, city, name, address)
JOIN app.users u ON u.email=d.email AND u.user_role='dealer'
JOIN app.cities c ON c.city_name=d.city
WHERE NOT EXISTS (SELECT 1 FROM app.dealer_profiles dp WHERE dp.user_id=u.user_id);

-- Move only these known demo vehicles, retaining all listing and gallery IDs.
UPDATE app.vehicles v SET dealer_id=dp.dealer_id
FROM (VALUES ('neha@autohubiq.demo', 'KA01DEMO003'), ('neha@autohubiq.demo', 'KA01DEMO004'),
             ('rohan@autohubiq.demo', 'MH01DEMO003'), ('rohan@autohubiq.demo', 'MH01DEMO004'),
             ('ishita@autohubiq.demo', 'WB01DEMO003'), ('ishita@autohubiq.demo', 'WB01DEMO004')) d(email, registration)
JOIN app.users u ON u.email=d.email
JOIN app.dealer_profiles dp ON dp.user_id=u.user_id
WHERE v.registration_number=d.registration
  AND EXISTS (SELECT 1 FROM app.vehicle_listings vl WHERE vl.vehicle_id=v.vehicle_id AND vl.source_type='demo')
  AND v.dealer_id IN (SELECT old.dealer_id FROM app.dealer_profiles old JOIN app.users owner ON owner.user_id=old.user_id
    WHERE owner.email IN ('aarav@autohubiq.demo', 'priya@autohubiq.demo', 'arjun@autohubiq.demo'));
COMMIT;
