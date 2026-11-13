import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const fingerprintSql = `SELECT COUNT(*)::int AS count,
  md5(COALESCE(string_agg(row_to_json(e)::text, '|' ORDER BY listing_id), '')) AS fingerprint
  FROM app.listing_embeddings e`;
try {
  await client.connect();
  const before = (await client.query(fingerprintSql)).rows[0];
  const results = await client.query(await readFile(new URL("../../database/queries/28_vector_read_update_delete_demo.sql", import.meta.url), "utf8"));
  const after = (await client.query(fingerprintSql)).rows[0];
  assert.deepEqual(after, before, "Vector RUD demonstration must restore every original row and value");
  const read = results.find(result => result.fields.some(field => field.name === "similarity"));
  const update = results.find(result => result.command === "UPDATE");
  const deletion = results.find(result => result.command === "DELETE");
  assert(read.rows.length > 0);
  assert.equal(update.rowCount, 1);
  assert.equal(deletion.rowCount, 1);
  assert(read.rows.every(row => row.dimensions === 384));
  console.log(`PASS: read ${read.rowCount} vector matches, updated one vector, deleted one vector, rolled back; all ${after.count} original embeddings and metadata unchanged.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Vector RUD verification failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
