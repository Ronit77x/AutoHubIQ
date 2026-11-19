import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { hashPassword } from "../lib/auth-crypto.ts";

nextEnv.loadEnvConfig(process.cwd());
const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const existing = await client.query("SELECT 1 FROM app.users WHERE user_role = 'admin' AND account_status = 'active'");
  if (existing.rowCount) {
    console.log("An administrator already exists; no credentials were changed.");
  } else {
    const password = randomBytes(18).toString("base64url");
    const email = "admin@autohubiq.test";
    await client.query("BEGIN");
    const result = await client.query(`INSERT INTO app.users (full_name, email, password_hash, user_role)
      VALUES ('College Demo Administrator', $1, $2, 'admin') ON CONFLICT DO NOTHING RETURNING user_id`,
      [email, await hashPassword(password)]);
    if (result.rowCount !== 1) throw new Error("Demo email is already in use; no account was promoted.");
    await writeFile(new URL("../.demo-credentials.txt", import.meta.url),
      `AutoHubIQ LOCAL COLLEGE DEMO ONLY\nEmail: ${email}\nPassword: ${password}\nSign in at /account and open /admin.\nDo not deploy this demo account to a public environment.\n`, { flag: "wx" });
    await client.query("COMMIT");
    console.log("Created a local demo administrator. Credentials saved in ignored frontend/.demo-credentials.txt.");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Demo administrator setup failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
