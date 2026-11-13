import { NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
  isSameOrigin,
} from "../../../../lib/auth";
import { embedText, MODEL_NAME } from "../../../../lib/embeddings";
import { pool } from "../../../../lib/db";

const CONDITIONS = ["excellent", "good", "fair", "needs_repair"];

interface ListingBody {
  variant_id?: unknown;
  manufacturing_year?: unknown;
  registration_year?: unknown;
  kms_driven?: unknown;
  colour?: unknown;
  ownership_count?: unknown;
  condition?: unknown;
  asking_price?: unknown;
  description?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin requests are not allowed" },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sign in to create a listing" },
        { status: 401 }
      );
    }
    if (user.user_role !== "dealer" || !user.dealer_id) {
      return NextResponse.json(
        { success: false, message: "A dealer account is required" },
        { status: 403 }
      );
    }
    if (user.verification_status !== "verified") {
      return NextResponse.json(
        {
          success: false,
          message: "Your dealership must be verified before publishing listings",
        },
        { status: 403 }
      );
    }

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
        { success: false, message: "The request body must be an object" },
        { status: 400 }
      );
    }
    const body = parsedBody as ListingBody;

    const currentYear = new Date().getFullYear();
    const variantId = body.variant_id;
    const manufacturingYear = body.manufacturing_year;
    const registrationYear = body.registration_year ?? null;
    const kmsDriven = body.kms_driven;
    const ownershipCount = body.ownership_count ?? 1;
    const condition = body.condition;
    const askingPrice = body.asking_price;
    const colour = typeof body.colour === "string" ? body.colour.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (
      typeof variantId !== "number" ||
      !Number.isSafeInteger(variantId) ||
      variantId <= 0 ||
      typeof manufacturingYear !== "number" ||
      !Number.isInteger(manufacturingYear) ||
      manufacturingYear < 1990 ||
      manufacturingYear > currentYear ||
      (registrationYear !== null &&
        (typeof registrationYear !== "number" ||
          !Number.isInteger(registrationYear) ||
          registrationYear < manufacturingYear ||
          registrationYear > currentYear)) ||
      typeof kmsDriven !== "number" ||
      !Number.isSafeInteger(kmsDriven) ||
      kmsDriven < 0 ||
      typeof ownershipCount !== "number" ||
      !Number.isInteger(ownershipCount) ||
      ownershipCount < 1 ||
      ownershipCount > 10 ||
      typeof condition !== "string" ||
      !CONDITIONS.includes(condition) ||
      typeof askingPrice !== "number" ||
      !Number.isFinite(askingPrice) ||
      askingPrice <= 0 ||
      askingPrice > 9999999999.99 ||
      colour.length > 40 ||
      description.length < 20 ||
      description.length > 5000
    ) {
      return NextResponse.json(
        { success: false, message: "Listing details are invalid or incomplete" },
        { status: 400 }
      );
    }

    const variantResult = await pool.query<{
      variant_id: string;
      variant_name: string;
      fuel_type: string;
      transmission: string;
      model_name: string;
      body_type: string;
      manufacturer_name: string;
    }>(
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
      WHERE vv.variant_id = $1
      `,
      [variantId]
    );
    if (variantResult.rowCount !== 1) {
      return NextResponse.json(
        { success: false, message: "Choose a vehicle variant from the catalogue" },
        { status: 400 }
      );
    }

    const cityResult = await pool.query<{ city_name: string }>(
      `
      SELECT c.city_name
      FROM app.dealer_profiles dp
      JOIN app.cities c
        ON c.city_id = dp.city_id
      WHERE dp.dealer_id = $1
        AND dp.verification_status = 'verified'
      `,
      [user.dealer_id]
    );
    if (cityResult.rowCount !== 1) {
      return NextResponse.json(
        { success: false, message: "A verified dealer profile is required" },
        { status: 403 }
      );
    }

    const variant = variantResult.rows[0];
    const sourceText = [
      `${variant.manufacturer_name} ${variant.model_name} ${variant.variant_name}`,
      `${manufacturingYear} model year`,
      `${variant.body_type}, ${variant.fuel_type}, ${variant.transmission}`,
      `${condition} condition`,
      `${ownershipCount} owner(s)`,
      `Driven ${kmsDriven} kilometres`,
      `Located in ${cityResult.rows[0].city_name}`,
      colour ? `Colour ${colour}` : null,
      description,
    ]
      .filter(Boolean)
      .join(". ");
    const embedding = await embedText(sourceText);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dealerLock = await client.query(
        `
        SELECT dealer_id
        FROM app.dealer_profiles
        WHERE dealer_id = $1
          AND user_id = $2
          AND verification_status = 'verified'
        FOR UPDATE
        `,
        [user.dealer_id, user.user_id]
      );
      if (dealerLock.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message: "A verified dealer profile is required to publish listings",
          },
          { status: 403 }
        );
      }

      const vehicle = await client.query<{ vehicle_id: string }>(
        `
        INSERT INTO app.vehicles (
          dealer_id,
          variant_id,
          manufacturing_year,
          registration_year,
          kms_driven,
          colour,
          ownership_count,
          condition
        )
        SELECT
          dp.dealer_id,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        FROM app.dealer_profiles dp
        WHERE dp.dealer_id = $1
          AND dp.user_id = $9
          AND dp.verification_status = 'verified'
        RETURNING vehicle_id
        `,
        [
          user.dealer_id,
          variantId,
          manufacturingYear,
          registrationYear,
          kmsDriven,
          colour || null,
          ownershipCount,
          condition,
          user.user_id,
        ]
      );
      if (vehicle.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message: "A verified dealer profile is required to publish listings",
          },
          { status: 403 }
        );
      }
      const listing = await client.query<{ listing_id: string }>(
        `
        INSERT INTO app.vehicle_listings (
          vehicle_id,
          asking_price,
          description,
          listing_status,
          source_type,
          published_at
        )
        VALUES ($1, $2, $3, 'active', 'dealer', CURRENT_TIMESTAMP)
        RETURNING listing_id
        `,
        [vehicle.rows[0].vehicle_id, askingPrice, description]
      );
      await client.query(
        `
        INSERT INTO app.listing_embeddings (
          listing_id,
          embedding,
          source_text,
          model_name
        )
        VALUES ($1, $2::vector, $3, $4)
        `,
        [
          listing.rows[0].listing_id,
          `[${embedding.join(",")}]`,
          sourceText,
          MODEL_NAME,
        ]
      );
      await client.query("COMMIT");

      return NextResponse.json(
        { success: true, listing_id: listing.rows[0].listing_id },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { success: false, message: "This vehicle already has an active listing" },
        { status: 409 }
      );
    }

    console.error("Dealer listing creation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the vehicle listing" },
      { status: 500 }
    );
  }
}
