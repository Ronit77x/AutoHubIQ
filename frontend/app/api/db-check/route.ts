import { withDatabaseContext } from "../../../lib/db";

import { connection, NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { getAuthenticatedUser } from "../../../lib/auth";


export const GET = withDatabaseContext(async function GET(request: NextRequest) {
  await connection();

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    if (user.user_role !== "admin") return NextResponse.json({ success: false, message: "Administrator access required" }, { status: 403 });
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        version() AS version,
        (SELECT COUNT(*) FROM app.cities) AS city_count;
    `);

    return NextResponse.json({
      success: true,
      message: "PostgreSQL connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
});
