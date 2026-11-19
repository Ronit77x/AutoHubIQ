import "server-only";
import { getAuthenticatedUser } from "../auth";
import { pool, withDatabaseContext } from "../db";

// Resolve database-backed photos while rendering data on the server. Existing
// stored URLs remain valid identifiers; the browser receives image bytes.
export const withImages = withDatabaseContext(async function withImages<T>(value: T): Promise<T> {
  const serialized = JSON.stringify(value);
  const ids = [...serialized.matchAll(/(?:\/api\/images\/|stored-image:)([1-9]\d*)/g)].map(match => match[1]);
  if (!ids.length) return value;
  await getAuthenticatedUser();
  const images = await pool.query<{ image_id: string; content: Buffer }>(
    "SELECT image_id, content FROM app.listing_image_data WHERE image_id = ANY($1::bigint[])", [[...new Set(ids)]]);
  const urls = new Map(images.rows.map(image => [String(image.image_id), `data:image/jpeg;base64,${image.content.toString("base64")}`]));
  return JSON.parse(serialized.replace(/(?:\/api\/images\/|stored-image:)([1-9]\d*)/g, (_, id: string) => urls.get(id) ?? "/image-unavailable.svg"));
});
