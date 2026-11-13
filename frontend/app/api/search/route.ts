import { NextRequest, NextResponse } from "next/server";
import { embedText } from "../../../lib/embeddings";
import { pool } from "../../../lib/db";

const FUEL_TYPES = [
  "Petrol",
  "Diesel",
  "CNG",
  "LPG",
  "Electric",
  "Hybrid",
];
const TRANSMISSIONS = [
  "Manual",
  "Automatic",
  "AMT",
  "CVT",
  "DCT",
  "Single-speed",
];

export async function POST(request: NextRequest) {
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "A valid JSON request body is required" },
      { status: 400 }
    );
  }

  if (
    parsedBody === null ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { success: false, message: "The request body must be a JSON object" },
      { status: 400 }
    );
  }

  const body = parsedBody as Record<string, unknown>;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const cityId = body.city_id;
  const maxPrice = body.max_price;
  const fuelType = body.fuel_type;
  const transmission = body.transmission;

  if (query.length < 3 || query.length > 500) {
    return NextResponse.json(
      {
        success: false,
        message: "Search text must be between 3 and 500 characters",
      },
      { status: 400 }
    );
  }

  if (
    cityId !== undefined &&
    cityId !== null &&
    (typeof cityId !== "number" ||
      !Number.isSafeInteger(cityId) ||
      cityId <= 0)
  ) {
    return NextResponse.json(
      { success: false, message: "city_id must be a positive integer" },
      { status: 400 }
    );
  }

  if (
    maxPrice !== undefined &&
    maxPrice !== null &&
    (typeof maxPrice !== "number" || !Number.isFinite(maxPrice) || maxPrice <= 0)
  ) {
    return NextResponse.json(
      { success: false, message: "max_price must be a positive number" },
      { status: 400 }
    );
  }

  if (
    fuelType !== undefined &&
    fuelType !== null &&
    (typeof fuelType !== "string" ||
      !FUEL_TYPES.some((value) => value.toLowerCase() === fuelType.toLowerCase()))
  ) {
    return NextResponse.json(
      { success: false, message: "fuel_type is not supported" },
      { status: 400 }
    );
  }

  if (
    transmission !== undefined &&
    transmission !== null &&
    (typeof transmission !== "string" ||
      !TRANSMISSIONS.some(
        (value) => value.toLowerCase() === transmission.toLowerCase()
      ))
  ) {
    return NextResponse.json(
      { success: false, message: "transmission is not supported" },
      { status: 400 }
    );
  }

  try {
    const embedding = await embedText(query);
    const vector = `[${embedding.join(",")}]`;
    const result = await pool.query(
      `
      SELECT
        ald.listing_id,
        ald.asking_price,
        ald.description,
        ald.source_type,
        ald.estimated_price,
        ald.lower_price,
        ald.upper_price,
        ald.vehicle_id,
        ald.manufacturing_year,
        ald.kms_driven,
        ald.colour,
        ald.ownership_count,
        ald.condition,
        ald.variant_name,
        ald.fuel_type,
        ald.transmission,
        ald.model_name,
        ald.manufacturer_name,
        ald.dealership_name,
        ald.city_name,
        1 - (embedding.embedding <=> $1::vector) AS similarity,
        COALESCE(images.images, '[]'::json) AS images
      FROM app.listing_embeddings embedding
      JOIN app.active_listing_details ald
        ON ald.listing_id = embedding.listing_id
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
        WHERE li.listing_id = ald.listing_id
      ) images ON TRUE
      WHERE ($2::SMALLINT IS NULL OR ald.city_id = $2)
        AND ($3::NUMERIC IS NULL OR ald.asking_price <= $3)
        AND ($4::TEXT IS NULL OR LOWER(ald.fuel_type) = LOWER($4))
        AND ($5::TEXT IS NULL OR LOWER(ald.transmission) = LOWER($5))
      ORDER BY embedding.embedding <=> $1::vector, ald.listing_id
      LIMIT 20;
      `,
      [vector, cityId ?? null, maxPrice ?? null, fuelType ?? null, transmission ?? null]
    );

    return NextResponse.json({
      success: true,
      query,
      count: result.rows.length,
      listings: result.rows,
    });
  } catch (error) {
    console.error("Semantic search API error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to complete semantic vehicle search" },
      { status: 500 }
    );
  }
}
