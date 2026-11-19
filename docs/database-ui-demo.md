# Database features demonstrated through the UI

Use a new temporary demo vehicle for deletion. These actions permanently remove records; do not use inventory you want to keep. Customer and dealer sessions can be opened in separate browser profiles or a normal/incognito window. Tabs in one browser profile share the same login.

## Timestamp trigger

1. Sign in as a dealer and open `/dealer`. Publish a temporary vehicle if needed.
2. Note the listing's **Created** and **Last updated** timestamps (IST, including seconds).
3. Wait until the next second, change its asking price and select **Save price**.
4. **Last updated** advances; **Created** stays unchanged.
5. Refresh that vehicle's customer listing page. It shows the updated price and timestamp too.

Code to show, in execution order:

- `frontend/app/dealer/dealer-client.tsx`: price form and `updateListing` handler.
- `frontend/app/actions.ts`: `updateListingAction`.
- `frontend/lib/server/update-listing.ts`: SQL `UPDATE`; it does not assign `updated_at`.
- `database/schema/14_advanced_database_features.sql`: `set_updated_at()` and `trg_vehicle_listings_set_updated_at`. PostgreSQL assigns `NEW.updated_at` automatically before the update.
- `frontend/components/listing-timestamps.tsx`: displays the actual stored values, without generating a replacement timestamp in the UI.

## Function and ON DELETE CASCADE

1. Give the temporary vehicle a photo. Open its customer page and, with a customer account, submit an enquiry or offer.
2. Keep the customer page URL so you can revisit it after deletion.
3. In the owning dealer's inventory select **Delete vehicle**, then confirm the permanent deletion.
4. The vehicle disappears from dealer inventory and the totals refresh.
5. Refresh customer browsing and the saved detail URL: the vehicle is absent and the detail page reports that the active listing was not found. Refresh **My offers**: offers for the deleted vehicle are gone too.

Code to show:

- `frontend/app/dealer/dealer-client.tsx`: confirmation and `removeVehicle`.
- `frontend/app/actions.ts`: `deleteVehicleAction`.
- `frontend/lib/server/delete-vehicle.ts`: session/role validation and `SELECT app.delete_own_vehicle($1)`.
- `database/schema/21_vehicle_delete_cascade.sql`: database function checks ownership, locks the dealer/vehicle and executes a single `DELETE FROM app.vehicles`. The vehicle-to-listing FK has `ON DELETE CASCADE`.
- `database/schema/06_create_inventory_tables.sql`: listing-to-image cascade.
- `database/schema/13_create_listing_price_estimates.sql`: listing-to-estimate cascade.
- `database/schema/15_create_listing_embeddings.sql`: listing-to-vector cascade.
- `database/schema/16_create_marketplace_interactions.sql`: image-to-image-bytes and listing-to-enquiry/offer cascades.

The chain is:

```text
vehicle -> all current/historical listings
           -> listing images -> uploaded image bytes
           -> price estimates
           -> semantic-search embeddings
           -> enquiries / test-drive requests / offers
```

Shared manufacturers, models, variants and fuel-economy references remain, as do user/dealer accounts and other vehicles. These are parent/reference records, not children of the deleted vehicle.

The browser change demonstrates the visible result; show the FK definitions to establish that PostgreSQL performs the dependent deletion. An optional pgAdmin check of the captured listing/image IDs can prove their child rows are gone. The integration test creates each dependent record type and checks all cascade paths in a disposable database.

Customer pages already open in another browser need a refresh. This feature does not broadcast live deletion events between browsers. Database reads and mutations continue to use Server Components and Server Actions, without custom REST routes.

## Existing registration function

Register a dealer at `/account`, then sign in as admin at `/admin` to see its pending dealership. Show `registerAction`, `frontend/lib/server/register.ts`, then `app.register_account()` in schema 20. The database function creates the user and linked dealer profile together.

## Schema and permission notes

Schema 21 updates the vehicle-to-listing delete rule but adds no entities or PK/FK relationships. Diagram layout/cardinalities remain the same. Direct runtime table DELETE permissions remain denied; only the narrowly authorized `delete_own_vehicle` function is executable by the runtime role. Apply schema 21 through `npm.cmd run setup:local` when setting up another existing checkout.
