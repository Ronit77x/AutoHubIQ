import { connection } from "next/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AccountClient from "./account-client";
import { getAccount } from "../../lib/server/account";
import { getCities } from "../../lib/server/cities";
import { readData } from "../../lib/server/page-data";

async function Account() {
  await connection();
  const [account, cities] = await Promise.all([getAccount(), getCities()]);
  const user = readData(account).user;
  if (user) redirect(user.user_role === "admin" ? "/admin" : user.user_role === "dealer" ? "/dealer" : "/");
  return <AccountClient initialCities={readData(cities).cities} />;
}
export default function Page() { return <Suspense fallback={<p className="p-10">Loading account...</p>}><Account /></Suspense>; }
