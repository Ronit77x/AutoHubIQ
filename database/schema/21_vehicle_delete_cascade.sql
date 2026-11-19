-- Deleting a physical vehicle removes all of its historical/current listings.
-- Existing listing FKs cascade to images, image bytes, estimates, vectors and
-- enquiries/offers. Shared catalogue rows are parents and are never deleted.
BEGIN;

ALTER TABLE app.vehicle_listings
    DROP CONSTRAINT fk_vehicle_listings_vehicle;
ALTER TABLE app.vehicle_listings
    ADD CONSTRAINT fk_vehicle_listings_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES app.vehicles(vehicle_id)
    ON DELETE CASCADE;

-- A narrow deletion function preserves the restricted runtime role's lack of
-- direct table DELETE privileges. Identity comes from the verified session.
CREATE OR REPLACE FUNCTION app.delete_own_vehicle(p_vehicle_id bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    owner_dealer bigint;
BEGIN
    SELECT dp.dealer_id INTO owner_dealer
    FROM app.dealer_profiles dp JOIN app.users u USING (user_id)
    WHERE u.user_id = app.actor_id()
      AND u.user_role = 'dealer' AND u.account_status = 'active'
    FOR UPDATE OF dp, u;
    IF owner_dealer IS NULL THEN
        RAISE EXCEPTION 'An active dealer account is required'
            USING ERRCODE = '42501';
    END IF;

    PERFORM 1 FROM app.vehicles
    WHERE vehicle_id = p_vehicle_id AND dealer_id = owner_dealer
    FOR UPDATE;
    IF NOT FOUND THEN RETURN false; END IF;

    -- This is the only DELETE statement: PostgreSQL deletes the children.
    DELETE FROM app.vehicles
    WHERE vehicle_id = p_vehicle_id AND dealer_id = owner_dealer;
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION app.delete_own_vehicle(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.delete_own_vehicle(bigint) TO autohubiq_runtime;

COMMIT;
