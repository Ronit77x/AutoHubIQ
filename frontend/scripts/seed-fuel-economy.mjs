import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  for (const path of ["schema/19_create_fuel_economy_references.sql", "seed/20_seed_fuel_economy_references.sql"]) {
    await client.query(await readFile(new URL(`../../database/${path}`, import.meta.url), "utf8"));
  }
  const result = await client.query("SELECT count(*)::int AS references FROM app.fuel_economy_references");
  console.log(`Applied fuel-economy schema and seed; ${result.rows[0].references} researched model-year references available.`);
} catch (error) {
  console.error("Fuel-economy setup failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
