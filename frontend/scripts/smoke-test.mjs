import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import nextEnv from "@next/env";
import pg from "pg";
import sharp from "sharp";
import { createRuntimeLogin } from "./database-security.mjs";

nextEnv.loadEnvConfig(process.cwd());
// Always create a fresh database. Never run workflow writes against DATABASE_URL.
const database = `autohubiq_test_${randomBytes(8).toString("hex")}`;
const maintenanceUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
const testUrl = new URL(maintenanceUrl);
const runtimeRole = "autohubiq_app_test_" + randomBytes(8).toString("hex");
let runtimeRoleCreated = false;
testUrl.pathname = `/${database}`;
const admin = new pg.Client({ connectionString: maintenanceUrl });
let test, server, created = false;
let serverLog = "";
const port = Number(process.env.SMOKE_PORT ?? 3101);
const base = `http://127.0.0.1:${port}`;
let checks = 0;

// Exercise the framework's Server Action transport. Application code has no
// fetch/API calls; these HTTP requests exist only in the integration test.
const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-turbopack/client.node.js");
const manifest = JSON.parse(await readFile(new URL("../.next/server/server-reference-manifest.json", import.meta.url), "utf8"));
async function action(name, args = [], { cookie, status = 200, origin = base } = {}) {
  const [id, definition] = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === name) ?? [];
  assert(id, "Action present in production build: " + name);
  const worker = Object.keys(definition.workers)[0];
  const route = worker.replace(/^app/, "").replace(/\/page$/, "") || "/";
  const response = await fetch(base + route.replace("[listingId]", "1"), {
    method: "POST", headers: { "Next-Action": id, Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: await encodeReply(args),
  });
  const payload = await response.text();
  const result = payload.split("\n").map(line => { try { return JSON.parse(line.slice(line.indexOf(":") + 1)); } catch { return null; } }).find(value => value && typeof value === "object" && typeof value.ok === "boolean" && "data" in value);
  assert(result, "Server Action returned a result: " + name + " (HTTP " + response.status + ") " + payload.slice(0,500));
  assert.equal(result.status, status, name + ": " + (result.data.message ?? result.status));
  checks++;
  return { ...result, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
async function page(route, cookie) {
  const response = await fetch(base + route, { headers: cookie ? { Cookie: cookie } : {} });
  const html = await response.text();
  assert.equal(response.status, 200, "Page " + route); assert(!html.includes('id="__next_error__"'), "No render error " + route); checks++;
  return html;
}
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  test = new pg.Client({ connectionString: testUrl.href });
  await test.connect();
  for (const directory of ["schema", "seed"]) {
    const root = new URL(`../../database/${directory}/`, import.meta.url);
    for (const file of (await readdir(root)).filter(file => file.endsWith(".sql")).sort()) {
      await test.query(await readFile(new URL(file, root), "utf8"));
    }
  }
  // Reuse verified model vectors for seeded listings, then test real inference on publishing/search.
  const vectors = await admin.query("SELECT listing_id, embedding::text, source_text, model_name FROM app.listing_embeddings");
  for (const row of vectors.rows) {
    await test.query(`INSERT INTO app.listing_embeddings (listing_id, embedding, source_text, model_name)
      SELECT listing_id,$2::vector,$3,$4 FROM app.vehicle_listings WHERE listing_id=$1`, [row.listing_id, row.embedding, row.source_text, row.model_name]);
  }
  const runtimeUrl = await createRuntimeLogin(test, testUrl.href, runtimeRole);
  runtimeRoleCreated = true;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(), windowsHide: true, env: { ...process.env, NODE_ENV: "production", DATABASE_URL: runtimeUrl, AUTH_SECRET: randomBytes(32).toString("hex") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { serverLog = (serverLog + chunk).slice(-6000); });
  server.stderr.on("data", chunk => { serverLog = (serverLog + chunk).slice(-6000); });
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited before becoming ready");
    if (serverLog.includes("Ready in")) break;
    if (attempt > 120) throw new Error("Test server readiness timed out");
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await page("/");
  const cityId = Number((await test.query("SELECT city_id FROM app.cities WHERE is_active ORDER BY city_name LIMIT 1")).rows[0].city_id);
  const password = randomBytes(18).toString("base64url");
  async function register(email, account_type) {
    return action("registerAction", [{ full_name: "Workflow Test", email, password, account_type,
      dealership_name: "Workflow Test Motors", city_id: cityId, street_address: "123 Test Street" }], { status: 201 });
  }
  await action("registerAction", [{ full_name: "Blocked Admin", email: "blocked@example.test", password, account_type: "admin" }], { status: 400 });
  const buyer = await register("buyer@example.test", "customer");
  const dealer = await register("dealer@example.test", "dealer");
  const other = await register("other@example.test", "dealer");
  const administrator = await register("admin@example.test", "customer");
  await test.query("UPDATE app.users SET user_role='admin' WHERE email='admin@example.test'");
  const login = await action("loginAction", [{ email: "buyer@example.test", password }]);
  assert(login.cookie); checks++;
  await action("loginAction", [{ email: "buyer@example.test", password: "wrong" }], { status: 401 });
  const dealerId = (await test.query("SELECT dealer_id FROM app.dealer_profiles dp JOIN app.users u USING(user_id) WHERE u.email='dealer@example.test'")).rows[0].dealer_id;
  const review = { dealer_id: dealerId, verification_status: "verified" };
  await action("reviewDealerAction", [review], { status: 401 });
  await action("reviewDealerAction", [review], { cookie: buyer.cookie, status: 403 });
  const variant = (await test.query("SELECT variant_id FROM app.vehicle_variants ORDER BY variant_id LIMIT 1")).rows[0].variant_id;
  const listing = { variant_id: Number(variant), manufacturing_year: 2022, kms_driven: 24000,
    asking_price: 550000, condition: "good", description: "Well maintained family vehicle for workflow testing." };
  await action("createListingAction", [listing], { cookie: dealer.cookie, status: 403 });
  await action("reviewDealerAction", [review], { cookie: administrator.cookie });
  const published = String((await action("createListingAction", [listing], { cookie: dealer.cookie, status: 201 })).data.listing_id);
  const publishedPage = await page(`/listings/${published}`);
  assert(publishedPage.includes("550,000") || publishedPage.includes("5,50,000")); checks++;
  await page("/dealer", dealer.cookie); await page("/admin", administrator.cookie);
  // Anonymous, customer, and foreign dealers cannot change this inventory.
  await action("updateListingAction", [published, { asking_price: 1 }], { status: 401 });
  await action("updateListingAction", [published, { asking_price: 1 }], { cookie: buyer.cookie, status: 403 });
  await action("updateListingAction", [published, { asking_price: 1 }], { cookie: other.cookie, status: 404 });
  const beforeTimes = (await test.query("SELECT created_at::text, updated_at::text FROM app.vehicle_listings WHERE listing_id=$1", [published])).rows[0];
  await action("updateListingAction", [published, { asking_price: 525000 }], { cookie: dealer.cookie });
  const timestamps = (await test.query("SELECT created_at::text, updated_at::text FROM app.vehicle_listings WHERE listing_id=$1", [published])).rows[0];
  assert(new Date(timestamps.updated_at) > new Date(beforeTimes.updated_at));
  assert.equal(timestamps.created_at,beforeTimes.created_at); checks++;
  const updatedDetail = await page('/listings/'+published);
  const updatedDealer = await page('/dealer', dealer.cookie);
  assert(updatedDetail.includes('Last updated:') && updatedDealer.includes('Last updated:') && updatedDealer.includes('Delete vehicle'));
  assert(updatedDetail.includes(new Date(timestamps.updated_at).toISOString()) && updatedDealer.includes(new Date(timestamps.updated_at).toISOString())); checks++;
  // UPDATE in server code does not assign updated_at: the trigger supplied it.
  assert.equal(Number((await test.query("SELECT asking_price FROM app.vehicle_listings WHERE listing_id=$1", [published])).rows[0].asking_price), 525000); checks++;
  // Photo validation, ownership, byte storage, and server-rendered delivery.
  const photo = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#2463eb" } }).png().toBuffer();
  function photoForm(bytes = photo) { const form = new FormData(); form.set("photo", new Blob([bytes], { type: "image/png" }), "vehicle.png"); return form; }
  await action("uploadImageAction", [published, photoForm()], { status: 401 });
  await action("uploadImageAction", [published, photoForm(Buffer.from("invalid"))], { cookie: dealer.cookie, status: 400 });
  await action("uploadImageAction", [published, photoForm()], { cookie: dealer.cookie, status: 201 });
  assert((await page(`/listings/${published}`)).includes("data:image/jpeg;base64,")); checks++;
  const request = { request_type: "enquiry", message: "Please arrange a viewing of this vehicle." };
  await action("submitEnquiryAction", [published, request], { status: 401 });
  await action("submitEnquiryAction", [published, request], { cookie: buyer.cookie, status: 201 });
  await action("submitEnquiryAction", [published, { ...request, request_type: "test_drive" }], { cookie: buyer.cookie, status: 201 });
  const offer = { ...request, request_type: "offer", offer_amount: "510000.00" };
  await action("submitEnquiryAction", [published, offer], { cookie: buyer.cookie, status: 201 });
  const offerId = String((await test.query("SELECT enquiry_id FROM app.listing_enquiries WHERE listing_id=$1 AND request_type='offer'", [published])).rows[0].enquiry_id);
  const revision = { offer_amount: "515000.50", message: "My revised offer for this vehicle.", phone: "+91 9000000000" };
  await action("updateOfferAction", [offerId, revision], { status: 401 });
  await action("updateOfferAction", [offerId, revision], { cookie: dealer.cookie, status: 403 });
  await action("updateOfferAction", [offerId, revision], { cookie: buyer.cookie });
  assert((await page("/offers", buyer.cookie)).includes("515000.50")); checks++;
  await action("updateOfferAction", [offerId, { action: "mark_contacted" }], { cookie: other.cookie, status: 404 });
  await action("updateOfferAction", [offerId, { action: "mark_contacted" }], { cookie: dealer.cookie });
  await action("updateOfferAction", [offerId, revision], { cookie: buyer.cookie, status: 409 });
  assert((await page("/offers", buyer.cookie)).includes("Dealer marked contacted")); checks++;
  // Reads happen through server-rendered pages; no JSON data endpoints remain.
  await page(`/?city=${cityId}&sort=price_asc`);
  const semantic = await page(`/?city=${cityId}&query=family%20vehicle&max_price=600000`);
  assert(semantic.includes("semantic matches") || semantic.includes("No matching")); checks++;
  await action("updateListingAction", [published, { listing_status: "sold" }], { cookie: dealer.cookie });
  assert(!(await page(`/listings/${published}`)).includes("data:image/jpeg;base64,")); checks++;
  // Identity stays isolated across concurrent server renders.
  const concurrent = await Promise.all(Array.from({ length: 12 }, (_, i) => page(i % 2 ? "/offers" : "/dealer", i % 2 ? buyer.cookie : dealer.cookie)));
  assert(concurrent.every((html,i)=>i%2 ? html.includes("Dealer marked contacted") && !html.includes("Publish a vehicle") : html.includes("Buyer requests") && html.includes("Workflow Test Motors"))); checks++;
  await action("updateListingAction", [published, { listing_status: "active" }], {cookie:dealer.cookie});
  assert((await page("/listings/"+published)).includes("data:image/jpeg;base64,")); checks++;
  // Create multiple listing histories and each dependent type for the cascade.
  const vehicleId = String((await test.query("SELECT vehicle_id FROM app.vehicle_listings WHERE listing_id=$1", [published])).rows[0].vehicle_id);
  const historyId = String((await test.query("INSERT INTO app.vehicle_listings(vehicle_id,asking_price,description,listing_status) VALUES($1,500000,'Earlier listing history for cascade test','withdrawn') RETURNING listing_id",[vehicleId])).rows[0].listing_id);
  await test.query("INSERT INTO app.listing_price_estimates(listing_id,estimated_price,methodology) VALUES($1,520000,'Cascade test estimate')",[published]);
  const imageIds = (await test.query("SELECT image_id FROM app.listing_images WHERE listing_id=$1",[published])).rows.map(row=>row.image_id);
  const enquiryIds = (await test.query("SELECT enquiry_id FROM app.listing_enquiries WHERE listing_id=$1",[published])).rows.map(row=>row.enquiry_id);
  assert(imageIds.length && enquiryIds.length); checks++;
  const seedVehicle = (await test.query("SELECT vehicle_id FROM app.vehicles WHERE vehicle_id<>$1 ORDER BY vehicle_id LIMIT 1",[vehicleId])).rows[0].vehicle_id;
  const catalogueBefore = (await test.query("SELECT (SELECT count(*) FROM app.vehicle_variants)::int AS variants, (SELECT count(*) FROM app.fuel_economy_references)::int AS economy")).rows[0];
  await action("deleteVehicleAction", [vehicleId], {status:401});
  await action("deleteVehicleAction", [vehicleId], {cookie:buyer.cookie,status:403});
  await action("deleteVehicleAction", [vehicleId], {cookie:other.cookie,status:404});
  await action("deleteVehicleAction", ["invalid"], {cookie:dealer.cookie,status:400});
  await action("deleteVehicleAction", [vehicleId], {cookie:dealer.cookie});
  assert.equal((await test.query("SELECT 1 FROM app.vehicles WHERE vehicle_id=$1",[vehicleId])).rowCount,0); checks++;
  for(const table of ['vehicle_listings','listing_images','listing_price_estimates','listing_embeddings','listing_enquiries']) {
    assert.equal((await test.query('SELECT 1 FROM app.'+table+' WHERE listing_id=ANY($1::bigint[])',[[published,historyId]])).rowCount,0,table+' cascaded'); checks++;
  }
  assert.equal((await test.query("SELECT 1 FROM app.listing_image_data WHERE image_id=ANY($1::bigint[])",[imageIds])).rowCount,0); checks++;
  assert.equal((await test.query("SELECT 1 FROM app.vehicles WHERE vehicle_id=$1",[seedVehicle])).rowCount,1); checks++;
  assert.deepEqual((await test.query("SELECT (SELECT count(*) FROM app.vehicle_variants)::int AS variants, (SELECT count(*) FROM app.fuel_economy_references)::int AS economy")).rows[0],catalogueBefore); checks++;
  assert((await page('/listings/'+published)).includes('Active listing not found')); checks++;
  assert(!(await page('/offers',buyer.cookie)).includes('My revised offer for this vehicle.')); checks++;
  await action("deleteVehicleAction", [vehicleId], {cookie:dealer.cookie,status:404});
  const loggedOut = await action("logoutAction", [], { cookie: buyer.cookie });
  assert(loggedOut.cookie?.startsWith("autohubiq_session=")); checks++;
  for (const oldPath of ["/api/cities", "/api/auth/me", "/api/search", "/api/listings"]) {
    const removed = await fetch(base + oldPath); assert.equal(removed.status, 404); checks++;
  }
  // Framework rejects cross-origin Action invocations before running a mutation.
  const [registerId] = Object.entries(manifest.node).find(([,entry]) => entry.exportedName === "registerAction");
  const blocked = await fetch(base + "/account", { method: "POST", headers: { "Next-Action": registerId, Origin: "https://untrusted.example" }, body: await encodeReply([{}]) });
  assert(blocked.status >= 400); checks++;
  for (let i=0;i<10;i++) await action("loginAction", [{ email: "missing@example.test", password }], { status: 401 });
  await action("loginAction", [{ email: "missing@example.test", password }], { status: 429 });
  console.log(`PASS: ${checks} Server Action, server-rendered page, permission, photo and workflow checks in an isolated database.`);
} catch (error) {
  console.error("Workflow smoke test failed:", error.stack ?? error.message);
  if (serverLog) console.error(serverLog);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) { const exited = once(server, "exit"); server.kill(); await exited; }
  if (test) await test.end();
  if (created) {
    assert(/^autohubiq_test_[a-f0-9]{16}$/.test(database));
    assert.notEqual(new URL(process.env.DATABASE_URL).pathname.slice(1), database);
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    console.log("Removed the isolated test database; original demo inventory was not changed by workflow tests.");
  }
  if (runtimeRoleCreated) await admin.query(`DROP ROLE "${runtimeRole}"`);
  await admin.end();
}
