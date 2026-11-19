import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { getAuthenticatedUser } from "../auth";
import { pool } from "../db";

export const getOffers = withDatabaseContext(async function getOffers() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return reply({ message: "Sign in to view your offers" }, { status: 401 });
    if (user.user_role !== "customer") return reply({ message: "A customer account is required" }, { status: 403 });
    const result = await pool.query(`SELECT e.enquiry_id, e.listing_id, e.offer_amount, e.message, e.phone,
      e.created_at, e.updated_at, e.contacted_at, vl.listing_status, dp.dealership_name,
      (e.contacted_at IS NULL AND vl.listing_status='active' AND dp.verification_status='verified') AS editable,
      m.manufacturer_name, vm.model_name, v.manufacturing_year
      FROM app.listing_enquiries e
      JOIN app.vehicle_listings vl USING(listing_id)
      JOIN app.vehicles v USING(vehicle_id)
      JOIN app.dealer_profiles dp USING(dealer_id)
      JOIN app.vehicle_variants vv USING(variant_id)
      JOIN app.vehicle_models vm USING(model_id)
      JOIN app.manufacturers m USING(manufacturer_id)
      WHERE e.user_id=$1 AND e.request_type='offer'
      ORDER BY e.created_at DESC, e.enquiry_id DESC`, [user.user_id]);
    return reply({ offers: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Buyer offers failed:", error);
    return reply({ message: "Unable to load your offers" }, { status: 500 });
  }
});
