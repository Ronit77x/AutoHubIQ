import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { getAuthenticatedUser } from "../auth";
import { pool } from "../db";
import { rateLimit } from "../rate-limit";

export const updateOffer = withDatabaseContext(async function updateOffer(offerId: string, input: unknown) {
  if (!/^[1-9]\d{0,14}$/.test(offerId)) return reply({ message: "Invalid offer ID" }, { status: 400 });
  try {
    const user = await getAuthenticatedUser();
    if (!user) return reply({ message: "Sign in to manage offers" }, { status: 401 });
    const limited = await rateLimit(`offer-update:${user.user_id}`, 30, 600);
    if (limited) return limited;
    let body;
    try { body = JSON.parse(JSON.stringify(input ?? null)); } catch { return reply({ message: "Valid JSON is required" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ message: "An object is required" }, { status: 400 });
    const contacting = body.action === "mark_contacted";
    if (contacting ? user.user_role !== "dealer" : user.user_role !== "customer") return reply({ message: "This action is not available for your account" }, { status: 403 });
    const amount = typeof body.offer_amount === "string" || typeof body.offer_amount === "number" ? String(body.offer_amount) : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!contacting && (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || message.length < 10 || message.length > 2000 || (phone && !/^[+\d ()-]{7,20}$/.test(phone)))) {
      return reply({ message: "Provide a positive offer with at most two decimal places, a message of 10–2000 characters, and a valid phone if supplied" }, { status: 400 });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize buyer edits against dealer contact and listing/profile changes.
      const result = await client.query("SELECT * FROM app.lock_offer_context($1,$2)", [offerId, contacting]);
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return reply({ message: "Offer not found" }, { status: 404 });
      }
      const offer = result.rows[0];
      if (!contacting && (offer.contacted_at || offer.listing_status !== "active" || offer.verification_status !== "verified")) {
        await client.query("ROLLBACK");
        return reply({ message: "This offer can no longer be edited. The dealer has marked it contacted or the listing is unavailable." }, { status: 409 });
      }
      if (contacting) {
        await client.query("UPDATE app.listing_enquiries SET contacted_at=COALESCE(contacted_at,CURRENT_TIMESTAMP) WHERE enquiry_id=$1", [offerId]);
      } else {
        await client.query("UPDATE app.listing_enquiries SET offer_amount=$2, message=$3, phone=$4, updated_at=CURRENT_TIMESTAMP WHERE enquiry_id=$1", [offerId, amount, message, phone || null]);
      }
      await client.query("COMMIT");
      return reply({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error("Offer update failed:", error);
    return reply({ message: "Unable to update offer" }, { status: 500 });
  }
});
