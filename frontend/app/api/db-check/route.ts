
import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";


export async function GET() {
  try {
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
}
