-- Run as the database owner/administrator. No business entities are added.
-- Application identity is supplied ONLY by the trusted backend after verifying
-- its signed session. A person holding the runtime database password is inside
-- that trust boundary and must never be treated as an untrusted end user.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'autohubiq_runtime') THEN
    CREATE ROLE autohubiq_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

REVOKE CREATE ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO autohubiq_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM autohubiq_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM autohubiq_runtime;

CREATE OR REPLACE FUNCTION app.actor_id() RETURNS bigint
LANGUAGE sql STABLE SET search_path = pg_catalog, pg_temp
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::bigint $$;

CREATE OR REPLACE FUNCTION app.actor_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT user_role::text FROM app.users
      WHERE user_id = app.actor_id() AND account_status = 'active' $$;

CREATE OR REPLACE FUNCTION app.actor_dealer_id() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT dp.dealer_id FROM app.dealer_profiles dp JOIN app.users u USING(user_id)
      WHERE u.user_id = app.actor_id() AND u.user_role = 'dealer' AND u.account_status = 'active' $$;

CREATE OR REPLACE FUNCTION app.actor_verified() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT EXISTS(SELECT 1 FROM app.dealer_profiles
      WHERE dealer_id = app.actor_dealer_id() AND verification_status = 'verified') $$;

CREATE OR REPLACE FUNCTION app.owns_vehicle(p_vehicle bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT EXISTS(SELECT 1 FROM app.vehicles
      WHERE vehicle_id = p_vehicle AND dealer_id = app.actor_dealer_id()) $$;

CREATE OR REPLACE FUNCTION app.owns_listing(p_listing bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT EXISTS(SELECT 1 FROM app.vehicle_listings l
      WHERE l.listing_id = p_listing AND app.owns_vehicle(l.vehicle_id)) $$;

CREATE OR REPLACE FUNCTION app.can_read_listing(p_listing bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT EXISTS(SELECT 1 FROM app.vehicle_listings l WHERE l.listing_id = p_listing
      AND (l.listing_status = 'active' OR app.owns_vehicle(l.vehicle_id)
           OR app.actor_role() = 'admin' OR EXISTS(SELECT 1 FROM app.listing_enquiries e
             WHERE e.listing_id = l.listing_id AND e.user_id = app.actor_id() AND app.actor_role() IS NOT NULL))) $$;

CREATE OR REPLACE FUNCTION app.can_read_vehicle(p_vehicle bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT app.owns_vehicle(p_vehicle) OR app.actor_role() = 'admin'
      OR EXISTS(SELECT 1 FROM app.vehicle_listings l WHERE l.vehicle_id = p_vehicle
                AND app.can_read_listing(l.listing_id)) $$;

CREATE OR REPLACE FUNCTION app.can_read_user(p_user bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT app.actor_role() IS NOT NULL AND (p_user = app.actor_id() OR app.actor_role() = 'admin'
      OR EXISTS(SELECT 1 FROM app.listing_enquiries e
                WHERE e.user_id = p_user AND app.owns_listing(e.listing_id))) $$;

CREATE OR REPLACE FUNCTION app.can_contact_listing(p_listing bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT app.actor_role() IS NOT NULL AND EXISTS(
      SELECT 1 FROM app.vehicle_listings l JOIN app.vehicles v USING(vehicle_id)
      JOIN app.dealer_profiles dp USING(dealer_id)
      WHERE l.listing_id = p_listing AND l.listing_status = 'active'
        AND dp.verification_status = 'verified' AND dp.user_id <> app.actor_id()) $$;

-- Narrow service functions: hashes are not readable through table SELECT.
CREATE OR REPLACE FUNCTION app.login_account(p_email text)
RETURNS TABLE(user_id bigint, full_name varchar, email varchar, password_hash text, user_role varchar, account_status varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ SELECT u.user_id, u.full_name, u.email, u.password_hash::text, u.user_role, u.account_status
      FROM app.users u WHERE lower(u.email) = lower(p_email) $$;

CREATE OR REPLACE FUNCTION app.register_account(
  p_name text, p_email text, p_phone text, p_hash text, p_role text,
  p_dealership text, p_city integer, p_address text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ DECLARE new_id bigint; BEGIN
  IF p_role IS NULL OR p_role NOT IN ('customer','dealer') OR p_name IS NULL OR length(p_name) NOT BETWEEN 2 AND 120
     OR p_email IS NULL OR length(p_email) > 255 OR p_email NOT LIKE '%@%.%'
     OR p_hash IS NULL OR p_hash NOT LIKE 'scrypt$%' THEN
    RAISE EXCEPTION 'Invalid public registration' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'dealer' AND (p_dealership IS NULL OR length(p_dealership) NOT BETWEEN 2 AND 150
     OR p_address IS NULL OR length(p_address) < 5
     OR NOT EXISTS(SELECT 1 FROM app.cities WHERE city_id = p_city AND is_active)) THEN
    RAISE EXCEPTION 'Choose an active city and valid dealership details' USING ERRCODE = '22023';
  END IF;
  INSERT INTO app.users(full_name,email,phone,password_hash,user_role,account_status)
    VALUES(p_name,lower(p_email),p_phone,p_hash,p_role,'active') ON CONFLICT DO NOTHING RETURNING user_id INTO new_id;
  IF new_id IS NULL THEN RETURN NULL; END IF;
  IF p_role = 'dealer' THEN
    INSERT INTO app.dealer_profiles(user_id,city_id,dealership_name,business_phone,business_email,street_address,verification_status)
      VALUES(new_id,p_city,p_dealership,p_phone,lower(p_email),p_address,'pending');
  END IF;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION app.consume_request_limit(p_hash text, p_seconds integer)
RETURNS TABLE(request_count integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_seconds IS NULL OR p_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit window' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY INSERT INTO app.request_limits AS r(key_hash,window_start,request_count)
    VALUES(p_hash,CURRENT_TIMESTAMP,1) ON CONFLICT(key_hash) DO UPDATE SET
    window_start = CASE WHEN r.window_start <= CURRENT_TIMESTAMP-make_interval(secs=>p_seconds) THEN CURRENT_TIMESTAMP ELSE r.window_start END,
    request_count = CASE WHEN r.window_start <= CURRENT_TIMESTAMP-make_interval(secs=>p_seconds) THEN 1 ELSE r.request_count+1 END
    RETURNING r.request_count;
END $$;

-- Lock all relevant rows without giving customers UPDATE on dealership/inventory
-- tables merely to support SELECT FOR UPDATE. Only the caller's offer is returned.
CREATE OR REPLACE FUNCTION app.lock_offer_context(p_offer bigint, p_contacting boolean)
RETURNS TABLE(contacted_at timestamptz, listing_status varchar, verification_status varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$ BEGIN
  RETURN QUERY SELECT e.contacted_at,l.listing_status,dp.verification_status
    FROM app.listing_enquiries e JOIN app.vehicle_listings l USING(listing_id)
    JOIN app.vehicles v USING(vehicle_id) JOIN app.dealer_profiles dp USING(dealer_id)
    WHERE e.enquiry_id=p_offer AND e.request_type='offer'
      AND ((p_contacting AND app.actor_role()='dealer' AND dp.user_id=app.actor_id())
        OR (NOT p_contacting AND app.actor_role()='customer' AND e.user_id=app.actor_id()))
    FOR UPDATE OF e,l,v,dp;
END $$;

-- Column-sensitive checks complement RLS, which is primarily row-sensitive.
CREATE OR REPLACE FUNCTION app.guard_listing_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$ BEGIN
  IF (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
     OR current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID))
     OR NOT pg_has_role(current_user,'autohubiq_runtime','member') THEN RETURN NEW; END IF;
  IF app.actor_role()='admin' THEN
    IF NEW.listing_status <> 'withdrawn' OR (to_jsonb(NEW)-'listing_status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'listing_status'-'updated_at') THEN
      RAISE EXCEPTION 'Admin listing changes are limited to withdrawal' USING ERRCODE='42501';
    END IF;
  ELSIF app.actor_role()='dealer' THEN
    IF NEW.listing_status='active' AND OLD.listing_status IS DISTINCT FROM 'active' AND NOT app.actor_verified() THEN
      RAISE EXCEPTION 'Verified dealer required to activate' USING ERRCODE='42501';
    END IF;
  ELSE RAISE EXCEPTION 'Dealer or admin required' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app.guard_offer_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
AS $$ BEGIN
  IF (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
     OR current_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID))
     OR NOT pg_has_role(current_user,'autohubiq_runtime','member') THEN RETURN NEW; END IF;
  IF app.actor_role()='customer' THEN
    IF OLD.request_type <> 'offer' OR OLD.contacted_at IS NOT NULL OR NOT app.can_contact_listing(OLD.listing_id)
       OR (to_jsonb(NEW)-'offer_amount'-'message'-'phone'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'offer_amount'-'message'-'phone'-'updated_at') THEN
      RAISE EXCEPTION 'Customer may edit only own eligible offer fields' USING ERRCODE='42501';
    END IF;
  ELSIF app.actor_role()='dealer' THEN
    IF OLD.request_type <> 'offer' OR NEW.contacted_at IS NULL
       OR (OLD.contacted_at IS NOT NULL AND NEW.contacted_at IS DISTINCT FROM OLD.contacted_at)
       OR (to_jsonb(NEW)-'contacted_at') IS DISTINCT FROM (to_jsonb(OLD)-'contacted_at') THEN
      RAISE EXCEPTION 'Dealer may only mark an offer contacted' USING ERRCODE='42501';
    END IF;
  ELSE RAISE EXCEPTION 'Customer or dealer required' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_listing_access_guard ON app.vehicle_listings;
CREATE TRIGGER trg_listing_access_guard BEFORE UPDATE ON app.vehicle_listings FOR EACH ROW EXECUTE FUNCTION app.guard_listing_update();
DROP TRIGGER IF EXISTS trg_offer_access_guard ON app.listing_enquiries;
CREATE TRIGGER trg_offer_access_guard BEFORE UPDATE ON app.listing_enquiries FOR EACH ROW EXECUTE FUNCTION app.guard_offer_update();

-- All helper EXECUTE ACLs are narrowed in the same transaction that creates them.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='app' AND p.proname IN ('actor_id','actor_role','actor_dealer_id','actor_verified',
      'owns_vehicle','owns_listing','can_read_listing','can_read_vehicle','can_read_user','can_contact_listing',
      'login_account','register_account','consume_request_limit','lock_offer_context','guard_listing_update','guard_offer_update')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO autohubiq_runtime',f.signature);
  END LOOP;
END $$;

GRANT SELECT ON app.cities,app.manufacturers,app.vehicle_models,app.vehicle_variants,
 app.fuel_economy_references,app.dealer_profiles,app.vehicles,app.vehicle_listings,
 app.listing_images,app.listing_image_data,app.listing_price_estimates,app.listing_embeddings,
 app.listing_enquiries,app.active_listing_details,app.dealer_inventory_summary TO autohubiq_runtime;
GRANT SELECT(user_id,full_name,email,phone,user_role,account_status,created_at,updated_at) ON app.users TO autohubiq_runtime;
GRANT INSERT ON app.vehicles,app.vehicle_listings,app.listing_images,app.listing_image_data,app.listing_embeddings,app.listing_enquiries TO autohubiq_runtime;
GRANT UPDATE(verification_status,updated_at) ON app.dealer_profiles TO autohubiq_runtime;
GRANT UPDATE(asking_price,listing_status,published_at,updated_at) ON app.vehicle_listings TO autohubiq_runtime;
GRANT UPDATE(image_url) ON app.listing_images TO autohubiq_runtime;
GRANT UPDATE(offer_amount,message,phone,updated_at,contacted_at) ON app.listing_enquiries TO autohubiq_runtime;
-- SELECT FOR UPDATE of the dealer's own profile needs an UPDATE policy as well.
GRANT USAGE ON SEQUENCE app.vehicles_vehicle_id_seq,app.vehicle_listings_listing_id_seq,
 app.listing_images_image_id_seq,app.listing_enquiries_enquiry_id_seq TO autohubiq_runtime;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['users','cities','manufacturers','vehicle_models','vehicle_variants','fuel_economy_references',
    'dealer_profiles','vehicles','vehicle_listings','listing_images','listing_image_data','listing_price_estimates',
    'listing_embeddings','listing_enquiries','request_limits']
  LOOP EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END $$;

-- PUBLIC catalogue/business profile reads are intentional. Private account fields,
-- unpublished inventory and interactions are controlled by the policies below.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cities','manufacturers','vehicle_models','vehicle_variants','fuel_economy_references','dealer_profiles']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS runtime_read ON app.%I',t);
    EXECUTE format('CREATE POLICY runtime_read ON app.%I FOR SELECT TO autohubiq_runtime USING (true)',t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS runtime_read ON app.users;
CREATE POLICY runtime_read ON app.users FOR SELECT TO autohubiq_runtime USING(app.can_read_user(user_id));
DROP POLICY IF EXISTS runtime_read ON app.vehicles;
CREATE POLICY runtime_read ON app.vehicles FOR SELECT TO autohubiq_runtime
  USING(dealer_id=app.actor_dealer_id() OR app.can_read_vehicle(vehicle_id));
DROP POLICY IF EXISTS runtime_insert ON app.vehicles;
CREATE POLICY runtime_insert ON app.vehicles FOR INSERT TO autohubiq_runtime WITH CHECK(dealer_id=app.actor_dealer_id() AND app.actor_verified());

DROP POLICY IF EXISTS runtime_update ON app.dealer_profiles;
CREATE POLICY runtime_update ON app.dealer_profiles FOR UPDATE TO autohubiq_runtime
  USING(app.actor_role()='admin' OR dealer_id=app.actor_dealer_id())
  WITH CHECK(app.actor_role()='admin');

DROP POLICY IF EXISTS runtime_read ON app.vehicle_listings;
CREATE POLICY runtime_read ON app.vehicle_listings FOR SELECT TO autohubiq_runtime
  USING(listing_status='active' OR app.owns_vehicle(vehicle_id) OR app.can_read_listing(listing_id));
DROP POLICY IF EXISTS runtime_insert ON app.vehicle_listings;
CREATE POLICY runtime_insert ON app.vehicle_listings FOR INSERT TO autohubiq_runtime WITH CHECK(app.owns_vehicle(vehicle_id) AND app.actor_verified());
DROP POLICY IF EXISTS runtime_update ON app.vehicle_listings;
CREATE POLICY runtime_update ON app.vehicle_listings FOR UPDATE TO autohubiq_runtime
  USING(app.owns_vehicle(vehicle_id) OR app.actor_role()='admin')
  WITH CHECK(app.owns_vehicle(vehicle_id) OR app.actor_role()='admin');

DROP POLICY IF EXISTS runtime_read ON app.listing_images;
CREATE POLICY runtime_read ON app.listing_images FOR SELECT TO autohubiq_runtime USING(app.can_read_listing(listing_id));
DROP POLICY IF EXISTS runtime_insert ON app.listing_images;
CREATE POLICY runtime_insert ON app.listing_images FOR INSERT TO autohubiq_runtime WITH CHECK(app.owns_listing(listing_id) AND app.actor_verified());
DROP POLICY IF EXISTS runtime_update ON app.listing_images;
CREATE POLICY runtime_update ON app.listing_images FOR UPDATE TO autohubiq_runtime
  USING(app.owns_listing(listing_id) AND app.actor_verified()) WITH CHECK(app.owns_listing(listing_id) AND app.actor_verified());

DROP POLICY IF EXISTS runtime_read ON app.listing_image_data;
CREATE POLICY runtime_read ON app.listing_image_data FOR SELECT TO autohubiq_runtime
  USING(EXISTS(SELECT 1 FROM app.listing_images i WHERE i.image_id=listing_image_data.image_id AND app.can_read_listing(i.listing_id)));
DROP POLICY IF EXISTS runtime_insert ON app.listing_image_data;
CREATE POLICY runtime_insert ON app.listing_image_data FOR INSERT TO autohubiq_runtime
  WITH CHECK(app.actor_verified() AND EXISTS(SELECT 1 FROM app.listing_images i WHERE i.image_id=listing_image_data.image_id AND app.owns_listing(i.listing_id)));

DROP POLICY IF EXISTS runtime_read ON app.listing_price_estimates;
CREATE POLICY runtime_read ON app.listing_price_estimates FOR SELECT TO autohubiq_runtime USING(app.can_read_listing(listing_id));
DROP POLICY IF EXISTS runtime_read ON app.listing_embeddings;
CREATE POLICY runtime_read ON app.listing_embeddings FOR SELECT TO autohubiq_runtime USING(app.can_read_listing(listing_id));
DROP POLICY IF EXISTS runtime_insert ON app.listing_embeddings;
CREATE POLICY runtime_insert ON app.listing_embeddings FOR INSERT TO autohubiq_runtime WITH CHECK(app.owns_listing(listing_id) AND app.actor_verified());

DROP POLICY IF EXISTS runtime_read ON app.listing_enquiries;
CREATE POLICY runtime_read ON app.listing_enquiries FOR SELECT TO autohubiq_runtime
  USING((user_id=app.actor_id() AND app.actor_role() IS NOT NULL) OR app.owns_listing(listing_id) OR app.actor_role()='admin');
DROP POLICY IF EXISTS runtime_insert ON app.listing_enquiries;
CREATE POLICY runtime_insert ON app.listing_enquiries FOR INSERT TO autohubiq_runtime
  WITH CHECK(user_id=app.actor_id() AND app.can_contact_listing(listing_id) AND (request_type<>'offer' OR app.actor_role()='customer'));
DROP POLICY IF EXISTS runtime_update ON app.listing_enquiries;
CREATE POLICY runtime_update ON app.listing_enquiries FOR UPDATE TO autohubiq_runtime
  USING((app.actor_role()='customer' AND user_id=app.actor_id() AND request_type='offer')
     OR (app.actor_role()='dealer' AND app.owns_listing(listing_id) AND request_type='offer'))
  WITH CHECK((app.actor_role()='customer' AND user_id=app.actor_id() AND request_type='offer')
     OR (app.actor_role()='dealer' AND app.owns_listing(listing_id) AND request_type='offer'));

-- No direct request_limits policy/grants: access only via consume_request_limit.
-- Prevent views owned by the administrator from bypassing underlying RLS.
ALTER VIEW app.active_listing_details SET (security_invoker=true);
ALTER VIEW app.dealer_inventory_summary SET (security_invoker=true);
COMMIT;
