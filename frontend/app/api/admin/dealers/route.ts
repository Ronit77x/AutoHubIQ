import { withDatabaseContext } from "../../../../lib/db";
import { connection, NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
  isSameOrigin,
} from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

export const GET = withDatabaseContext(async function GET(request: NextRequest) {
  await connection();

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sign in to access administration" },
        { status: 401 }
      );
    }
    if (user.user_role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Administrator access is required" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        dp.dealer_id,
        dp.dealership_name,
        dp.street_address,
        dp.business_phone,
        dp.business_email,
        dp.verification_status,
        dp.created_at,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.account_status,
        c.city_name,
        c.state_name,
        COUNT(vl.listing_id) FILTER (
          WHERE vl.listing_status = 'active'
        )::INT AS active_listing_count
      FROM app.dealer_profiles dp
      JOIN app.users u
        ON u.user_id = dp.user_id
      JOIN app.cities c
        ON c.city_id = dp.city_id
      LEFT JOIN app.vehicles v
        ON v.dealer_id = dp.dealer_id
      LEFT JOIN app.vehicle_listings vl
        ON vl.vehicle_id = v.vehicle_id
      GROUP BY dp.dealer_id, u.user_id, c.city_id
      ORDER BY
        CASE dp.verification_status
          WHEN 'pending' THEN 0
          ELSE 1
        END,
        dp.created_at DESC
      `
    );

    return NextResponse.json({ success: true, dealers: result.rows });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }
    console.error("Admin dealer list API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load dealer applications" },
      { status: 500 }
    );
  }
});

export const PATCH = withDatabaseContext(async function PATCH(request: NextRequest) {
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
        { success: false, message: "Sign in to access administration" },
        { status: 401 }
      );
    }
    if (user.user_role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Administrator access is required" },
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

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("dealer_id" in body) ||
      !("verification_status" in body) ||
      (typeof body.dealer_id !== "number" &&
        typeof body.dealer_id !== "string") ||
      !/^[1-9]\d*$/.test(String(body.dealer_id)) ||
      (body.verification_status !== "verified" &&
        body.verification_status !== "rejected")
    ) {
      return NextResponse.json(
        { success: false, message: "Dealer ID or verification decision is invalid" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dealer = await client.query(
        `
        SELECT dealer_id
        FROM app.dealer_profiles
        WHERE dealer_id = $1
        FOR UPDATE
        `,
        [String(body.dealer_id)]
      );
      if (dealer.rowCount !== 1) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, message: "Dealer profile not found" },
          { status: 404 }
        );
      }

      const updated = await client.query(
        `
        UPDATE app.dealer_profiles
        SET verification_status = $2
        WHERE dealer_id = $1
        RETURNING dealer_id, dealership_name, verification_status
        `,
        [String(body.dealer_id), body.verification_status]
      );
      if (body.verification_status === "rejected") {
        await client.query(
          `
          UPDATE app.vehicle_listings vl
          SET listing_status = 'withdrawn'
          FROM app.vehicles v
          WHERE vl.vehicle_id = v.vehicle_id
            AND v.dealer_id = $1
            AND vl.listing_status = 'active'
          `,
          [String(body.dealer_id)]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, dealer: updated.rows[0] });
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
    console.error("Admin dealer verification API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update dealer verification" },
      { status: 500 }
    );
  }
});
