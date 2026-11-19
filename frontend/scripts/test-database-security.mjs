import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { applyDatabaseSecurity, createRuntimeLogin } from "./database-security.mjs";

nextEnv.loadEnvConfig(process.cwd());
const adminUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
const suffix = randomBytes(8).toString("hex");
const database = `autohubiq_rbac_test_${suffix}`;
const login = `autohubiq_app_test_${suffix}`;
const url = new URL(adminUrl); url.pathname = `/${database}`;
const admin = new pg.Client({ connectionString: adminUrl });
let owner, runtime, created = false, loginCreated = false, checks = 0;
async function asUser(id, callback) {
  await runtime.query("BEGIN");
  try {
    await runtime.query("SELECT set_config('app.user_id',$1,true)", [id ?? ""]);
    return await callback(runtime);
  } finally { await runtime.query("ROLLBACK"); }
}
async function denied(id, sql, args = []) {
  await assert.rejects(asUser(id, c => c.query(sql, args)), error => error.code === "42501"); checks++;
}
async function zero(id, sql, args = []) {
  const result = await asUser(id, c => c.query(sql, args)); assert.equal(result.rowCount, 0); checks++;
}
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${database}"`); created = true;
  owner = new pg.Client({ connectionString: url.href }); await owner.connect();
  for (const directory of ["schema", "seed"]) {
    const root = new URL(`../../database/${directory}/`, import.meta.url);
    for (const file of (await readdir(root)).filter(f => f.endsWith(".sql")).sort()) await owner.query(await readFile(new URL(file, root), "utf8"));
  }
  await applyDatabaseSecurity(owner); // Migration must be safe to run twice.
  const runtimeUrl = await createRuntimeLogin(owner, url.href, login); loginCreated = true;
  runtime = new pg.Client({ connectionString: runtimeUrl }); await runtime.connect();
  const policyCount = Number((await owner.query("SELECT count(*) FROM pg_policies WHERE schemaname='app'")).rows[0].count);
  assert(policyCount >= 20); checks++;
  const city = (await owner.query("SELECT min(city_id) AS id FROM app.cities")).rows[0].id;
  const variant = (await owner.query("SELECT min(variant_id) AS id FROM app.vehicle_variants")).rows[0].id;
  const people = {};
  for (const [name, role, status, verification] of [
    ["buyer", "customer", "active", null], ["otherBuyer", "customer", "active", null],
    ["dealer", "dealer", "active", "verified"], ["otherDealer", "dealer", "active", "verified"],
    ["pending", "dealer", "active", "pending"], ["admin", "admin", "active", null],
    ["suspended", "customer", "suspended", null],
  ]) {
    const u = (await owner.query("INSERT INTO app.users(full_name,email,password_hash,user_role,account_status) VALUES($1,$2,'TEST_NO_LOGIN',$3,$4) RETURNING user_id", [name, `${name}@rbac.test`, role, status])).rows[0];
    people[name] = { id: u.user_id };
    if (verification) people[name].dealer = (await owner.query("INSERT INTO app.dealer_profiles(user_id,city_id,dealership_name,street_address,verification_status) VALUES($1,$2,$3,'Test Street',$4) RETURNING dealer_id", [u.user_id, city, name, verification])).rows[0].dealer_id;
  }
  async function inventory(dealer, status) {
    const v = (await owner.query("INSERT INTO app.vehicles(dealer_id,variant_id,manufacturing_year,kms_driven) VALUES($1,$2,2021,10000) RETURNING vehicle_id", [dealer, variant])).rows[0].vehicle_id;
    const l = (await owner.query("INSERT INTO app.vehicle_listings(vehicle_id,asking_price,description,listing_status) VALUES($1,500000,'Test vehicle for database access policies',$2) RETURNING listing_id", [v, status])).rows[0].listing_id;
    return { v, l };
  }
  const own = await inventory(people.dealer.dealer, "active");
  const other = await inventory(people.otherDealer.dealer, "active");
  const hidden = await inventory(people.otherDealer.dealer, "withdrawn");
  const offer = (await owner.query("INSERT INTO app.listing_enquiries(listing_id,user_id,message,request_type,offer_amount) VALUES($1,$2,'Please consider my initial offer','offer',450000) RETURNING enquiry_id", [own.l, people.buyer.id])).rows[0].enquiry_id;
  await denied(null, "SELECT password_hash FROM app.users");
  await denied(people.admin.id, "SELECT password_hash FROM app.users");
  await zero(null, "SELECT user_id FROM app.users");
  await zero(people.otherBuyer.id, "SELECT * FROM app.listing_enquiries WHERE enquiry_id=$1", [offer]);
  await zero(null, "SELECT * FROM app.vehicle_listings WHERE listing_id=$1", [hidden.l]);
  await zero(people.dealer.id, "SELECT * FROM app.vehicle_listings WHERE listing_id=$1", [hidden.l]);
  await denied(people.buyer.id, "UPDATE app.users SET user_role='admin' WHERE user_id=$1", [people.buyer.id]);
  await denied(people.pending.id, "UPDATE app.dealer_profiles SET verification_status='verified' WHERE dealer_id=$1", [people.pending.dealer]);
  await zero(people.dealer.id, "UPDATE app.vehicle_listings SET asking_price=1 WHERE listing_id=$1", [other.l]);
  await zero(people.buyer.id, "UPDATE app.vehicle_listings SET asking_price=1 WHERE listing_id=$1", [own.l]);
  await denied(people.dealer.id, "DELETE FROM app.vehicle_listings WHERE listing_id=$1", [own.l]);
  await denied(people.pending.id, "INSERT INTO app.vehicles(dealer_id,variant_id,manufacturing_year,kms_driven) VALUES($1,$2,2021,0)", [people.pending.dealer, variant]);
  await denied(people.dealer.id, "INSERT INTO app.vehicles(dealer_id,variant_id,manufacturing_year,kms_driven) VALUES($1,$2,2021,0)", [people.otherDealer.dealer, variant]);
  await denied(people.suspended.id, "INSERT INTO app.listing_enquiries(listing_id,user_id,message,request_type) VALUES($1,$2,'Invalid suspended request','enquiry')", [own.l, people.suspended.id]);
  await denied(people.dealer.id, "INSERT INTO app.listing_enquiries(listing_id,user_id,message,request_type,offer_amount) VALUES($1,$2,'Dealer cannot submit offers','offer',10)", [other.l, people.dealer.id]);
  await denied(people.buyer.id, "UPDATE app.listing_enquiries SET contacted_at=CURRENT_TIMESTAMP WHERE enquiry_id=$1", [offer]);
  await denied(people.dealer.id, "UPDATE app.listing_enquiries SET offer_amount=1 WHERE enquiry_id=$1", [offer]);
  await zero(people.otherBuyer.id, "UPDATE app.listing_enquiries SET offer_amount=1 WHERE enquiry_id=$1", [offer]);
  await assert.rejects(asUser(null,c=>c.query("SELECT app.register_account('Blocked','blocked@rbac.test',NULL,'scrypt$test','admin',NULL,NULL,NULL)")),e=>e.code==='22023'); checks++;
  assert.equal((await asUser(people.dealer.id,c=>c.query("UPDATE app.vehicle_listings SET asking_price=525000 WHERE listing_id=$1",[own.l]))).rowCount,1); checks++;
  assert.equal((await asUser(people.admin.id,c=>c.query("UPDATE app.dealer_profiles SET verification_status='verified' WHERE dealer_id=$1",[people.pending.dealer]))).rowCount,1); checks++;
  assert.equal((await asUser(people.buyer.id,c=>c.query("UPDATE app.listing_enquiries SET offer_amount=460000 WHERE enquiry_id=$1",[offer]))).rowCount,1); checks++;
  assert.equal((await asUser(people.dealer.id,c=>c.query("UPDATE app.listing_enquiries SET contacted_at=CURRENT_TIMESTAMP WHERE enquiry_id=$1",[offer]))).rowCount,1); checks++;
  assert.equal((await asUser(people.buyer.id,c=>c.query("SELECT * FROM app.lock_offer_context($1,false)",[offer]))).rowCount,1); checks++;
  assert.equal((await asUser(people.otherBuyer.id,c=>c.query("SELECT * FROM app.lock_offer_context($1,false)",[offer]))).rowCount,0); checks++;
  await owner.query("UPDATE app.listing_enquiries SET contacted_at=CURRENT_TIMESTAMP WHERE enquiry_id=$1",[offer]);
  await denied(people.buyer.id,"UPDATE app.listing_enquiries SET offer_amount=470000 WHERE enquiry_id=$1",[offer]);
  const anonymous = (await runtime.query("SELECT app.actor_id() AS id,app.actor_role() AS role")).rows[0];
  assert.equal(anonymous.id,null); assert.equal(anonymous.role,null); checks++;
  const allUsers=await asUser(people.admin.id,c=>c.query("SELECT user_id,user_role FROM app.users"));
  assert(allUsers.rowCount>=7); checks++;
  const ownUsers=await asUser(people.buyer.id,c=>c.query("SELECT user_id FROM app.users"));
  assert.deepEqual(ownUsers.rows.map(r=>r.user_id),[people.buyer.id]); checks++;
  await asUser(people.dealer.id,async c=>{
    const v=(await c.query("INSERT INTO app.vehicles(dealer_id,variant_id,manufacturing_year,kms_driven) VALUES($1,$2,2021,0) RETURNING vehicle_id",[people.dealer.dealer,variant])).rows[0].vehicle_id;
    assert(v); checks++;
    const l=await c.query("INSERT INTO app.vehicle_listings(vehicle_id,asking_price,description,listing_status) VALUES($1,500000,'Valid publication via restricted role','active') RETURNING listing_id",[v]);
    assert.equal(l.rowCount,1);checks++;
  });
  // View invoker security must preserve base-table visibility.
  await zero(null,"SELECT * FROM app.active_listing_details WHERE listing_id=$1",[hidden.l]);
} catch (error) {
  console.error("Database security test failed:", error.message, error.code ?? ""); process.exitCode = 1;
} finally {
  if (runtime) await runtime.end();
  if (owner) await owner.end();
  if (created) {
    assert(/^autohubiq_rbac_test_[a-f0-9]{16}$/.test(database));
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  }
  if (loginCreated) await admin.query(`DROP ROLE "${login}"`);
  await admin.end();
}
if (!process.exitCode) console.log(`PASS: ${checks} database permission checks in an isolated database.`);
