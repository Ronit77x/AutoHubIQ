
WITH action_catalog (
    action_order, user_roles, action, conditions,
    requires_sign_in, requires_dealer_profile, requires_verified_dealer
) AS (
    VALUES
    (1, ARRAY['customer','dealer','admin'], 'Browse active listings and vehicle details',
     'Public access; no sign-in required', false, false, false),
    (2, ARRAY['customer','dealer','admin'], 'Search and filter vehicles',
     'Public access; no sign-in required', false, false, false),
    (3, ARRAY['customer','dealer','admin'], 'Send an enquiry or request a test drive',
     'Active account; another verified dealer''s active listing only', true, false, false),
    (4, ARRAY['customer'], 'Submit an offer',
     'Active account; another verified dealer''s active listing; valid positive amount', true, false, false),
    (5, ARRAY['customer'], 'View own offers and their status',
     'Active account; own offers only', true, false, false),
    (6, ARRAY['customer'], 'Edit own offer amount message and phone',
     'Own offer; not marked contacted; listing active and dealer verified', true, false, false),
    (7, ARRAY['dealer'], 'View own dealer dashboard inventory and buyer requests',
     'Active account with a dealer profile; own dealership only', true, true, false),
    (8, ARRAY['dealer'], 'View the vehicle catalogue for publishing',
     'Active account with a dealer profile; verification not required to view catalogue', true, true, false),
    (9, ARRAY['dealer'], 'Publish a new vehicle listing',
     'Active account; own verified dealership; valid catalogue vehicle and listing data', true, true, true),
    (10, ARRAY['dealer'], 'Update asking prices and set non-active listing statuses',
     'Active account; own dealership listings only; verification not required by this endpoint', true, true, false),
    (11, ARRAY['dealer'], 'Activate or reactivate own listings',
     'Active account; own verified dealership; at most one active listing per vehicle', true, true, true),
    (12, ARRAY['dealer'], 'Upload photos to own listings',
     'Active account; own verified dealership; upload validation and photo limits apply', true, true, true),
    (13, ARRAY['dealer'], 'Mark an offer as contacted',
     'Active dealer account; offer must belong to a listing owned by that account''s dealership', true, true, false),
    (14, ARRAY['admin'], 'View dealer applications and verification details',
     'Active admin account', true, false, false),
    (15, ARRAY['admin'], 'Verify or reject dealer applications',
     'Active admin account; rejection also withdraws that dealership''s active listings', true, false, false),
    (16, ARRAY['admin'], 'View protected database connection diagnostics',
     'Active admin account; read-only diagnostics endpoint', true, false, false)
)
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.user_role,
    u.account_status,
    dp.dealership_name,
    dp.verification_status AS dealer_verification_status,
    STRING_AGG(a.action || ' [' || a.conditions || ']', E'\n'
               ORDER BY a.action_order) AS possible_actions
FROM app.users u
LEFT JOIN app.dealer_profiles dp ON dp.user_id = u.user_id
JOIN action_catalog a
    ON u.user_role = ANY(a.user_roles)
   AND (NOT a.requires_sign_in OR u.account_status = 'active')
   AND (NOT a.requires_dealer_profile OR dp.dealer_id IS NOT NULL)
   AND (NOT a.requires_verified_dealer OR dp.verification_status = 'verified')
-- Optional: uncomment ONE filter below to inspect a role or one account.
-- WHERE u.user_role = 'dealer'
-- WHERE u.user_id = 1
GROUP BY u.user_id, u.full_name, u.email, u.user_role, u.account_status,
         dp.dealership_name, dp.verification_status
ORDER BY u.created_at DESC, u.user_id DESC;
