-- Read-only inspection of the IMPLEMENTED PostgreSQL permissions.
-- Run as your pgAdmin maintenance/administrator login after db:security.
-- Unlike the descriptive role/action report, these results come from PostgreSQL
-- privilege and policy catalogues. Each SELECT can be run separately.

-- 1. The web application login must have no administrative or RLS bypass flags.
SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
FROM pg_roles
WHERE rolname IN ('autohubiq_app', 'autohubiq_runtime')
ORDER BY rolname;

-- 2. Actual table and column grants, including password-hash SELECT denial.
SELECT
    has_schema_privilege('autohubiq_runtime', 'app', 'USAGE') AS can_use_app_schema,
    has_table_privilege('autohubiq_runtime', 'app.vehicle_listings', 'SELECT') AS can_select_listing_rows,
    has_column_privilege('autohubiq_runtime', 'app.vehicle_listings', 'asking_price', 'UPDATE') AS can_update_price_subject_to_rls,
    has_table_privilege('autohubiq_runtime', 'app.vehicle_listings', 'DELETE') AS can_delete_listings,
    has_column_privilege('autohubiq_runtime', 'app.users', 'user_role', 'UPDATE') AS can_change_account_roles,
    has_column_privilege('autohubiq_runtime', 'app.users', 'password_hash', 'SELECT') AS can_select_password_hashes;

-- 3. RLS is enabled on base tables. Owners/superusers still bypass it by design;
-- the web login must use autohubiq_app, not your pgAdmin administrator login.
SELECT c.relname AS table_name, c.relrowsecurity AS row_security_enabled,
       pg_get_userbyid(c.relowner) AS table_owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app' AND c.relkind = 'r'
ORDER BY c.relname;

-- 4. Read the policies: role checks and record ownership are in qual/with_check.
SELECT tablename, policyname, roles, cmd, qual AS existing_row_rule,
       with_check AS new_row_rule
FROM pg_policies
WHERE schemaname = 'app'
ORDER BY tablename, policyname;

-- 5. Column-level grants limit which fields the runtime may change.
SELECT table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'app' AND grantee = 'autohubiq_runtime'
ORDER BY table_name, privilege_type, column_name;

-- 6. Controlled definer functions must have an explicit trusted search_path and
-- explicit execution ACLs, not the default PUBLIC EXECUTE permission.
SELECT p.proname AS function_name, p.prosecdef AS security_definer,
       p.proconfig AS function_settings, p.proacl AS execute_privileges
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app' AND p.prosecdef
ORDER BY p.proname;

-- For an interactive demo use a separate query tab, BEGIN, SET LOCAL ROLE
-- autohubiq_runtime, and SELECT set_config('app.user_id','<a real user_id>',true).
-- Then SELECT app.actor_role() and SELECT user_id,user_role FROM app.users.
-- End with ROLLBACK. As an administrator, setting a demo identity is trusted;
-- the website sets it only after validating the signed session. Do not expose
-- either database password or allow arbitrary SQL from website users.
