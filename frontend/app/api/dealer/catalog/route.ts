import { connection, NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
} from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sign in to view the vehicle catalogue" },
        { status: 401 }
      );
    }
    if (user.user_role !== "dealer" || !user.dealer_id) {
      return NextResponse.json(
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

    return NextResponse.json({ success: true, variants: result.rows });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Dealer catalogue API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load the vehicle catalogue" },
      { status: 500 }
    );
  }
}
