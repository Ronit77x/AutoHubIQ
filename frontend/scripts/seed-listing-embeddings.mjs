import { pipeline } from "@huggingface/transformers";
import pg from "pg";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { Pool } = pg;
const MODEL_NAME = "onnx-community/all-MiniLM-L6-v2-ONNX";
const EMBEDDING_DIMENSIONS = 384;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in frontend/.env.local");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const listings = await pool.query(`
    SELECT
      ald.listing_id,
      CONCAT_WS(
        '. ',
        ald.manufacturer_name || ' ' || ald.model_name || ' ' || ald.variant_name,
        ald.manufacturing_year::TEXT || ' model year',
        ald.body_type || ', ' || ald.fuel_type || ', ' || ald.transmission,
        ald.condition || ' condition',
        ald.ownership_count::TEXT || ' owner(s)',
        'Driven ' || ald.kms_driven::TEXT || ' kilometres',
        'Located in ' || ald.city_name,
        CASE
          WHEN NULLIF(ald.colour, '') IS NOT NULL
            THEN 'Colour ' || ald.colour
        END,
        ald.description
      ) AS source_text
    FROM app.active_listing_details ald
    ORDER BY ald.listing_id
  `);

  if (listings.rowCount === 0) {
    throw new Error("No active listings were found to embed");
  }

  const extractor = await pipeline("feature-extraction", MODEL_NAME);
  const embeddings = [];

  for (const listing of listings.rows) {
    const output = await extractor(listing.source_text, {
      pooling: "mean",
      normalize: true,
    });
    const embedding = Array.from(output.data);

    if (
      embedding.length !== EMBEDDING_DIMENSIONS ||
      embedding.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(
        `Listing ${listing.listing_id} produced an invalid ${embedding.length}-dimensional embedding`
      );
    }

    embeddings.push({ ...listing, embedding });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const item of embeddings) {
      await client.query(
        `
        INSERT INTO app.listing_embeddings (
          listing_id,
          embedding,
          source_text,
          model_name
        )
        VALUES ($1, $2::vector, $3, $4)
        ON CONFLICT (listing_id) DO UPDATE
        SET embedding = EXCLUDED.embedding,
            source_text = EXCLUDED.source_text,
            model_name = EXCLUDED.model_name,
            generated_at = CURRENT_TIMESTAMP
        WHERE app.listing_embeddings.source_text
                  IS DISTINCT FROM EXCLUDED.source_text
           OR app.listing_embeddings.model_name
                  IS DISTINCT FROM EXCLUDED.model_name
        `,
        [
          item.listing_id,
          `[${item.embedding.join(",")}]`,
          item.source_text,
          MODEL_NAME,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const result = await pool.query(`
    SELECT COUNT(*)::INT AS embedding_count
    FROM app.listing_embeddings e
    JOIN app.vehicle_listings vl USING (listing_id)
    WHERE vl.listing_status = 'active'
  `);
  console.log(
    `Generated ${embeddings.length} embeddings using ${MODEL_NAME}; ${result.rows[0].embedding_count} active listings now have embeddings.`
  );
}

main()
  .catch((error) => {
    console.error("Listing embedding generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
