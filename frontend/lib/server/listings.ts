import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";

import { pool } from "../db";

export const getListings = withDatabaseContext(async function getListings(filters: Record<string, string>) {

  try {
    const cityId = Number(
      new URLSearchParams(filters).get("city_id")
    );

    if (!Number.isInteger(cityId) || cityId <= 0) {
      return reply(
        {
          success: false,
          message: "A valid city_id is required",
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams(filters);
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("page_size") ?? 12);
    const maxPrice = params.get("max_price") ? Number(params.get("max_price")) : null;
    const fuel = params.get("fuel_type") || null;
    const transmission = params.get("transmission") || null;
    const sort = params.get("sort") ?? "newest";
    const orders: Record<string, string> = {
      newest: "vl.published_at DESC NULLS LAST, vl.listing_id DESC",
      price_asc: "vl.asking_price ASC, vl.listing_id DESC",
      price_desc: "vl.asking_price DESC, vl.listing_id DESC",
      mileage_asc: "v.kms_driven ASC, vl.listing_id DESC",
      distance_asc: "v.kms_driven ASC, vl.listing_id DESC",
      fuel_economy_desc: "CASE WHEN fe.unit = 'kmpl' THEN fe.value_low END DESC NULLS LAST, vl.listing_id DESC",
    };
    if (cityId > 32767 || !Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48 ||
      (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice <= 0)) ||
      (fuel && !["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid"].includes(fuel)) ||
      (transmission && !["Manual", "Automatic", "AMT", "CVT", "DCT", "Single-speed"].includes(transmission)) || !Object.hasOwn(orders, sort)) {
      return reply({ success: false, message: "Invalid filters, sort order or page" }, { status: 400 });
    }
    const result = await pool.query(
      `
      SELECT
        vl.listing_id,
        vl.asking_price,
        vl.description,
        vl.source_type,
        estimate.estimated_price,
        estimate.lower_price,
        estimate.upper_price,
        v.vehicle_id,
        v.manufacturing_year,
        v.kms_driven,
        to_jsonb(fe) AS fuel_economy,
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
          lpe.upper_price
        FROM app.listing_price_estimates lpe
        WHERE lpe.listing_id = vl.listing_id
        ORDER BY lpe.assessed_at DESC, lpe.estimate_id DESC
        LIMIT 1
      ) estimate ON TRUE

      WHERE vl.listing_status = 'active'
        AND dp.city_id = $1
        AND ($2::numeric IS NULL OR vl.asking_price <= $2)
        AND ($3::text IS NULL OR vv.fuel_type = $3)
        AND ($4::text IS NULL OR vv.transmission = $4)
      ORDER BY ${orders[sort]}
      LIMIT $5 OFFSET $6;
      `,
      [cityId, maxPrice, fuel, transmission, pageSize + 1, (page - 1) * pageSize]
    );

    return reply({
      success: true,
      count: Math.min(result.rows.length, pageSize),
      page,
      has_more: result.rows.length > pageSize,
      listings: result.rows.slice(0, pageSize),
    });

  } catch (error) {
    console.error("Listings error:", error);

    return reply(
      {
        success: false,
        message: "Unable to fetch vehicle listings",
      },
      { status: 500 }
    );
  }
});
