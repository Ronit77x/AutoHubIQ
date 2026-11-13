import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "./db";

// Database-backed windows work across application processes. Keys contain no raw identifiers.
export async function rateLimit(key: string, limit: number, seconds: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const result = await pool.query<{ request_count: number }>(`
    INSERT INTO app.request_limits (key_hash, window_start, request_count)
    VALUES ($1, CURRENT_TIMESTAMP, 1)
    ON CONFLICT (key_hash) DO UPDATE SET
      window_start = CASE WHEN app.request_limits.window_start <= CURRENT_TIMESTAMP - make_interval(secs => $2)
        THEN CURRENT_TIMESTAMP ELSE app.request_limits.window_start END,
      request_count = CASE WHEN app.request_limits.window_start <= CURRENT_TIMESTAMP - make_interval(secs => $2)
        THEN 1 ELSE app.request_limits.request_count + 1 END
    RETURNING request_count`, [hash, seconds]);
  if (result.rows[0].request_count > limit) {
    return NextResponse.json({ success: false, message: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(seconds) } });
  }
  return null;
}
