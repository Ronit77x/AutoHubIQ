import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { getAuthenticatedUser } from "../auth";
import { pool } from "../db";
import { rateLimit } from "../rate-limit";

export const submitEnquiry = withDatabaseContext(async function submitEnquiry(listingId: string, input: unknown) {
  if (!/^[1-9]\d{0,14}$/.test(listingId)) return reply({ success: false, message: "Invalid listing ID" }, { status: 400 });
  try {
    const user = await getAuthenticatedUser();
    if (!user) return reply({ success: false, message: "Sign in before contacting a dealer" }, { status: 401 });
    const limited = await rateLimit(`enquiry:${user.user_id}`, 10, 600);
    if (limited) return limited;
    let body;
    try { body = JSON.parse(JSON.stringify(input ?? null)); } catch { return reply({ success: false, message: "Valid JSON is required" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ success: false, message: "The request body must be an object" }, { status: 400 });
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const type = body?.request_type;
    const amount = typeof body.offer_amount === "string" || typeof body.offer_amount === "number" ? String(body.offer_amount) : "";
    if (type === "offer" && user.user_role !== "customer") return reply({ success: false, message: "A customer account is required to make an offer" }, { status: 403 });
    if (type === "offer" && (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)) return reply({ success: false, message: "Enter a positive offer in rupees with at most two decimal places" }, { status: 400 });
    if (message.length < 10 || message.length > 2000 || (phone && !/^[+\d ()-]{7,20}$/.test(phone)) || !["enquiry", "test_drive", "offer"].includes(type))
      return reply({ success: false, message: "Provide a message of 10–2000 characters and a valid phone number if supplied" }, { status: 400 });
    const result = await pool.query(`INSERT INTO app.listing_enquiries (listing_id, user_id, message, phone, request_type, offer_amount)
      SELECT vl.listing_id, $2, $3, $4, $5, $6::numeric FROM app.vehicle_listings vl
      JOIN app.vehicles v ON v.vehicle_id=vl.vehicle_id
      JOIN app.dealer_profiles dp ON dp.dealer_id=v.dealer_id
      WHERE vl.listing_id=$1 AND vl.listing_status='active'
        AND dp.verification_status='verified' AND dp.user_id <> $2
      RETURNING enquiry_id`, [listingId, user.user_id, message, phone || null, type, type === "offer" ? amount : null]);
    if (!result.rowCount) return reply({ success: false, message: "Requests are available for other verified dealers’ active listings only." }, { status: 409 });
    if (type === "offer") return reply({ success: true, message: "Your offer is in the dealer’s inbox. The dealer can contact you directly. This does not reserve or purchase the car." }, { status: 201 });
    return reply({ success: true, message: "Your request is in the dealer’s inbox. The dealer can contact you using your account email or supplied phone." }, { status: 201 });
  } catch (error) {
    console.error("Enquiry failed:", error);
    return reply({ success: false, message: "Unable to submit enquiry" }, { status: 500 });
  }
});
