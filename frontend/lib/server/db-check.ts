import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";

import { pool } from "../db";
import { getAuthenticatedUser } from "../auth";


export const checkDatabase = withDatabaseContext(async function checkDatabase() {

  try {
    const user = await getAuthenticatedUser();
    if (!user) return reply({ success: false, message: "Sign in required" }, { status: 401 });
    if (user.user_role !== "admin") return reply({ success: false, message: "Administrator access required" }, { status: 403 });
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        version() AS version,
        (SELECT COUNT(*) FROM app.cities) AS city_count;
    `);

    return reply({
      success: true,
      message: "PostgreSQL connection successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return reply(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
});
