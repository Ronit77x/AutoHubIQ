import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isSameOrigin } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";
import { rateLimit } from "../../../../../lib/rate-limit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, message: "Cross-origin requests are not allowed" }, { status: 403 });
  const { listingId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(listingId)) return NextResponse.json({ success: false, message: "Invalid listing ID" }, { status: 400 });
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, message: "Sign in before contacting a dealer" }, { status: 401 });
    const limited = await rateLimit(`enquiry:${user.user_id}`, 10, 600);
    if (limited) return limited;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Valid JSON is required" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, message: "The request body must be an object" }, { status: 400 });
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const type = body?.request_type;
    const amount = typeof body.offer_amount === "string" || typeof body.offer_amount === "number" ? String(body.offer_amount) : "";
    if (type === "offer" && user.user_role !== "customer") return NextResponse.json({ success: false, message: "A customer account is required to make an offer" }, { status: 403 });
    if (type === "offer" && (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)) return NextResponse.json({ success: false, message: "Enter a positive offer in rupees with at most two decimal places" }, { status: 400 });
    if (message.length < 10 || message.length > 2000 || (phone && !/^[+\d ()-]{7,20}$/.test(phone)) || !["enquiry", "test_drive", "offer"].includes(type))
      return NextResponse.json({ success: false, message: "Provide a message of 10–2000 characters and a valid phone number if supplied" }, { status: 400 });
    const result = await pool.query(`INSERT INTO app.listing_enquiries (listing_id, user_id, message, phone, request_type, offer_amount)
      SELECT vl.listing_id, $2, $3, $4, $5, $6::numeric FROM app.vehicle_listings vl
      JOIN app.vehicles v ON v.vehicle_id=vl.vehicle_id
      JOIN app.dealer_profiles dp ON dp.dealer_id=v.dealer_id
      WHERE vl.listing_id=$1 AND vl.listing_status='active'
        AND dp.verification_status='verified' AND dp.user_id <> $2
      RETURNING enquiry_id`, [listingId, user.user_id, message, phone || null, type, type === "offer" ? amount : null]);
    if (!result.rowCount) return NextResponse.json({ success: false, message: "Requests are available for other verified dealers’ active listings only." }, { status: 409 });
    if (type === "offer") return NextResponse.json({ success: true, message: "Your offer is in the dealer’s inbox. The dealer can contact you directly. This does not reserve or purchase the car." }, { status: 201 });
    return NextResponse.json({ success: true, message: "Your request is in the dealer’s inbox. The dealer can contact you using your account email or supplied phone." }, { status: 201 });
  } catch (error) {
    console.error("Enquiry failed:", error);
    return NextResponse.json({ success: false, message: "Unable to submit enquiry" }, { status: 500 });
  }
}
