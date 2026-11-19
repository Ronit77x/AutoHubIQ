import { connection } from "next/server";
import { Suspense } from "react";
import OffersClient from "./offers-client";
import { getOffers } from "../../lib/server/offers";

async function Offers() {
  await connection();
  const result = await getOffers();
  return <OffersClient initial={{ offers: result.data.offers ?? [], error: result.ok ? "" : result.data.message, needsLogin: result.status === 401 }} />;
}
export default function Page() { return <Suspense fallback={<p className="p-10">Loading offers...</p>}><Offers /></Suspense>; }
