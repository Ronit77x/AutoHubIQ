import { NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
  isSameOrigin,
} from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

const LISTING_STATUSES = [
  "active",
  "reserved",
  "sold",
  "withdrawn",
  "draft",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin requests are not allowed" },
      { status: 403 }
    );
  }

  const { listingId } = await params;
  const parsedListingId = Number(listingId);
  if (!Number.isSafeInteger(parsedListingId) || parsedListingId <= 0) {
    return NextResponse.json(
      { success: false, message: "A valid listing ID is required" },
      { status: 400 }
    );
  }

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sign in to update a listing" },
        { status: 401 }
      );
    }
    if (user.user_role !== "dealer" || !user.dealer_id) {
      return NextResponse.json(
        { success: false, message: "A dealer account is required" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON request body is required" },
        { status: 400 }
      );
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "The request body must be an object" },
        { status: 400 }
      );
    }

    const status = "listing_status" in body ? body.listing_status : null;
    const price = "asking_price" in body ? body.asking_price : null;
    const hasStatus = status !== null;
    const hasPrice = price !== null;

    if (
      (!hasStatus && !hasPrice) ||
      (hasStatus &&
        (typeof status !== "string" || !LISTING_STATUSES.includes(status))) ||
      (hasPrice &&
        (typeof price !== "number" ||
          !Number.isFinite(price) ||
          price <= 0 ||
          price > 9999999999.99))
    ) {
      return NextResponse.json(
        { success: false, message: "The requested listing changes are invalid" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dealer = await client.query<{ verification_status: string }>(
        `
        SELECT verification_status
        FROM app.dealer_profiles
        WHERE dealer_id = $1
          AND user_id = $2
        FOR UPDATE
        `,
        [user.dealer_id, user.user_id]
      );
      if (dealer.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, message: "Dealer profile not found" },
          { status: 404 }
        );
      }
      if (
        hasStatus &&
        status === "active" &&
        dealer.rows[0].verification_status !== "verified"
      ) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message: "A verified dealership is required to activate listings",
          },
          { status: 403 }
        );
      }

      const result = await client.query(
        `
        UPDATE app.vehicle_listings vl
        SET asking_price = COALESCE($3::NUMERIC, vl.asking_price),
            listing_status = COALESCE($4::VARCHAR, vl.listing_status),
            published_at = CASE
              WHEN $4::VARCHAR = 'active'
                THEN COALESCE(vl.published_at, CURRENT_TIMESTAMP)
              ELSE vl.published_at
            END
        FROM app.vehicles v
        WHERE vl.listing_id = $1
          AND vl.vehicle_id = v.vehicle_id
          AND v.dealer_id = $2
        RETURNING vl.listing_id, vl.asking_price, vl.listing_status
        `,
        [
          parsedListingId,
          user.dealer_id,
          hasPrice ? price : null,
          hasStatus ? status : null,
        ]
      );

      if (result.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, message: "Listing not found in your inventory" },
          { status: 404 }
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, listing: result.rows[0] });
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

    console.error("Dealer listing update error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update the vehicle listing" },
      { status: 500 }
    );
  }
}
