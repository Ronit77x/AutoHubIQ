import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' ORDER BY table_name");
  const vector = await client.query("SELECT installed_version FROM pg_available_extensions WHERE name = 'vector'");
  const counts = await client.query(`SELECT
    (SELECT COUNT(*)::int FROM app.cities) AS cities,
    (SELECT COUNT(*)::int FROM app.vehicle_listings WHERE listing_status='active') AS active_listings,
    (SELECT COUNT(*)::int FROM pg_policies WHERE schemaname='app') AS row_security_policies`);
  const privileges = (await client.query("SELECT r.rolsuper AS superuser,r.rolbypassrls AS bypass_rls,pg_has_role(current_user,'autohubiq_runtime','member') AS runtime_role FROM pg_roles r WHERE rolname=current_user")).rows[0];
  if (privileges.superuser || privileges.bypass_rls || !privileges.runtime_role) {
    throw new Error("Database runtime login must be restricted; run db:security");
  }
  const embeddings = tables.rows.some(row => row.table_name === "listing_embeddings")
    ? (await client.query("SELECT COUNT(*)::int AS count FROM app.listing_embeddings")).rows[0].count : 0;
  console.log(JSON.stringify({ connected: true, tables: tables.rows.map(row => row.table_name), vectorVersion: vector.rows[0]?.installed_version ?? null, authConfigured: (process.env.AUTH_SECRET ?? "").length >= 32, ...counts.rows[0], embeddings, ...privileges }, null, 2));
} catch (error) {
  console.error("Database verification failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
