import { randomBytes } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { hashPassword } from "../lib/auth-crypto.ts";

nextEnv.loadEnvConfig(process.cwd());
const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query(await readFile(new URL('../../database/seed/09_seed_demo_dealers.sql', import.meta.url), 'utf8'));
  await client.query(await readFile(new URL('../../database/seed/16_expand_demo_dealers.sql', import.meta.url), 'utf8'));
  await client.query('BEGIN');
  const dealers = await client.query(`SELECT u.user_id, u.email, dp.dealership_name FROM app.users u
    JOIN app.dealer_profiles dp USING(user_id)
    WHERE u.email = ANY($1::text[]) AND u.user_role='dealer' AND u.password_hash='DEMO_ACCOUNT_NO_LOGIN'
    FOR UPDATE OF u`, [['aarav@autohubiq.demo', 'priya@autohubiq.demo', 'arjun@autohubiq.demo',
      'neha@autohubiq.demo', 'rohan@autohubiq.demo', 'ishita@autohubiq.demo']]);
  const credentials = [];
  for (const dealer of dealers.rows) {
    const password = randomBytes(18).toString('base64url');
    await client.query('UPDATE app.users SET password_hash=$2 WHERE user_id=$1', [dealer.user_id, await hashPassword(password)]);
    credentials.push(`${dealer.dealership_name}\nEmail: ${dealer.email}\nPassword: ${password}\n`);
  }
  if (credentials.length) {
    await appendFile(new URL('../.demo-credentials.txt', import.meta.url),
      `\nLOCAL DEMO DEALERS — sign in at /account\n${credentials.join('\n')}\n`);
  }
  await client.query('COMMIT');
  console.log(`Provisioned ${credentials.length} dealer passwords in ignored frontend/.demo-credentials.txt. Existing working passwords were preserved.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Demo dealer setup failed:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
