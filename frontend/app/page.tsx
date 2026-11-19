import { Suspense } from "react";
import { connection } from "next/server";
import HomeClient from "./home-client";
import { getCities } from "../lib/server/cities";
import { getAccount } from "../lib/server/account";
import { getListings } from "../lib/server/listings";
import { searchListings } from "../lib/server/search";
import { readData } from "../lib/server/page-data";
import { withImages } from "../lib/server/images";

type Query = Record<string, string | string[] | undefined>;
async function Marketplace({ searchParams }: { searchParams: Promise<Query> }) {
  await connection();
  const params = await searchParams;
  const value = (name: string, fallback = "") => typeof params[name] === "string" ? params[name] as string : fallback;
  const filters = { query: value("query"), max_price: value("max_price"), fuel_type: value("fuel_type"), transmission: value("transmission"), sort: value("sort", "newest") };
  const [cityResult, accountResult] = await Promise.all([getCities(), getAccount()]);
  const cities = readData(cityResult).cities;
  const city = Number(value("city"));
  const selectedCity = cities.some((item: { city_id: number }) => Number(item.city_id) === city) ? city : null;
  const page = Number(value("page", "1"));
  let listings = [], hasMore = false, error = "", rankingNote = null;
  if (selectedCity !== null) {
    const response = filters.query
      ? await searchListings({ query: filters.query, city_id: city, page, page_size: 12, max_price: filters.max_price ? Number(filters.max_price) : null, fuel_type: filters.fuel_type || null, transmission: filters.transmission || null })
      : await getListings({ ...filters, city_id: String(city), page: String(page), page_size: "12" });
    const data = await withImages(response.data);
    if (response.ok) { listings = data.listings; hasMore = data.has_more; rankingNote = data.ranking_note ?? null; }
    else error = data.message;
  }
  const initial = { cities, account: readData(accountResult).user, selectedCity, listings, filters, page, hasMore, error, rankingNote };
  return <HomeClient key={JSON.stringify([city, page, filters])} initial={initial} />;
}
export default function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <Suspense fallback={<p className="p-10">Loading marketplace...</p>}><Marketplace searchParams={searchParams} /></Suspense>;
}
