import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
} from "../auth";
import { pool } from "../db";

export const getDealerCatalog = withDatabaseContext(async function getDealerCatalog() {

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return reply(
        { success: false, message: "Sign in to view the vehicle catalogue" },
        { status: 401 }
      );
    }
    if (user.user_role !== "dealer" || !user.dealer_id) {
      return reply(
        { success: false, message: "A dealer account is required" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        vv.variant_id,
        vv.variant_name,
        vv.fuel_type,
        vv.transmission,
        vm.model_name,
        vm.body_type,
        m.manufacturer_name
      FROM app.vehicle_variants vv
      JOIN app.vehicle_models vm
        ON vm.model_id = vv.model_id
      JOIN app.manufacturers m
        ON m.manufacturer_id = vm.manufacturer_id
      ORDER BY m.manufacturer_name, vm.model_name, vv.variant_name
      `
    );

    return reply({ success: true, variants: result.rows });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return reply(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Dealer catalogue error:", error);
    return reply(
      { success: false, message: "Unable to load the vehicle catalogue" },
      { status: 500 }
    );
  }
});
