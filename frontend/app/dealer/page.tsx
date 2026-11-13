"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import WorkspaceHeader from "../../components/workspace-header";

interface DealerProfile {
  dealership_name: string;
  city_name: string;
  state_name: string;
  verification_status: "pending" | "verified" | "rejected";
  active_listing_count: number;
  active_asking_price_total: string;
  active_average_asking_price: string | null;
}

interface DealerListing {
  listing_id: string;
  asking_price: string;
  description: string;
  listing_status: string;
  manufacturing_year: number;
  kms_driven: number;
  colour: string | null;
  condition: string;
  variant_name: string;
  model_name: string;
  manufacturer_name: string;
  image_url: string;
}

interface Variant {
  variant_id: number;
  variant_name: string;
  fuel_type: string;
  transmission: string;
  model_name: string;
  body_type: string;
  manufacturer_name: string;
}

interface Account {
  full_name: string;
  user_role: string;
}

const formatPrice = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function DealerPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [listings, setListings] = useState<DealerListing[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWorkspace = useCallback(async () => {
    const accountResponse = await fetch("/api/auth/me");
    const accountData = await accountResponse.json();
    if (!accountData.user) {
      router.replace("/account");
      return;
    }
    if (accountData.user.user_role !== "dealer") {
      router.replace(accountData.user.user_role === "admin" ? "/admin" : "/");
      return;
    }
    setAccount(accountData.user);

    const [dashboardResponse, catalogResponse] = await Promise.all([
      fetch("/api/dealer/dashboard"),
      fetch("/api/dealer/catalog"),
    ]);
    const [dashboardData, catalogData] = await Promise.all([
      dashboardResponse.json(),
      catalogResponse.json(),
    ]);
    if (!dashboardResponse.ok || !dashboardData.success) {
      throw new Error(dashboardData.message ?? "Unable to load dealer inventory");
    }
    if (!catalogResponse.ok || !catalogData.success) {
      throw new Error(catalogData.message ?? "Unable to load the vehicle catalogue");
    }
    setProfile(dashboardData.profile);
    setListings(dashboardData.listings);
    setVariants(catalogData.variants);
  }, [router]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await loadWorkspace();
      } catch (failure) {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load dealer workspace"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    const formData = new FormData(form);
    const payload = {
      variant_id: Number(formData.get("variant_id")),
      manufacturing_year: Number(formData.get("manufacturing_year")),
      registration_year: formData.get("registration_year")
        ? Number(formData.get("registration_year"))
        : null,
      kms_driven: Number(formData.get("kms_driven")),
      colour: formData.get("colour"),
      ownership_count: Number(formData.get("ownership_count")),
      condition: formData.get("condition"),
      asking_price: Number(formData.get("asking_price")),
      description: formData.get("description"),
    };
    try {
      const response = await fetch("/api/dealer/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Unable to publish listing");
      }
      form.reset();
      setNotice("Vehicle published and added to your inventory.");
      await loadWorkspace();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to publish listing"
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateListing(
    listingId: string,
    changes: Record<string, unknown>
  ) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/dealer/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Unable to update listing");
      }
      setNotice("Listing updated.");
      await loadWorkspace();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to update listing"
      );
    }
  }

  async function updatePrice(
    event: FormEvent<HTMLFormElement>,
    listingId: string
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateListing(listingId, {
      asking_price: Number(form.get("asking_price")),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600";

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">
        Loading dealer workspace...
      </main>
    );
  }

  if (!account) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">
        {error || "Redirecting to sign in..."}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <WorkspaceHeader title="Dealer inventory" userName={account.full_name} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Dealer workspace
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">
              {profile?.dealership_name}
            </h1>
            <p className="mt-2 text-slate-500">
              {profile?.city_name}, {profile?.state_name}
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
            View marketplace
          </Link>
        </div>

        {profile?.verification_status !== "verified" && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="font-bold">
              Dealership verification: {profile?.verification_status}
            </h2>
            <p className="mt-1 text-sm leading-6">
              {profile?.verification_status === "pending"
                ? "An administrator must verify your dealership before you can publish new listings."
                : "Your dealership application was rejected. Contact an administrator if you believe this is an error."}
            </p>
          </section>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ["Active listings", String(profile?.active_listing_count ?? 0)],
            [
              "Active asking total",
              formatPrice(profile?.active_asking_price_total ?? 0),
            ],
            [
              "Average asking price",
              profile?.active_average_asking_price
                ? formatPrice(profile.active_average_asking_price)
                : "—",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        {(error || notice) && (
          <p
            role={error ? "alert" : "status"}
            className={`mt-5 rounded-xl p-3 text-sm ${
              error
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </p>
        )}

        {profile?.verification_status === "verified" && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-extrabold">Publish a vehicle</h2>
            <p className="mt-1 text-sm text-slate-500">
              New listings are published immediately and become available to
              marketplace and semantic search.
            </p>
            <form
              onSubmit={createListing}
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <label className="space-y-2 text-sm font-semibold">
                Vehicle variant
                <select
                  className={inputClass}
                  name="variant_id"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select variant
                  </option>
                  {variants.map((variant) => (
                    <option key={variant.variant_id} value={variant.variant_id}>
                      {variant.manufacturer_name} {variant.model_name}{" "}
                      {variant.variant_name} · {variant.fuel_type},{" "}
                      {variant.transmission}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Manufacturing year
                <input
                  className={inputClass}
                  name="manufacturing_year"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Registration year (optional)
                <input
                  className={inputClass}
                  name="registration_year"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Kilometres driven
                <input
                  className={inputClass}
                  name="kms_driven"
                  type="number"
                  min="0"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Asking price (₹)
                <input
                  className={inputClass}
                  name="asking_price"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Colour (optional)
                <input className={inputClass} name="colour" maxLength={40} />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Owner count
                <select
                  className={inputClass}
                  name="ownership_count"
                  defaultValue="1"
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Condition
                <select
                  className={inputClass}
                  name="condition"
                  defaultValue="good"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_repair">Needs repair</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold sm:col-span-2 lg:col-span-3">
                Description
                <textarea
                  className={inputClass}
                  name="description"
                  minLength={20}
                  maxLength={5000}
                  rows={4}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 sm:col-span-2 lg:col-span-3"
              >
                {busy ? "Publishing..." : "Publish listing"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Your inventory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update asking prices or listing availability.
              </p>
            </div>
            <span className="text-sm text-slate-500">
              {listings.length} vehicle(s)
            </span>
          </div>

          {listings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Your inventory is empty.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {listings.map((listing) => (
                <article
                  key={listing.listing_id}
                  className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-[180px_1fr]"
                >
                  <div className="h-44 bg-slate-100 sm:h-full">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url}
                        alt={`${listing.manufacturer_name} ${listing.model_name}`}
                        className="h-full w-full object-cover"
                        width={640}
                        height={360}
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full min-h-32 place-items-center text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {listing.manufacturer_name}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">
                      {listing.model_name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {listing.variant_name} · {listing.manufacturing_year} ·{" "}
                      {listing.kms_driven.toLocaleString("en-IN")} km
                    </p>
                    <p className="mt-2 text-sm font-semibold capitalize text-slate-700">
                      {listing.listing_status.replace("_", " ")} ·{" "}
                      {listing.condition.replace("_", " ")}
                    </p>
                    <form
                      onSubmit={(event) =>
                        updatePrice(event, listing.listing_id)
                      }
                      className="mt-4 flex gap-2"
                    >
                      <label className="sr-only" htmlFor={`price-${listing.listing_id}`}>
                        Asking price
                      </label>
                      <input
                        id={`price-${listing.listing_id}`}
                        name="asking_price"
                        type="number"
                        min="1"
                        step="0.01"
                        defaultValue={listing.asking_price}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Save price
                      </button>
                    </form>
                    <label className="mt-3 flex items-center gap-3 text-sm font-medium">
                      Status
                      <select
                        value={listing.listing_status}
                        onChange={(event) =>
                          updateListing(listing.listing_id, {
                            listing_status: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {[
                          "active",
                          "reserved",
                          "sold",
                          "withdrawn",
                          "draft",
                        ].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="font-bold text-blue-800">
                        {formatPrice(listing.asking_price)}
                      </span>
                      <Link
                        href={`/listings/${listing.listing_id}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        View listing
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
