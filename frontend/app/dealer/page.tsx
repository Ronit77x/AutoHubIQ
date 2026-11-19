import { connection } from "next/server";
import { Suspense } from "react";
import DealerClient from "./dealer-client";
import { requirePageRole, readData } from "../../lib/server/page-data";
import { getDealerDashboard } from "../../lib/server/dealer-dashboard";
import { getDealerCatalog } from "../../lib/server/dealer-catalog";
import { withImages } from "../../lib/server/images";

async function Workspace() {
  await connection();
  const account = await requirePageRole("dealer");
  const [dashboard, catalog] = await Promise.all([getDealerDashboard(), getDealerCatalog()]);
  const data = await withImages(readData(dashboard));
  return <DealerClient initial={{ account, profile: data.profile, listings: data.listings, enquiries: data.enquiries ?? [], variants: readData(catalog).variants }} />;
}
export default function Page() { return <Suspense fallback={<p className="p-10">Loading dealer workspace...</p>}><Workspace /></Suspense>; }
