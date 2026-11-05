
import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        city_id,
        city_name,
        state_name
      FROM app.cities
      WHERE is_active = TRUE
      ORDER BY city_name;
    `);

    return NextResponse.json({
      success: true,
      cities: result.rows,
    });
  } catch (error) {
    console.error("Cities API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch cities",
      },
      { status: 500 }
    );
  }
}
