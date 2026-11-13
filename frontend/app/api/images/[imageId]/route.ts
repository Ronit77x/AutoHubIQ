import { NextRequest } from "next/server";
import { pool } from "../../../../lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(imageId)) return new Response(null, { status: 404 });
  try {
    const result = await pool.query("SELECT content FROM app.listing_image_data WHERE image_id=$1", [imageId]);
    if (!result.rowCount) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(result.rows[0].content), { headers: {
      "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400", "Content-Disposition": "inline",
    } });
  } catch {
    return new Response(null, { status: 503 });
  }
}
