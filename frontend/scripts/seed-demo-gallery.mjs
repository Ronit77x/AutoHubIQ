import { readFile, writeFile, access } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

const sources = JSON.parse(await readFile(new URL("../lib/demo-gallery-sources.json", import.meta.url), "utf8"));
const rows = [];
for (const [key, gallery] of Object.entries(sources)) {
  const images = [`/cars/${key}.jpg`, ...gallery.photos.map(photo => `/cars/gallery/${key}/${photo.view}.jpg`)];
  for (const [index, image] of images.entries()) {
    await access(new URL(`../public${image}`, import.meta.url));
    rows.push(`    ('${gallery.model.replaceAll("'", "''")}', '${image}', ${index + 1})`);
  }
}

const sql = `-- Local reference galleries for illustrative demo listings only.
-- Source provenance: frontend/lib/demo-gallery-sources.json.
-- Preserves dealer uploads and any existing non-placeholder image at an occupied slot.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('AutoHubIQ demo image galleries'));
CREATE TEMP TABLE autohubiq_demo_gallery (model_name TEXT, image_url TEXT, display_order SMALLINT) ON COMMIT DROP;
INSERT INTO autohubiq_demo_gallery VALUES
${rows.join(",\n")};

UPDATE app.listing_images image
SET image_url = desired.image_url, is_primary = (desired.display_order = 1)
FROM autohubiq_demo_gallery desired, app.vehicle_listings vl,
     app.vehicles v, app.vehicle_variants vv, app.vehicle_models vm
WHERE image.listing_id = vl.listing_id AND vl.vehicle_id = v.vehicle_id
  AND v.variant_id = vv.variant_id AND vv.model_id = vm.model_id
  AND vl.source_type = 'demo' AND vm.model_name = desired.model_name
  AND image.display_order = desired.display_order
  AND image.image_url LIKE 'https://placehold.co/%';

INSERT INTO app.listing_images (listing_id, image_url, display_order, is_primary)
SELECT vl.listing_id, desired.image_url, desired.display_order, (desired.display_order = 1)
FROM autohubiq_demo_gallery desired
JOIN app.vehicle_models vm ON vm.model_name = desired.model_name
JOIN app.vehicle_variants vv ON vv.model_id = vm.model_id
JOIN app.vehicles v ON v.variant_id = vv.variant_id
JOIN app.vehicle_listings vl ON vl.vehicle_id = v.vehicle_id AND vl.source_type = 'demo'
WHERE NOT EXISTS (SELECT 1 FROM app.listing_images image
  WHERE image.listing_id = vl.listing_id AND image.display_order = desired.display_order);
COMMIT;
`;

await writeFile(new URL("../../database/seed/15_seed_demo_galleries.sql", import.meta.url), sql);
if (process.argv.includes("--apply")) {
  nextEnv.loadEnvConfig(process.cwd());
  const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    const result = await client.query(`SELECT vm.model_name, COUNT(*)::int AS photos,
      COUNT(*) FILTER (WHERE li.image_url LIKE 'https://placehold.co/%')::int AS placeholders
      FROM app.listing_images li JOIN app.vehicle_listings vl USING(listing_id)
      JOIN app.vehicles v USING(vehicle_id) JOIN app.vehicle_variants vv USING(variant_id)
      JOIN app.vehicle_models vm USING(model_id) WHERE vl.source_type='demo'
      GROUP BY vm.model_name ORDER BY vm.model_name`);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Demo gallery setup failed:", error.code ?? error.message);
    process.exitCode = 1;
  } finally { await client.end(); }
} else console.log("Generated database/seed/15_seed_demo_galleries.sql; pass --apply to update the configured database.");
