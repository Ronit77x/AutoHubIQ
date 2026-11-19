import "server-only";
import { getAuthenticatedUser } from "../auth";
import { pool, withDatabaseContext } from "../db";
import { result } from "./result";

export const deleteVehicle = withDatabaseContext(async function deleteVehicle(vehicleId: string) {
  if (typeof vehicleId !== "string" || !/^[1-9]\d{0,14}$/.test(vehicleId)) {
    return result({ success: false, message: "A valid vehicle ID is required" }, { status: 400 });
  }
  try {
    const user = await getAuthenticatedUser();
    if (!user) return result({ success: false, message: "Sign in to delete a vehicle" }, { status: 401 });
    if (user.user_role !== "dealer" || !user.dealer_id) {
      return result({ success: false, message: "A dealer account is required" }, { status: 403 });
    }
    // The database rechecks ownership and deletes only the vehicle parent.
    // Foreign-key ON DELETE CASCADE rules remove every dependent record.
    const deleted = await pool.query<{ deleted: boolean }>(
      "SELECT app.delete_own_vehicle($1) AS deleted", [vehicleId]);
    if (!deleted.rows[0].deleted) {
      return result({ success: false, message: "Vehicle not found in your inventory" }, { status: 404 });
    }
    return result({ success: true, message: "Vehicle and its listings, photos, estimates, search data and buyer requests deleted." });
  } catch (error) {
    console.error("Vehicle deletion failed:", error);
    return result({ success: false, message: "Unable to delete the vehicle" }, { status: 500 });
  }
});
