import { readFile, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { applyDatabaseSecurity, createRuntimeLogin } from "./database-security.mjs";

nextEnv.loadEnvConfig(process.cwd());
const adminUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!adminUrl) throw new Error("Configure DATABASE_ADMIN_URL before setting up database permissions");
const client = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await applyDatabaseSecurity(client);
  const configuredUrl = process.env.DATABASE_URL;
  let runtimeUrl;
  if (configuredUrl && new URL(configuredUrl).username === "autohubiq_app") {
    runtimeUrl = configuredUrl;
  } else {
    const existing = await client.query("SELECT 1 FROM pg_roles WHERE rolname='autohubiq_app'");
    if (existing.rowCount) throw new Error("Runtime login already exists; configure its DATABASE_URL without resetting its password");
    runtimeUrl = await createRuntimeLogin(client, adminUrl, "autohubiq_app");
  }
  // Check the actual login before changing the application configuration.
  const runtime = new pg.Client({ connectionString: runtimeUrl, connectionTimeoutMillis: 5000 });
  try {
    await runtime.connect();
    const check = await runtime.query("SELECT r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,pg_has_role(current_user,'autohubiq_runtime','member') AS member FROM pg_roles r WHERE rolname=current_user");
    const role = check.rows[0];
    if (role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole || !role.member) throw new Error("Runtime login is not restricted");
    await runtime.query("SELECT count(*) FROM app.active_listing_details");
  } finally { await runtime.end(); }
  const envFile = new URL("../.env.local", import.meta.url);
  let contents = await readFile(envFile, "utf8");
  function set(name, value) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    contents = pattern.test(contents) ? contents.replace(pattern, () => line) : `${contents.trimEnd()}\n${line}\n`;
  }
  set("DATABASE_ADMIN_URL", adminUrl);
  set("DATABASE_URL", runtimeUrl);
  await writeFile(envFile, contents);
  console.log("Applied GRANT/REVOKE, RLS policies and guarded functions. DATABASE_URL now uses the restricted application login; administrator URL is retained privately for maintenance. Restart the development server.");
} catch (error) {
  console.error("Database permission setup failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally { await client.end(); }
