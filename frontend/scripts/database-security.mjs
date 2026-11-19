import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export async function applyDatabaseSecurity(client) {
  const sql = await readFile(new URL("../../database/schema/20_database_access_control.sql", import.meta.url), "utf8");
  await client.query(sql);
}

export async function createRuntimeLogin(client, adminUrl, roleName) {
  if (!/^autohubiq_app(?:_test_[a-f0-9]{16})?$/.test(roleName)) throw new Error("Unexpected runtime role name");
  const password = randomBytes(32).toString("hex");
  // Both strings are generated/validated above, not request input.
  await client.query(`CREATE ROLE "${roleName}" LOGIN PASSWORD '${password}' INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
  await client.query(`GRANT autohubiq_runtime TO "${roleName}"`);
  const runtimeUrl = new URL(adminUrl);
  runtimeUrl.username = roleName;
  runtimeUrl.password = password;
  return runtimeUrl.href;
}
