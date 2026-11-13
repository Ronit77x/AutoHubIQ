import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const envPath = new URL("../.env.local", import.meta.url);
if ((process.env.AUTH_SECRET ?? "").length < 32) {
  let contents = await readFile(envPath, "utf8").catch(error => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const line = `AUTH_SECRET=${randomBytes(32).toString("base64url")}`;
  contents = /^AUTH_SECRET=.*$/m.test(contents)
    ? contents.replace(/^AUTH_SECRET=.*$/m, line)
    : `${contents.trimEnd()}\n${line}\n`;
  await writeFile(envPath, contents);
  console.log("Configured a local authentication secret; database settings preserved.");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  // These additive scripts preserve existing inventory and accounts.
  for (const file of ["14_advanced_database_features.sql", "15_create_listing_embeddings.sql", "16_create_marketplace_interactions.sql", "17_add_customer_offers.sql", "18_add_offer_contact_status.sql"]) {
    await client.query(await readFile(new URL(`../../database/schema/${file}`, import.meta.url), "utf8"));
    console.log(`Applied ${file}`);
  }
} catch (error) {
  console.error("Local setup failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
