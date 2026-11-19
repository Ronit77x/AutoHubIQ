import { connection } from "next/server";
import { Suspense } from "react";
import AdminClient from "./admin-client";
import { requirePageRole, readData } from "../../lib/server/page-data";
import { getDealers } from "../../lib/server/admin-dealers";

async function Workspace() {
  await connection();
  const account = await requirePageRole("admin");
  return <AdminClient initial={{ account, dealers: readData(await getDealers()).dealers }} />;
}
export default function Page() { return <Suspense fallback={<p className="p-10">Loading administration...</p>}><Workspace /></Suspense>; }
