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
  const { listingId } = await params;
  return <ListingDetails listingId={listingId} />;
}
