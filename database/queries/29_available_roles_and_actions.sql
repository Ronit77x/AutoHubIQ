-- READ ONLY presentation report of existing application permissions.
-- This VALUES CTE documents backend rules; it does not create PostgreSQL roles,
-- GRANT privileges, enable RLS, or enforce authorization in the database.
-- No schema changes: existing ER diagrams and relational mappings stay unchanged.
-- Role-specific operations require an active account and a valid signed session.
-- Ownership, target listing/offer state, input validation and rate limits are
-- still checked at request time; the reports do not grant unconditional access.
-- Verified against frontend/app/api and frontend/lib/auth.ts, 19 November 2026.
-- Note: enquiry/test_drive currently permit all authenticated roles, while offers
-- are customer-only. Admin does not inherit dealer publishing permissions.

-- Run this entire file in pgAdmin Query Tool to see all three available roles,
-- including a role with no registered accounts. Actions and conditions are paired.
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
),
available_roles (user_role) AS (
    VALUES ('customer'), ('dealer'), ('admin')
)
SELECT
    r.user_role,
    (SELECT COUNT(*) FROM app.users u WHERE u.user_role = r.user_role) AS account_count,
    STRING_AGG(a.action || ' [' || a.conditions || ']', E'\n'
               ORDER BY a.action_order) AS possible_actions
FROM available_roles r
JOIN action_catalog a ON r.user_role = ANY(a.user_roles)
GROUP BY r.user_role
ORDER BY CASE r.user_role WHEN 'customer' THEN 1 WHEN 'dealer' THEN 2 ELSE 3 END;
