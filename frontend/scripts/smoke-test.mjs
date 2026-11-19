import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
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
async function request(path, { cookie, body, method, status = 200, headers = {} } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${base}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body && !isForm ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  assert.equal(response.status, status, `${method ?? "request"} ${path}: ${data?.message ?? response.status}`);
  checks++;
  return { data, response, cookie: response.headers.get("set-cookie")?.split(";")[0] };
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
  await request("/");
  const cities = (await request("/api/cities")).data.cities;
  const cityId = Number(cities[0].city_id);
  await request("/api/db-check", { status: 401 });
  await request("/api/listings?city_id=1&sort=invalid", { status: 400 });
  await request("/api/listings?city_id=1&page=0", { status: 400 });
  const first = (await request(`/api/listings?city_id=${cityId}&page_size=2&sort=price_asc`)).data;
  const second = (await request(`/api/listings?city_id=${cityId}&page_size=2&sort=price_asc&page=2`)).data;
  assert.equal(first.has_more, true);
  assert.equal(first.listings.length, 2);
  assert(!second.listings.some(row => first.listings.some(previous => previous.listing_id === row.listing_id)));
  assert(Number(first.listings[0].asking_price) <= Number(first.listings[1].asking_price));
  const filtered = (await request(`/api/listings?city_id=${cityId}&fuel_type=Petrol&max_price=600000`)).data;
  assert(filtered.listings.every(row => row.fuel_type === "Petrol" && Number(row.asking_price) <= 600000));
  const password = randomBytes(18).toString("base64url");
  async function register(email, type) {
    return request("/api/auth/register", { status: 201, body: { full_name: "Workflow Test", email, password, account_type: type,
      dealership_name: "Workflow Test Motors", city_id: cityId, street_address: "123 Test Street" } });
  }
  await request("/api/auth/register", { status: 400, body: { full_name: "Blocked Admin", email: "blocked@example.test", password, account_type: "admin" } });
  const customer = await register("buyer@example.test", "customer");
  const dealer = await register("dealer@example.test", "dealer");
  const other = await register("other@example.test", "dealer");
  const administrator = await register("admin@example.test", "customer");
  await test.query("UPDATE app.users SET user_role='admin' WHERE email='admin@example.test'");
  await request("/api/admin/dealers", { cookie: customer.cookie, status: 403 });
  await request("/api/db-check", { cookie: customer.cookie, status: 403 });
  await request("/api/db-check", { cookie: administrator.cookie });
  const login = await request("/api/auth/login", { body: { email: "buyer@example.test", password } });
  assert(login.cookie);
  const catalog = (await request("/api/dealer/catalog", { cookie: dealer.cookie })).data.variants;
  const listing = { variant_id: Number(catalog[0].variant_id), manufacturing_year: 2022, kms_driven: 24000,
    asking_price: 550000, condition: "good", description: "Well maintained family vehicle for workflow testing." };
  await request("/api/dealer/listings", { cookie: dealer.cookie, body: listing, status: 403 });
  const dealerId = (await test.query("SELECT dealer_id FROM app.dealer_profiles dp JOIN app.users u USING(user_id) WHERE u.email='dealer@example.test'")).rows[0].dealer_id;
  await request("/api/admin/dealers", { cookie: administrator.cookie, method: "PATCH", body: { dealer_id: dealerId, verification_status: "verified" } });
  const published = (await request("/api/dealer/listings", { cookie: dealer.cookie, body: listing, status: 201 })).data.listing_id;
  await request(`/api/listings/${published}`);
  const photo = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#2463eb" } }).png().toBuffer();
  function photoForm(bytes = photo) { const form = new FormData(); form.set("photo", new Blob([bytes], { type: "image/png" }), "vehicle.png"); return form; }
  await request(`/api/dealer/listings/${published}/images`, { body: photoForm(), status: 401 });
  await request(`/api/dealer/listings/${published}/images`, { cookie: other.cookie, body: photoForm(), status: 403 });
  await request(`/api/dealer/listings/${published}/images`, { cookie: dealer.cookie, body: photoForm(Buffer.from("not an image")), status: 400 });
  const upload = await request(`/api/dealer/listings/${published}/images`, { cookie: dealer.cookie, body: photoForm(), status: 201 });
  const image = (await request(upload.data.image_url)).response;
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert((await image.arrayBuffer()).byteLength > 0);
  for (let i = 1; i < 6; i++) await request(`/api/dealer/listings/${published}/images`, { cookie: dealer.cookie, body: photoForm(), status: 201 });
  await request(`/api/dealer/listings/${published}/images`, { cookie: dealer.cookie, body: photoForm(), status: 400 });
  const enquiry = { message: "Can I arrange a test drive this weekend?", phone: "+91 9999999999", request_type: "test_drive" };
  await request(`/api/listings/${published}/enquiries`, { body: enquiry, status: 401 });
  await request(`/api/listings/${published}/enquiries`, { cookie: dealer.cookie, body: enquiry, status: 409 });
  await request(`/api/listings/${published}/enquiries`, { cookie: customer.cookie, body: enquiry, status: 201 });
  await request(`/api/listings/${first.listings[0].listing_id}/enquiries`, { cookie: customer.cookie, body: enquiry, status: 201 });
  const offer = { message: "I would like to offer this amount for the car.", request_type: "offer", offer_amount: "500000.50" };
  await request(`/api/listings/${published}/enquiries`, { body: offer, status: 401 });
  await request(`/api/listings/${published}/enquiries`, { cookie: other.cookie, body: offer, status: 403 });
  for (const amount of ["0", "-1", "1.001", "NaN", "10000000000"]) {
    await test.query("DELETE FROM app.request_limits");
    await request(`/api/listings/${published}/enquiries`, { cookie: customer.cookie, body: { ...offer, offer_amount: amount }, status: 400 });
  }
  await request(`/api/listings/${published}/enquiries`, { cookie: customer.cookie, body: offer, status: 201 });
  await request(`/api/listings/${first.listings[0].listing_id}/enquiries`, { cookie: customer.cookie, body: offer, status: 201 });
  const inbox = (await request("/api/dealer/dashboard", { cookie: dealer.cookie })).data.enquiries;
  assert.equal(inbox.length, 2); assert.equal(inbox.find(row => row.request_type === "test_drive").message, enquiry.message);
  assert.equal(inbox.find(row => row.request_type === "offer").offer_amount, offer.offer_amount);
  assert.equal((await request("/api/dealer/dashboard", { cookie: other.cookie })).data.enquiries.length, 0);
  await request("/offers");
  await request("/api/offers", { status: 401 });
  await request("/api/offers", { cookie: dealer.cookie, status: 403 });
  const otherBuyer = await register("other-buyer@example.test", "customer");
  assert.equal((await request("/api/offers", { cookie: otherBuyer.cookie })).data.offers.length, 0);
  // Concurrent requests share a pool, never an actor identity.
  await Promise.all(Array.from({ length: 24 }, async (_, index) => {
    const own = index % 2 === 0;
    const response = await request("/api/offers", { cookie: own ? customer.cookie : otherBuyer.cookie });
    assert.equal(response.data.offers.length, own ? 2 : 0);
  }));
  const buyerOffers = (await request("/api/offers", { cookie: customer.cookie })).data.offers;
  assert.equal(buyerOffers.length, 2);
  const offerId = inbox.find(row => row.request_type === "offer").enquiry_id;
  const revision = { ...offer, offer_amount: "510000.25", message: "My revised offer includes a prompt inspection.", phone: "+91 9888888888" };
  await request(`/api/offers/${offerId}`, { method: "PATCH", body: revision, status: 401 });
  await request(`/api/offers/${offerId}`, { cookie: otherBuyer.cookie, method: "PATCH", body: revision, status: 404 });
  await request(`/api/offers/${offerId}`, { cookie: customer.cookie, method: "PATCH", body: { ...revision, offer_amount: "1.001" }, status: 400 });
  await request(`/api/offers/${offerId}`, { cookie: customer.cookie, method: "PATCH", body: revision, headers: { Origin: "https://untrusted.example" }, status: 403 });
  await request(`/api/offers/${offerId}`, { cookie: customer.cookie, method: "PATCH", body: revision });
  const revised = (await request("/api/dealer/dashboard", { cookie: dealer.cookie })).data.enquiries.find(row => row.enquiry_id === offerId);
  assert.equal(revised.offer_amount, revision.offer_amount); assert.equal(revised.message, revision.message); assert.equal(revised.phone, revision.phone);
  const contact = { action: "mark_contacted" };
  await request(`/api/offers/${offerId}`, { cookie: customer.cookie, method: "PATCH", body: contact, status: 403 });
  await request(`/api/offers/${offerId}`, { cookie: other.cookie, method: "PATCH", body: contact, status: 404 });
  await request(`/api/offers/${offerId}`, { cookie: dealer.cookie, method: "PATCH", body: contact });
  await request(`/api/offers/${offerId}`, { cookie: dealer.cookie, method: "PATCH", body: contact });
  await request(`/api/offers/${offerId}`, { cookie: customer.cookie, method: "PATCH", body: revision, status: 409 });
  const contacted = (await request("/api/offers", { cookie: customer.cookie })).data.offers.find(row => row.enquiry_id === offerId);
  assert(contacted.contacted_at); assert.equal(contacted.editable, false);
  const enquiryId = inbox.find(row => row.request_type === "test_drive").enquiry_id;
  await request(`/api/offers/${enquiryId}`, { cookie: customer.cookie, method: "PATCH", body: revision, status: 404 });
  // A listing closing also locks pending offers while retaining them in buyer history.
  const demoOffer = buyerOffers.find(row => row.enquiry_id !== offerId);
  await test.query("UPDATE app.vehicle_listings SET listing_status='sold' WHERE listing_id=$1", [demoOffer.listing_id]);
  await request(`/api/offers/${demoOffer.enquiry_id}`, { cookie: customer.cookie, method: "PATCH", body: revision, status: 409 });
  assert.equal((await request("/api/offers", { cookie: customer.cookie })).data.offers.find(row => row.enquiry_id === demoOffer.enquiry_id).editable, false);
  await test.query("UPDATE app.vehicle_listings SET listing_status='active' WHERE listing_id=$1", [demoOffer.listing_id]);
  await request(`/api/dealer/listings/${published}`, { cookie: other.cookie, method: "PATCH", body: { asking_price: 1 }, status: 404 });
  await request(`/api/dealer/listings/${published}`, { cookie: dealer.cookie, method: "PATCH", body: { asking_price: 525000 } });
  assert.equal(Number((await request(`/api/listings/${published}`)).data.listing.asking_price), 525000);
  const search = (await request("/api/search", { body: { query: "family vehicle", city_id: cityId, max_price: 600000, page_size: 1 } })).data;
  assert.equal(search.listings.length, 1); assert.equal(search.has_more, true);
  const nextSearch = (await request("/api/search", { body: { query: "family vehicle", city_id: cityId, max_price: 600000, page_size: 1, page: 2 } })).data;
  assert.notEqual(search.listings[0].listing_id, nextSearch.listings[0].listing_id);
  await request(`/api/dealer/listings/${published}`, { cookie: dealer.cookie, method: "PATCH", body: { listing_status: "sold" } });
  await request(`/api/listings/${published}`, { status: 404 });
  await test.query("DELETE FROM app.request_limits");
  await request(`/api/listings/${published}/enquiries`, { cookie: customer.cookie, body: offer, status: 409 });
  await request(`/api/dealer/listings/${published}`, { cookie: dealer.cookie, method: "PATCH", body: { listing_status: "active" } });
  await request("/api/admin/dealers", { cookie: administrator.cookie, method: "PATCH", body: { dealer_id: dealerId, verification_status: "rejected" } });
  await request(`/api/listings/${published}`, { status: 404 });
  await request("/api/auth/logout", { cookie: customer.cookie, method: "POST" });
  await request("/api/auth/register", { headers: { Origin: "https://untrusted.example" }, body: {}, status: 403 });
  for (let i = 0; i < 10; i++) await request("/api/auth/login", { body: { email: "missing@example.test", password }, status: 401 });
  await request("/api/auth/login", { body: { email: "missing@example.test", password }, status: 429 });
  console.log(`PASS: ${checks} HTTP checks plus database and workflow assertions in an isolated temporary database.`);
} catch (error) {
  console.error("Workflow smoke test failed:", error.message);
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
