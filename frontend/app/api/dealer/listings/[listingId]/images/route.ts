import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getAuthenticatedUser, isSameOrigin } from "../../../../../../lib/auth";
import { pool } from "../../../../../../lib/db";
import { rateLimit } from "../../../../../../lib/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, message: "Cross-origin requests are not allowed" }, { status: 403 });
  const { listingId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(listingId)) return NextResponse.json({ success: false, message: "Invalid listing ID" }, { status: 400 });
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, message: "Sign in to upload photos" }, { status: 401 });
    if (user.user_role !== "dealer" || user.verification_status !== "verified") return NextResponse.json({ success: false, message: "A verified dealer account is required" }, { status: 403 });
    const limited = await rateLimit(`upload:${user.user_id}`, 30, 600);
    if (limited) return limited;
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) return NextResponse.json({ success: false, message: "Photo must be under 5 MB" }, { status: 413 });
    let content: Buffer;
    try {
      const form = await request.formData();
      const photo = form.get("photo");
      if (!(photo instanceof File) || !photo.size || photo.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new Error("Invalid photo");
      // Decode actual bytes, reject decompression bombs, strip metadata and normalize to JPEG.
      content = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 25_000_000 })
        .rotate().resize(1600, 1200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      if (content.length > 2 * 1024 * 1024) throw new Error("Photo too large");
    } catch {
      return NextResponse.json({ success: false, message: "Choose a valid JPEG, PNG or WebP photo under 5 MB (maximum 25 megapixels)." }, { status: 400 });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query(`SELECT vl.listing_id FROM app.vehicle_listings vl
        JOIN app.vehicles v ON v.vehicle_id=vl.vehicle_id
        JOIN app.dealer_profiles dp ON dp.dealer_id=v.dealer_id
        WHERE vl.listing_id=$1 AND dp.user_id=$2 AND dp.verification_status='verified'
        FOR UPDATE OF dp, vl`, [listingId, user.user_id]);
      if (!owned.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, message: "Listing not found in your inventory" }, { status: 404 });
      }
      const count = (await client.query("SELECT COUNT(*)::int AS count FROM app.listing_images WHERE listing_id=$1", [listingId])).rows[0].count;
      if (count >= 6) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, message: "A listing can have up to six photos" }, { status: 400 });
      }
      const image = (await client.query(`INSERT INTO app.listing_images (listing_id, image_url, display_order, is_primary)
        VALUES ($1, '', $2, $3) RETURNING image_id`, [listingId, count + 1, count === 0])).rows[0];
      const imageUrl = `/api/images/${image.image_id}`;
      await client.query("UPDATE app.listing_images SET image_url=$2 WHERE image_id=$1", [image.image_id, imageUrl]);
      await client.query("INSERT INTO app.listing_image_data (image_id, content) VALUES ($1,$2)", [image.image_id, content]);
      await client.query("COMMIT");
      return NextResponse.json({ success: true, image_url: imageUrl }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error("Photo upload failed:", error);
    return NextResponse.json({ success: false, message: "Unable to upload photo" }, { status: 500 });
  }
}
