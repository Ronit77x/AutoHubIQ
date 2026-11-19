import { withDatabaseContext } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "../../../../lib/auth-crypto";
import {
  AuthConfigurationError,
  getAuthSecret,
  isSameOrigin,
  setSessionCookie,
} from "../../../../lib/auth";
import { pool } from "../../../../lib/db";
import { rateLimit } from "../../../../lib/rate-limit";

export const POST = withDatabaseContext(async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin requests are not allowed" },
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
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { success: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  if (
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    body.password.length > 128
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 400 }
    );
  }

  try {
    getAuthSecret();
    const limited = await rateLimit(`login:${email}`, 10, 600);
    if (limited) return limited;
    const result = await pool.query<{
      user_id: string;
      full_name: string;
      email: string;
      password_hash: string;
      user_role: "customer" | "dealer" | "admin";
      account_status: string;
    }>(
      `
      SELECT * FROM app.login_account($1)
      `,
      [email]
    );
    const user = result.rows[0];
    if (
      !user ||
      user.account_status !== "active" ||
      !(await verifyPassword(body.password, user.password_hash))
    ) {
      return NextResponse.json(
        { success: false, message: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        user_role: user.user_role,
      },
    });
    setSessionCookie(response, user.user_id);
    return response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Account login error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to sign in" },
      { status: 500 }
    );
  }
});
