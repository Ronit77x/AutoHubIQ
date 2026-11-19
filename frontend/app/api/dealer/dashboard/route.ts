import { withDatabaseContext } from "../../../../lib/db";
import { connection, NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
} from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export const GET = withDatabaseContext(async function GET(request: NextRequest) {
  await connection();

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sign in to view the dealer dashboard" },
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
        dp.dealer_id,
        dp.dealership_name,
        dp.street_address,
        dp.verification_status,
        c.city_name,
        c.state_name,
        summary.active_listing_count,
        summary.active_asking_price_total,
        summary.active_average_asking_price
      FROM app.dealer_profiles dp
      JOIN app.cities c
        ON c.city_id = dp.city_id
      JOIN app.dealer_inventory_summary summary
        ON summary.dealer_id = dp.dealer_id
      WHERE dp.dealer_id = $1
      `,
      [user.dealer_id]
    );

    if (result.rowCount !== 1) {
      return NextResponse.json(
        { success: false, message: "Dealer profile not found" },
        { status: 404 }
      );
    }

    const listings = await pool.query(
      `
      SELECT
        vl.listing_id,
        vl.asking_price,
        vl.description,
        vl.listing_status,
        vl.created_at,
        v.vehicle_id,
        v.manufacturing_year,
        v.kms_driven,
        to_jsonb(fe) AS fuel_economy,
        vv.fuel_type,
        v.colour,
        v.condition,
        vv.variant_name,
        vm.model_name,
        m.manufacturer_name,
        COALESCE(img.image_url, '') AS image_url
      FROM app.vehicle_listings vl
      JOIN app.vehicles v
        ON v.vehicle_id = vl.vehicle_id
      JOIN app.vehicle_variants vv
        ON vv.variant_id = v.variant_id
      LEFT JOIN app.fuel_economy_references fe
        ON fe.variant_id = v.variant_id AND fe.model_year = v.manufacturing_year
      JOIN app.vehicle_models vm
        ON vm.model_id = vv.model_id
      JOIN app.manufacturers m
        ON m.manufacturer_id = vm.manufacturer_id
      LEFT JOIN LATERAL (
        SELECT li.image_url
        FROM app.listing_images li
        WHERE li.listing_id = vl.listing_id
        ORDER BY li.is_primary DESC, li.display_order
        LIMIT 1
      ) img ON TRUE
      WHERE v.dealer_id = $1
      ORDER BY vl.created_at DESC, vl.listing_id DESC
      `,
      [user.dealer_id]
    );

    const enquiries = await pool.query(`SELECT e.enquiry_id, e.listing_id, e.message, e.phone,
      e.request_type, e.offer_amount, e.contacted_at, e.updated_at, e.created_at, u.full_name, u.email,
      m.manufacturer_name, vm.model_name
      FROM app.listing_enquiries e
      JOIN app.users u ON u.user_id=e.user_id
      JOIN app.vehicle_listings vl ON vl.listing_id=e.listing_id
      JOIN app.vehicles v ON v.vehicle_id=vl.vehicle_id
      JOIN app.vehicle_variants vv ON vv.variant_id=v.variant_id
      JOIN app.vehicle_models vm ON vm.model_id=vv.model_id
      JOIN app.manufacturers m ON m.manufacturer_id=vm.manufacturer_id
      WHERE v.dealer_id=$1 ORDER BY e.created_at DESC, e.enquiry_id DESC LIMIT 100`, [user.dealer_id]);

    return NextResponse.json({
      success: true,
      profile: result.rows[0],
      listings: listings.rows,
      enquiries: enquiries.rows,
    });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Dealer dashboard API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load dealer inventory" },
      { status: 500 }
    );
  }
});
