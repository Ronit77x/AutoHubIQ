import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";

import { pool } from "../db";

export const getCities = withDatabaseContext(async function getCities() {

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

    return reply({
      success: true,
      cities: result.rows,
    });
  } catch (error) {
    console.error("Cities error:", error);

    return reply(
      {
        success: false,
        message: "Unable to fetch cities",
      },
      { status: 500 }
    );
  }
});
