import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { hashPassword } from "../auth-crypto";
import {
  AuthConfigurationError,
  getAuthSecret,
  setSessionCookie,
} from "../auth";
import { pool } from "../db";
import { rateLimit } from "../rate-limit";

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

export const register = withDatabaseContext(async function register(input: unknown) {

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
    return reply(
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
    return reply(
      {
        success: false,
        message: "Dealer registration requires a dealership, city, and address.",
      },
      { status: 400 }
    );
  }

  try {
    getAuthSecret();
    const limited = await rateLimit("registration", 30, 600);
    if (limited) return limited;
    const passwordHash = await hashPassword(password);
    const created = await pool.query<{ user_id: string | null }>(
      "SELECT app.register_account($1,$2,$3,$4,$5,$6,$7,$8) AS user_id",
      [fullName, email, phone || null, passwordHash, accountType,
       dealershipName || null, accountType === "dealer" ? cityId : null, streetAddress || null]
    );
    const userId = created.rows[0].user_id;
    if (!userId) {
      return reply({ success: false, message: "An account with that email already exists" }, { status: 409 });
    }
    const response = reply(
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
    await setSessionCookie(userId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "22023") {
      return reply({ success: false, message: "Choose an active city and valid registration details" }, { status: 400 });
    }

    if (error instanceof AuthConfigurationError) {
      return reply(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Account registration error:", error);
    return reply(
      { success: false, message: "Unable to create the account" },
      { status: 500 }
    );
  }
});
