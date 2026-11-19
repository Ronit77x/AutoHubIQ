import { connection } from "next/server";
import { getListing } from "../../../lib/server/listing";
import { withImages } from "../../../lib/server/images";
import { Suspense } from "react";
import ListingDetails from "./listing-details";

export default function ListingDetailsPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] text-gray-600">
          Loading vehicle details...
        </main>
      }
    >
      <ListingDetailsRoute params={params} />
    </Suspense>
  );
}

async function ListingDetailsRoute({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  await connection();
  const { listingId } = await params;
  const response = await getListing(listingId);
  const data = await withImages(response.data);
  return <ListingDetails initial={{ listing: data.listing ?? null, error: response.ok ? "" : data.message }} />;
}
