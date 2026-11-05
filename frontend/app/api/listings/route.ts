
import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const cityId = Number(
      request.nextUrl.searchParams.get("city_id")
    );

    if (!Number.isInteger(cityId) || cityId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid city_id is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        vl.listing_id,
        vl.asking_price,
        vl.description,
        vl.source_type,
        v.vehicle_id,
        v.manufacturing_year,
        v.kms_driven,
        v.colour,
        v.ownership_count,
        v.condition,
        vv.variant_name,
        vv.fuel_type,
        vv.transmission,
        vm.model_name,
        m.manufacturer_name,
        dp.dealership_name,
        c.city_name,
        COALESCE(img.images, '[]'::json) AS images

      FROM app.vehicle_listings vl

      JOIN app.vehicles v
        ON vl.vehicle_id = v.vehicle_id

      JOIN app.vehicle_variants vv
        ON v.variant_id = vv.variant_id

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

      WHERE vl.listing_status = 'active'
        AND dp.city_id = $1

      ORDER BY vl.published_at DESC NULLS LAST,
               vl.created_at DESC;
      `,
      [cityId]
    );

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      listings: result.rows,
    });

  } catch (error) {
    console.error("Listings API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch vehicle listings",
      },
      { status: 500 }
    );
  }
}
