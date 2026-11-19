import { withDatabaseContext } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../../lib/db";

export const GET = withDatabaseContext(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;
  const parsedListingId = Number(listingId);

  if (!Number.isSafeInteger(parsedListingId) || parsedListingId <= 0) {
    return NextResponse.json(
      { success: false, message: "A valid listing ID is required" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `
      SELECT
        vl.listing_id,
        vl.asking_price,
        vl.description,
        vl.source_type,
        vl.source_url,
        v.vehicle_id,
        v.manufacturing_year,
        v.registration_year,
        v.kms_driven,
        to_jsonb(fe) AS fuel_economy,
        v.colour,
        v.ownership_count,
        v.condition,
        vv.variant_name,
        vv.fuel_type,
        vv.transmission,
        vv.engine_displacement_cc,
        vv.battery_capacity_kwh,
        vv.seating_capacity,
        vm.model_name,
        vm.body_type,
        m.manufacturer_name,
        dp.dealership_name,
        c.city_name,
        COALESCE(img.images, '[]'::json) AS images,
        estimate.estimated_price,
        estimate.lower_price,
        estimate.upper_price,
        estimate.methodology,
        estimate.source_summary,
        estimate.source_url AS estimate_source_url,
        estimate.assessed_at
      FROM app.vehicle_listings vl
      JOIN app.vehicles v
        ON vl.vehicle_id = v.vehicle_id
      JOIN app.vehicle_variants vv
        ON v.variant_id = vv.variant_id
      LEFT JOIN app.fuel_economy_references fe
        ON fe.variant_id = v.variant_id AND fe.model_year = v.manufacturing_year
      JOIN app.vehicle_models vm
        ON vv.model_id = vm.model_id
      JOIN app.manufacturers m
        ON vm.manufacturer_id = m.manufacturer_id
      JOIN app.dealer_profiles dp
        ON v.dealer_id = dp.dealer_id
      JOIN app.cities c
        ON dp.city_id = c.city_id
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'image_id', li.image_id,
            'image_url', li.image_url,
            'is_primary', li.is_primary
          )
          ORDER BY li.display_order
        ) AS images
        FROM app.listing_images li
        WHERE li.listing_id = vl.listing_id
      ) img ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          lpe.estimated_price,
          lpe.lower_price,
          lpe.upper_price,
          lpe.methodology,
          lpe.source_summary,
          lpe.source_url,
          lpe.assessed_at
        FROM app.listing_price_estimates lpe
        WHERE lpe.listing_id = vl.listing_id
        ORDER BY lpe.assessed_at DESC, lpe.estimate_id DESC
        LIMIT 1
      ) estimate ON TRUE
      WHERE vl.listing_id = $1
        AND vl.listing_status = 'active';
      `,
      [parsedListingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Active listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      listing: result.rows[0],
    });
  } catch (error) {
    console.error("Listing details API error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch listing details" },
      { status: 500 }
    );
  }
});
