import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { embedText } from "../embeddings";
import { pool } from "../db";
import { rateLimit } from "../rate-limit";
import { parseSearchIntent } from "../search-intent";

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

export const searchListings = withDatabaseContext(async function searchListings(input: unknown) {
  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(JSON.stringify(input ?? null));
  } catch {
    return reply(
      { success: false, message: "A valid JSON request body is required" },
      { status: 400 }
    );
  }

  if (
    parsedBody === null ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return reply(
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
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 12;
  if (typeof page !== "number" || !Number.isInteger(page) || page < 1 || page > 10000 ||
    typeof pageSize !== "number" || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48 ||
    (typeof cityId === "number" && cityId > 32767)) {
    return reply({ success: false, message: "Invalid page or city" }, { status: 400 });
  }

  if (query.length < 3 || query.length > 500) {
    return reply(
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
    return reply(
      { success: false, message: "city_id must be a positive integer" },
      { status: 400 }
    );
  }

  if (
    maxPrice !== undefined &&
    maxPrice !== null &&
    (typeof maxPrice !== "number" || !Number.isFinite(maxPrice) || maxPrice <= 0)
  ) {
    return reply(
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
    return reply(
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
    return reply(
      { success: false, message: "transmission is not supported" },
      { status: 400 }
    );
  }

  try {
    // Anonymous model work shares a global budget; deployments can add trusted edge IP limits.
    const limited = await rateLimit("semantic-search", 120, 60);
    if (limited) return limited;
    const intent = parseSearchIntent(query);
    const effectiveFuel = fuelType ?? intent.fuel;
    // Explicit EV/CNG/LPG requests compare like units. A generic mileage query
    // compares kmpl only; range per charge must never outrank km per litre.
    const economyUnit = intent.minFuelEconomy !== null ? "kmpl"
      : typeof effectiveFuel === "string" && effectiveFuel.toLowerCase() === "electric" ? "km/charge"
      : typeof effectiveFuel === "string" && effectiveFuel.toLowerCase() === "cng" ? "km/kg" : "kmpl";
    const effectiveMaxPrice = Math.min(typeof maxPrice === "number" ? maxPrice : Infinity, intent.maxPrice ?? Infinity);
    const embedding = await embedText(intent.semanticQuery);
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
        to_jsonb(fe) AS fuel_economy,
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
      JOIN app.vehicles search_vehicle ON search_vehicle.vehicle_id = ald.vehicle_id
      LEFT JOIN app.fuel_economy_references fe
        ON fe.variant_id = search_vehicle.variant_id AND fe.model_year = ald.manufacturing_year
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
        AND ($8::TEXT[] IS NULL OR ald.body_type = ANY($8::TEXT[]))
        AND ($10::INT IS NULL OR EXISTS (
          SELECT 1 FROM app.vehicles v
          JOIN app.vehicle_variants vv ON vv.variant_id = v.variant_id
          WHERE v.vehicle_id = ald.vehicle_id AND vv.seating_capacity >= $10
        ))
        AND ($9::TEXT IS NULL OR
          ($9 = 'automatic' AND ald.transmission IN ('Automatic', 'AMT', 'CVT', 'DCT', 'Single-speed')) OR
          ($9 = 'manual' AND ald.transmission = 'Manual'))
        AND (NOT $11::BOOLEAN OR fe.unit = $14::TEXT)
        AND ($12::NUMERIC IS NULL OR (fe.unit = 'kmpl' AND fe.value_low >= $12))
      ORDER BY
        CASE WHEN $13::TEXT = 'asc' THEN ald.kms_driven END ASC,
        CASE WHEN $13::TEXT = 'desc' THEN ald.kms_driven END DESC,
        CASE WHEN $11::BOOLEAN THEN fe.value_low END DESC NULLS LAST,
        embedding.embedding <=> $1::vector, ald.listing_id
      LIMIT $6 OFFSET $7;
      `,
      [vector, cityId ?? null, Number.isFinite(effectiveMaxPrice) ? effectiveMaxPrice : null, effectiveFuel, transmission ?? null, pageSize + 1, (page - 1) * pageSize, intent.bodyTypes, transmission ? null : intent.transmissionGroup, intent.minSeats, intent.fuelEconomyFirst, intent.minFuelEconomy, intent.distanceOrder, economyUnit]
    );

    return reply({
      success: true,
      query,
      ranking: intent.distanceOrder ? `distance_${intent.distanceOrder}` : intent.fuelEconomyFirst ? "fuel_economy_desc" : "semantic",
      ranking_note: intent.distanceOrder ? "Ordered by total distance driven (odometer kilometres)."
        : intent.fuelEconomyFirst
          ? `Sorted by ${economyUnit === "km/charge" ? "range per charge" : "mileage (" + economyUnit + ")"}, highest first.` : null,
      applied_filters: { city_id: cityId ?? null, max_price: Number.isFinite(effectiveMaxPrice) ? effectiveMaxPrice : null, fuel_type: fuelType ?? intent.fuel, transmission: transmission ?? intent.transmissionGroup, body_type: intent.bodyType, body_types: intent.bodyTypes, min_seats: intent.minSeats, min_fuel_economy_kmpl: intent.minFuelEconomy },
      count: Math.min(result.rows.length, pageSize),
      page,
      has_more: result.rows.length > pageSize,
      listings: result.rows.slice(0, pageSize),
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return reply(
      { success: false, message: "Unable to complete semantic vehicle search" },
      { status: 500 }
    );
  }
});
