
"use client";
import { logoutAction } from "../app/actions";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FuelEconomy from "../components/fuel-economy";
import type { FuelEconomyReference } from "../lib/fuel-economy";
import {
  CarFront,
  MapPin,
  Search,
  Gauge,
  Fuel,
  Settings2,
  ArrowRight,
} from "lucide-react";

interface City {
  city_id: number;
  city_name: string;
  state_name: string;
}

interface CarImage {
  image_id: number;
  image_url: string;
  is_primary: boolean;
}

interface Listing {
  listing_id: number;
  asking_price: string;
  estimated_price: string | null;
  lower_price: string | null;
  upper_price: string | null;
  description: string;
  manufacturing_year: number;
  kms_driven: number;
  fuel_economy: FuelEconomyReference | null;
  colour: string;
  ownership_count: number;
  condition: string;
  variant_name: string;
  fuel_type: string;
  transmission: string;
  model_name: string;
  manufacturer_name: string;
  dealership_name: string;
  city_name: string;
  source_type: string;
  images: CarImage[];
  similarity?: number;
}

interface Filters { query: string; max_price: string; fuel_type: string; transmission: string; sort: string }
interface HomeData { cities: City[]; account: { full_name: string; user_role: string } | null; selectedCity: number | null; listings: Listing[]; hasMore: boolean; filters: Filters; page: number; error: string; rankingNote: string | null }
export default function Home({ initial }: { initial: HomeData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { cities, account, selectedCity, listings, filters, page, hasMore, rankingNote } = initial;
  const [searchQuery, setSearchQuery] = useState(filters.query);
  const [maxPrice, setMaxPrice] = useState(filters.max_price);
  const [fuelType, setFuelType] = useState(filters.fuel_type);
  const [transmission, setTransmission] = useState(filters.transmission);
  const [sort, setSort] = useState(filters.sort);
  const [actionError, setError] = useState("");
  const error = actionError || initial.error;
  const searchError = "";
  const searchResults = filters.query ? listings : null;
  const loadingCities = false, loadingListings = pending, searching = pending && Boolean(filters.query);
  function navigate(city: number | null, nextFilters = filters, nextPage = 1) {
    const params = new URLSearchParams();
    if (city !== null) {
      params.set("city", String(city)); params.set("page", String(nextPage));
      for (const [key,value] of Object.entries(nextFilters)) if(value) params.set(key,value);
    }
    startTransition(() => router.push(params.size ? "/?"+params : "/", { scroll: false }));
  }
  function goHome() { navigate(null); }
  function chooseCity(id: number) { navigate(id); }
  function setPage(next: number) { navigate(selectedCity, filters, next); }
  function setFilters(next: Filters) { navigate(selectedCity, next); }
  async function signOut() {
    try { const response = await logoutAction(); if (!response.ok) throw new Error("Unable to sign out"); router.refresh(); }
    catch(failure) { setError(failure instanceof Error ? failure.message : "Unable to sign out"); }
  }
  function handleSemanticSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(selectedCity !== null) navigate(selectedCity, { query: searchQuery.trim(), max_price: maxPrice, fuel_type: fuelType, transmission, sort });
  }

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const selectedCityName =
    cities.find((city) => city.city_id === selectedCity)?.city_name;

  return (
    <main className="min-h-screen bg-neutral-50 text-[#172033]">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" onClick={event => { event.preventDefault(); goHome(); }} className="flex items-center gap-2">
            <div className="rounded-xl bg-accent-700 p-2 text-white">
              <CarFront size={25} />
            </div>
            <span className="text-2xl font-semibold tracking-tight">
              AutoHub<span className="text-accent-700">IQ</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#cities" className="hover:text-accent-700">
              Explore Cars
            </a>
            <a href="#about" className="hover:text-accent-700">
              About Us
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={goHome} className="text-sm font-semibold text-slate-700">Home</button>
            <Link
              href={account?.user_role === "dealer" ? "/dealer" : account?.user_role === "admin" ? "/admin" : "/account"}
              className="rounded-full border border-accent-200 px-4 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-50"
            >
              {account?.user_role === "dealer" ? "Dealer workspace" : account?.user_role === "admin" ? "Admin workspace" : account ? account.full_name : "Account"}
            </Link>
            {account?.user_role === "customer" && <Link href="/offers" className="text-sm font-semibold text-accent-700 hover:underline">My offers</Link>}
            {account && <button onClick={signOut} className="text-sm font-semibold text-slate-600 hover:text-accent-700">Sign out</button>}

          </div>
        </div>
      </nav>

      {selectedCity === null && <section className="border-b border-amber-100 bg-[#fff8ec]"><div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Your next chapter, on the road</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">The right car.<br />A little closer to home.</h1><p className="mt-4 max-w-md text-base leading-7 text-slate-600">Explore cars from local dealerships, compare the details, and find something that fits your everyday.</p><a href="#cities" className="mt-6 inline-flex items-center gap-3 rounded-lg bg-accent-700 px-5 py-3 font-semibold text-white">Explore your city <ArrowRight size={18} /></a></div><Image src="/cars/virtus.jpg" alt="Illustrative Volkswagen Virtus exterior" width={1000} height={650} className="max-h-72 w-full rounded-xl object-cover" priority /></div></section>}
      <section id="cities" className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">AutoHubIQ / Used cars</p><h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Find your next car.</h1><p className="mt-3 text-sm text-neutral-500">Explore local inventory. Compare the details that matter.</p></div>

        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Choose your city">
          {loadingCities ? <p>Loading cities...</p> : cities.map(city => <button key={city.city_id} type="button" aria-pressed={selectedCity === city.city_id} onClick={() => chooseCity(Number(city.city_id))} className={`flex items-center gap-4 rounded-xl border p-5 text-left transition ${selectedCity === city.city_id ? "border-accent-700 bg-accent-700 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400"}`}>
            <MapPin size={24} className="shrink-0" /><span className="flex-1"><span className="block text-lg font-semibold">{city.city_name}</span><span className={`mt-1 block text-xs ${selectedCity === city.city_id ? "text-blue-100" : "text-neutral-500"}`}>{city.state_name}</span></span><ArrowRight size={18} />
          </button>)}
        </div>

        {error && selectedCity === null && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </section>

      {/* Listings */}
      {selectedCity !== null && (
        <section className="bg-neutral-50 px-5 pb-12 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent-700">
                  Available vehicles
                </p>
                <h2 className="text-3xl font-semibold">
                  Used cars in {selectedCityName}
                </h2>
                <p className="mt-2 text-gray-500">
                  Explore vehicles listed by dealerships in your city.
                </p>
              </div>

              <button
                onClick={goHome}
                className="text-sm font-semibold text-accent-700 hover:underline"
              >
                Change city
              </button>
            </div>

            <div className="browse-layout">
            <details className="filter-panel" open><summary className="filter-summary">Filters & search</summary>
            <form
              onSubmit={handleSemanticSearch}
              className="grid gap-4 p-5"
            >
              <label className="text-xs font-semibold text-neutral-600" htmlFor="semantic-query">
                Describe the car you want
              </label>
              <input
                id="semantic-query"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                minLength={3}
                maxLength={500}
                placeholder="e.g. small automatic car under 8 lakh"
                className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent-500"
              />
              <label className="text-xs font-semibold text-neutral-600" htmlFor="semantic-max-price">
                Maximum asking price in rupees
              </label>
              <input
                id="semantic-max-price"
                type="number"
                min="1"
                step="10000"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max budget (₹)"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-accent-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-800 disabled:cursor-wait disabled:opacity-70"
              >
                <Search size={17} />
                {searching ? "Searching..." : "Search cars"}
              </button>
              <label className="text-sm font-semibold text-slate-700">Fuel
                <select value={fuelType} onChange={event => setFuelType(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal">
                  <option value="">All fuel types</option>{["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid"].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">Transmission
                <select value={transmission} onChange={event => setTransmission(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal">
                  <option value="">All transmissions</option>{["Manual", "Automatic", "AMT", "CVT", "DCT", "Single-speed"].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">Sort
                <select value={sort} onChange={event => setSort(event.target.value)} disabled={Boolean(searchQuery.trim())} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal disabled:opacity-60">
                  <option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="distance_asc">Distance driven: low to high</option><option value="fuel_economy_desc">Fuel economy: high to low (kmpl)</option>
                </select>
                {searchQuery.trim() && <span className="mt-1 block text-xs font-normal">Descriptions use relevance, or fuel economy / distance order when requested in your search.</span>}
              </label>
              {searchError && (
                <p className="text-sm text-red-700 ">{searchError}</p>
              )}
              {searchResults !== null && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setFilters({ ...filters, query: "" }); }}
                  className="text-left text-sm font-semibold text-accent-700 hover:underline "
                >
                  Clear description and browse filtered listings
                </button>
              )}
            </form></details>
            <div className="min-w-0">

            {error && <p role="alert" className="mb-5 text-red-700">{error}</p>}
            {searchResults !== null && rankingNote && <p className="mb-4 rounded-lg bg-accent-50 p-3 text-sm text-gray-600">{rankingNote}</p>}
            {searching || loadingListings ? (
              <p className="py-16 text-center text-gray-500">
                {searching
                  ? "Finding vehicles that match your description..."
                  : `Finding cars in ${selectedCityName}...`}
              </p>
            ) : (searchResults ?? listings).length === 0 ? (
              <p className="rounded-xl bg-gray-50 py-16 text-center text-gray-500">
                {searchResults !== null
                  ? "No semantic matches found. Try a different description or budget."
                  : "No active listings found in this city."}
              </p>
            ) : (
              <>
                <p className="mb-6 text-sm text-gray-500">
                  {searchResults !== null
                    ? `${searchResults.length} semantic matches`
                    : `${listings.length} vehicles on page ${page}`}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(searchResults ?? listings).map((car) => {
                    const primaryImage =
                      car.images?.find((image) => image.is_primary) ??
                      car.images?.[0];

                    return (
                      <article
                        key={car.listing_id}
                        className="overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-slate-400 hover:shadow-md"
                      >
                        <div className="relative h-44 bg-gray-100">
                          {primaryImage ? (
                            <Image
                              width={800}
                              height={450}
                              unoptimized={primaryImage.image_url.startsWith("data:")}
                              src={primaryImage.image_url}
                              alt={`${car.manufacturer_name} ${car.model_name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <CarFront size={65} />
                            </div>
                          )}

                          <span className="absolute left-3 top-3 rounded-md border border-white/80 bg-neutral-950 px-3 py-1.5 text-xs font-semibold capitalize text-white shadow-md">
                            {car.condition.replaceAll("_", " ")}
                          </span>

                          <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase text-gray-700 shadow">
                            {car.source_type === "demo"
                              ? "Demo listing"
                              : car.source_type === "dealer"
                                ? "Dealer listing"
                                : "External reference"}
                          </span>

                          <span className="absolute bottom-3 left-3 rounded-lg bg-white px-3 py-2 text-xl font-semibold text-neutral-950 shadow-sm">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Asking price
                            </span>
                            {formatPrice(car.asking_price)}
                          </span>
                        </div>

                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {car.manufacturer_name}
                          </p>

                          <h3 className="mt-1 text-xl font-semibold">
                            {car.model_name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {car.variant_name}
                          </p>

                          {car.estimated_price && (
                            <div className="mt-4 rounded-xl bg-accent-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">
                                Indicative market estimate
                              </p>
                              <p className="mt-1 font-semibold text-gray-900">
                                {formatPrice(car.estimated_price)}
                              </p>
                              {car.lower_price && car.upper_price && (
                                <p className="mt-1 text-xs text-gray-600">
                                  Typical range: {formatPrice(car.lower_price)} –{" "}
                                  {formatPrice(car.upper_price)}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                Estimate only; not a confirmed sale price.
                              </p>
                            </div>
                          )}

                          <div className="my-5 grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm text-gray-600">
                            <div className="col-span-2"><FuelEconomy reference={car.fuel_economy} electric={car.fuel_type === "Electric"} /></div>
                            <div className="flex items-center gap-2">
                              <Gauge size={17} className="text-accent-600" />
                              <span><span className="block text-xs text-gray-500">Distance driven</span>{car.kms_driven.toLocaleString("en-IN")} km</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Fuel size={17} className="text-accent-600" />
                              {car.fuel_type}
                            </div>

                            <div className="flex items-center gap-2">
                              <Settings2 size={17} className="text-accent-600" />
                              {car.transmission}
                            </div>

                            <div className="flex items-center gap-2">
                              <CarFront size={17} className="text-accent-600" />
                              {car.manufacturing_year}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-gray-600">
                              {car.dealership_name}
                            </span>
                            <span className="shrink-0 text-gray-400">
                              {car.city_name}
                            </span>
                          </div>

                          <p className="mt-3 text-xs text-gray-400">
                            {car.ownership_count} owner(s) · {car.source_type}
                          </p>

                          <Link
                            href={`/listings/${car.listing_id}`}
                            className="mt-4 inline-flex items-center gap-2 font-semibold text-accent-700 hover:text-accent-900"
                          >
                            View vehicle details
                            <ArrowRight size={17} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            {!loadingListings && !searching && (page > 1 || hasMore) && <nav aria-label="Listing pages" className="mt-8 flex items-center justify-center gap-5">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-40">Previous</button>
              <span>Page {page}</span>
              <button disabled={!hasMore} onClick={() => setPage(page + 1)} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-40">Next</button>
            </nav>}
            </div></div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="about" className="bg-neutral-950 px-6 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-semibold">
              AutoHub<span className="text-accent-400">IQ</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              An intelligent used-car marketplace and dealership analytics platform.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            © 2026 AutoHubIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
