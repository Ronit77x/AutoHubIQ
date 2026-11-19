"use client";

import Link from "next/link";
import VehicleGallery from "../../../components/vehicle-gallery";
import EnquiryForm from "../../../components/enquiry-form";
import FuelEconomy from "../../../components/fuel-economy";
import type { FuelEconomyReference } from "../../../lib/fuel-economy";
import { useEffect, useState } from "react";
import { ArrowLeft, CarFront, Fuel, Gauge, MapPin, Settings2 } from "lucide-react";

interface CarImage {
  image_id: number;
  image_url: string;
  is_primary: boolean;
}

interface Listing {
  listing_id: number;
  asking_price: string;
  description: string;
  source_type: string;
  manufacturing_year: number;
  registration_year: number | null;
  kms_driven: number;
  fuel_economy: FuelEconomyReference | null;
  colour: string | null;
  ownership_count: number;
  condition: string;
  variant_name: string;
  fuel_type: string;
  transmission: string;
  engine_displacement_cc: number | null;
  battery_capacity_kwh: string | null;
  seating_capacity: number;
  model_name: string;
  body_type: string;
  manufacturer_name: string;
  dealership_name: string;
  city_name: string;
  images: CarImage[];
  estimated_price: string | null;
  lower_price: string | null;
  upper_price: string | null;
  methodology: string | null;
  source_summary: string | null;
}

export default function ListingDetails({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      try {
        const response = await fetch(`/api/listings/${listingId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message ?? "Could not load this listing");
        }

        setListing(data.listing);
      } catch {
        setError("Unable to load this vehicle. It may no longer be available.");
      } finally {
        setLoading(false);
      }
    }

    fetchListing();
  }, [listingId]);

  const formatPrice = (price: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(price));

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 text-gray-600">
        Loading vehicle details...
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-gray-700">
          {error || "This listing is not available."}
        </p>
        <Link href="/" className="mt-5 inline-flex items-center gap-2 font-semibold text-accent-700">
          <ArrowLeft size={18} />
          Back to listings
        </Link>
      </main>
    );
  }

  const isDemo = listing.source_type === "demo";

  return (
    <main className="min-h-screen bg-neutral-50 text-[#172033]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-accent-700 hover:text-accent-900">
            <ArrowLeft size={18} />
            Back to listings
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {isDemo && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-amber-900">
            Demo listing: vehicle details and images are illustrative and do not represent a verified vehicle.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:items-start">
          <VehicleGallery key={listingId} images={listing.images}
            vehicle={`${listing.manufacturer_name} ${listing.model_name}`} isDemo={isDemo} />

          <section className="rounded-xl border border-neutral-200 bg-white p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold uppercase text-accent-700">
                {listing.condition}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-700">
                {isDemo
                  ? "Demo listing"
                  : listing.source_type === "dealer"
                    ? "Dealer listing"
                    : "External reference"}
              </span>
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {listing.manufacturer_name}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {listing.manufacturer_name} {listing.model_name}
            </h1>
            <p className="mt-2 text-gray-600">{listing.variant_name}</p>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Asking price
              </p>
              <p className="mt-1 text-3xl font-semibold text-accent-700">
                {formatPrice(listing.asking_price)}
              </p>
            </div>

            {listing.estimated_price && (
              <div className="mt-5 rounded-xl bg-accent-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">
                  Indicative market estimate
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatPrice(listing.estimated_price)}
                </p>
                {listing.lower_price && listing.upper_price && (
                  <p className="mt-1 text-sm text-gray-600">
                    Typical range: {formatPrice(listing.lower_price)} –{" "}
                    {formatPrice(listing.upper_price)}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Estimate only; not a confirmed sale price.
                </p>
              </div>
            )}

            <p className="mt-5 flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={17} className="text-accent-600" />
              {listing.dealership_name}, {listing.city_name}
            </p>
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Vehicle specifications</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Specification label="Year" value={String(listing.manufacturing_year)} icon={<CarFront size={18} />} />
            <Specification label="Registration year" value={listing.registration_year ? String(listing.registration_year) : "Not provided"} />
            <Specification label="Distance driven" value={`${listing.kms_driven.toLocaleString("en-IN")} km`} icon={<Gauge size={18} />} />
            <Specification label="Fuel" value={listing.fuel_type} icon={<Fuel size={18} />} />
            <Specification label="Transmission" value={listing.transmission} icon={<Settings2 size={18} />} />
            <Specification label="Body type" value={listing.body_type} />
            <Specification label="Colour" value={listing.colour || "Not provided"} />
            <Specification label="Owners" value={`${listing.ownership_count}`} />
            <Specification
              label="Engine / battery"
              value={
                listing.engine_displacement_cc
                  ? `${listing.engine_displacement_cc.toLocaleString("en-IN")} cc`
                  : listing.battery_capacity_kwh
                    ? `${listing.battery_capacity_kwh} kWh`
                    : "Not provided"
              }
            />
            <Specification label="Seating capacity" value={`${listing.seating_capacity}`} />
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Mileage and efficiency</h2>
          <div className="mt-4"><FuelEconomy reference={listing.fuel_economy} electric={listing.fuel_type === "Electric"} detailed /></div>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-600">
            {listing.description}
          </p>
        </section>

        <EnquiryForm listingId={String(listing.listing_id)} />

        {listing.estimated_price && (listing.methodology || listing.source_summary) && (
          <p className="mt-5 text-xs leading-5 text-gray-500">
            Estimate methodology: {listing.methodology}
            {listing.source_summary ? ` ${listing.source_summary}` : ""}
          </p>
        )}
      </div>
    </main>
  );
}

function Specification({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <span className="mt-0.5 text-accent-600">{icon}</span>}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
