import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/auth-crypto";
import {
  AuthConfigurationError,
  getAuthSecret,
  isSameOrigin,
  setSessionCookie,
} from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

interface RegistrationBody {
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  account_type?: unknown;
  dealership_name?: unknown;
  city_id?: unknown;
  street_address?: unknown;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin requests are not allowed" },
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
  const body = parsedBody as RegistrationBody;

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const accountType = body.account_type;
  const dealershipName =
    typeof body.dealership_name === "string"
      ? body.dealership_name.trim()
      : "";
  const streetAddress =
    typeof body.street_address === "string"
      ? body.street_address.trim()
      : "";
  const cityId = body.city_id;

  if (
    fullName.length < 2 ||
    fullName.length > 120 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    password.length > 128 ||
    (phone && phone.length > 20) ||
    (accountType !== "customer" && accountType !== "dealer")
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Provide a valid name and email, a password of 12–128 characters, and a supported account type.",
      },
      { status: 400 }
    );
  }

  if (
    accountType === "dealer" &&
    (dealershipName.length < 2 ||
      dealershipName.length > 150 ||
      streetAddress.length < 5 ||
      typeof cityId !== "number" ||
      !Number.isSafeInteger(cityId) ||
      cityId <= 0)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Dealer registration requires a dealership, city, and address.",
      },
      { status: 400 }
    );
  }

  let client;
  try {
    getAuthSecret();
    const passwordHash = await hashPassword(password);
    client = await pool.connect();
    await client.query("BEGIN");

    if (accountType === "dealer") {
      const city = await client.query(
        "SELECT 1 FROM app.cities WHERE city_id = $1 AND is_active = TRUE",
        [cityId]
      );
      if (city.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { success: false, message: "Choose an active city" },
          { status: 400 }
        );
      }
    }

    const created = await client.query<{ user_id: string }>(
      `
      INSERT INTO app.users (
        full_name,
        email,
        phone,
        password_hash,
        user_role,
        account_status
      )
      VALUES ($1, $2, $3, $4, $5, 'active')
      ON CONFLICT DO NOTHING
      RETURNING user_id
      `,
      [
        fullName,
        email,
        phone || null,
        passwordHash,
        accountType,
      ]
    );

    if (created.rowCount !== 1) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "An account with that email already exists" },
        { status: 409 }
      );
    }

    const userId = created.rows[0].user_id;
    if (accountType === "dealer") {
      await client.query(
        `
        INSERT INTO app.dealer_profiles (
          user_id,
          city_id,
          dealership_name,
          business_phone,
          business_email,
          street_address,
          verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        `,
        [
          userId,
          cityId,
          dealershipName,
          phone || null,
          email,
          streetAddress,
        ]
      );
    }

    await client.query("COMMIT");
    const response = NextResponse.json(
      {
        success: true,
        user: {
          user_id: userId,
          full_name: fullName,
          email,
          user_role: accountType,
          verification_status: accountType === "dealer" ? "pending" : null,
        },
      },
      { status: 201 }
    );
    setSessionCookie(response, userId);
    return response;
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch((rollbackError: unknown) => {
        console.error("Registration rollback error:", rollbackError);
      });
    }

    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Account registration error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the account" },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
