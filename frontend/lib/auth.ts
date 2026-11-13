import type { NextRequest, NextResponse } from "next/server";
import { pool } from "./db";
import {
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./auth-crypto";

export const SESSION_COOKIE_NAME = "autohubiq_session";

export class AuthConfigurationError extends Error {
  constructor() {
    super("Authentication is not configured. Set AUTH_SECRET to a random secret of at least 32 characters.");
    this.name = "AuthConfigurationError";
  }
}

export interface AuthenticatedUser {
  user_id: string;
  full_name: string;
  email: string;
  user_role: "customer" | "dealer" | "admin";
  dealership_name: string | null;
  verification_status: "pending" | "verified" | "rejected" | null;
  dealer_id: string | null;
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new AuthConfigurationError();
  }
  return secret;
}

export function setSessionCookie(
  response: NextResponse,
  userId: string
): void {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken(userId, getAuthSecret()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    }
  );
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token, getAuthSecret());
  if (!session) {
    return null;
  }

  const result = await pool.query<AuthenticatedUser>(
    `
    SELECT
      u.user_id,
      u.full_name,
      u.email,
      u.user_role,
      dp.dealer_id,
      dp.dealership_name,
      dp.verification_status
    FROM app.users u
    LEFT JOIN app.dealer_profiles dp
      ON dp.user_id = u.user_id
    WHERE u.user_id = $1
      AND u.account_status = 'active'
    `,
    [session.userId]
  );

  return result.rows[0] ?? null;
}
