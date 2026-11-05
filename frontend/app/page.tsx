
"use client";

import { useEffect, useState } from "react";
import {
  CarFront,
  MapPin,
  Search,
  Gauge,
  Fuel,
  Settings2,
  ArrowRight,
  ShieldCheck,
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
  description: string;
  manufacturing_year: number;
  kms_driven: number;
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
}

export default function Home() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCities() {
      try {
        const response = await fetch("/api/cities");
        const data = await response.json();

        if (!data.success) throw new Error("Could not load cities");

        setCities(data.cities);
      } catch {
        setError("Unable to load cities. Please refresh the page.");
      } finally {
        setLoadingCities(false);
      }
    }

    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity === null) {
      setListings([]);
      return;
    }

    async function fetchListings() {
      setLoadingListings(true);
      setError("");

      try {
        const response = await fetch(
          `/api/listings?city_id=${selectedCity}`
        );

        const data = await response.json();

        if (!data.success) throw new Error("Could not load listings");

        setListings(data.listings);
      } catch {
        setError("Unable to load listings. Please try again.");
        setListings([]);
      } finally {
        setLoadingListings(false);
      }
    }

    fetchListings();
  }, [selectedCity]);

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const selectedCityName =
    cities.find((city) => city.city_id === selectedCity)?.city_name;

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-700 p-2 text-white">
              <CarFront size={25} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              AutoHub<span className="text-blue-700">IQ</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#cities" className="hover:text-blue-700">
              Explore Cars
            </a>
            <a href="#about" className="hover:text-blue-700">
              About Us
            </a>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <ShieldCheck size={17} />
            Smarter Car Search
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#101d36] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200">
              <CarFront size={17} />
              Your next car starts here
            </p>

            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Find the right car.
              <span className="text-blue-400"> Make the smart move.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Explore used cars, compare prices and discover vehicles
              from dealerships across India.
            </p>

            <a
              href="#cities"
              className="mt-9 inline-flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white transition hover:bg-blue-500"
            >
              Explore Listings
              <ArrowRight size={19} />
            </a>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-5 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10">
              <CarFront
                className="mx-auto text-blue-300"
                size={190}
                strokeWidth={1}
              />
              <div className="mt-6 text-center">
                <p className="text-2xl font-bold">AutoHubIQ</p>
                <p className="mt-2 text-sm text-slate-300">
                  A smarter used-car marketplace
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* City Selection */}
      <section id="cities" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-700">
            Explore by location
          </p>

          <h2 className="text-3xl font-extrabold md:text-4xl">
            Where are you looking for a car?
          </h2>

          <p className="mt-3 text-gray-500">
            Choose your city to explore available used-car listings.
          </p>
        </div>

        {loadingCities ? (
          <p className="py-10 text-center text-gray-500">
            Loading cities...
          </p>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-3">
            {cities.map((city) => (
              <button
                key={city.city_id}
                onClick={() => setSelectedCity(city.city_id)}
                className={`rounded-2xl border p-7 text-left transition hover:-translate-y-1 hover:shadow-lg ${
                  selectedCity === city.city_id
                    ? "border-blue-600 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <MapPin
                  className="mb-5 text-blue-700"
                  size={28}
                />

                <h3 className="text-xl font-bold">{city.city_name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {city.state_name}
                </p>

                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-blue-700">
                  Explore cars
                  <ArrowRight size={18} />
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-6 text-center text-red-600">{error}</p>
        )}
      </section>

      {/* Listings */}
      {selectedCity !== null && (
        <section className="border-t border-gray-200 bg-white px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-700">
                  Available vehicles
                </p>
                <h2 className="text-3xl font-extrabold">
                  Used cars in {selectedCityName}
                </h2>
                <p className="mt-2 text-gray-500">
                  Explore vehicles listed by dealerships in your city.
                </p>
              </div>

              <button
                onClick={() => setSelectedCity(null)}
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Change city
              </button>
            </div>

            {loadingListings ? (
              <p className="py-16 text-center text-gray-500">
                Finding cars in {selectedCityName}...
              </p>
            ) : listings.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 py-16 text-center text-gray-500">
                No active listings found in this city.
              </p>
            ) : (
              <>
                <p className="mb-6 text-sm text-gray-500">
                  {listings.length} vehicles available
                </p>

                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((car) => {
                    const primaryImage =
                      car.images?.find((image) => image.is_primary) ??
                      car.images?.[0];

                    return (
                      <article
                        key={car.listing_id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="relative h-52 bg-gray-100">
                          {primaryImage ? (
                            <img
                              src={primaryImage.image_url}
                              alt={`${car.manufacturer_name} ${car.model_name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <CarFront size={65} />
                            </div>
                          )}

                          <span className="absolute left-4 top-4 rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white">
                            {car.condition}
                          </span>

                          <span className="absolute bottom-4 right-4 rounded-lg bg-white px-3 py-2 text-lg font-extrabold text-blue-700 shadow">
                            {formatPrice(car.asking_price)}
                          </span>
                        </div>

                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {car.manufacturer_name}
                          </p>

                          <h3 className="mt-1 text-xl font-bold">
                            {car.model_name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {car.variant_name}
                          </p>

                          <div className="my-5 grid grid-cols-2 gap-4 border-y border-gray-100 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Gauge size={17} className="text-blue-600" />
                              {car.kms_driven.toLocaleString("en-IN")} km
                            </div>

                            <div className="flex items-center gap-2">
                              <Fuel size={17} className="text-blue-600" />
                              {car.fuel_type}
                            </div>

                            <div className="flex items-center gap-2">
                              <Settings2 size={17} className="text-blue-600" />
                              {car.transmission}
                            </div>

                            <div className="flex items-center gap-2">
                              <CarFront size={17} className="text-blue-600" />
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
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="about" className="bg-[#101d36] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-extrabold">
              AutoHub<span className="text-blue-400">IQ</span>
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
