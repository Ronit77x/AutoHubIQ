import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { verifyPassword } from "../auth-crypto";
import {
  AuthConfigurationError,
  getAuthSecret,
  setSessionCookie,
} from "../auth";
import { pool } from "../db";
import { rateLimit } from "../rate-limit";

export const login = withDatabaseContext(async function login(input: unknown) {

  let body: unknown;
  try {
    body = JSON.parse(JSON.stringify(input ?? null));
  } catch {
    return reply(
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
    return reply(
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
    return reply(
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
      return reply(
        { success: false, message: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const response = reply({
      success: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        user_role: user.user_role,
      },
    });
    await setSessionCookie(user.user_id);
    return response;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return reply(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Account login error:", error);
    return reply(
      { success: false, message: "Unable to sign in" },
      { status: 500 }
    );
  }
});
