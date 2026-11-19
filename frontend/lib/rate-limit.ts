import { createHash } from "node:crypto";
import { result } from "./server/result";
import { pool } from "./db";

// Database-backed windows work across application processes. Keys contain no raw identifiers.
export async function rateLimit(key: string, limit: number, seconds: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const window = await pool.query<{ request_count: number }>(
    "SELECT * FROM app.consume_request_limit($1,$2)", [hash, seconds]);
  if (window.rows[0].request_count > limit) {
    return result({ success: false, message: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(seconds) } });
  }
  return null;
}
