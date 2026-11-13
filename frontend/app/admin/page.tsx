"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import WorkspaceHeader from "../../components/workspace-header";

interface DealerApplication {
  dealer_id: string;
  dealership_name: string;
  street_address: string;
  business_phone: string | null;
  business_email: string | null;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
  owner_name: string;
  owner_email: string;
  account_status: string;
  city_name: string;
  state_name: string;
  active_listing_count: number;
}

interface Account {
  full_name: string;
  user_role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [dealers, setDealers] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyDealer, setBusyDealer] = useState("");

  const loadDealers = useCallback(async () => {
    const accountResponse = await fetch("/api/auth/me");
    const accountData = await accountResponse.json();
    if (!accountData.user) {
      router.replace("/account");
      return;
    }
    if (accountData.user.user_role !== "admin") {
      router.replace(accountData.user.user_role === "dealer" ? "/dealer" : "/");
      return;
    }
    setAccount(accountData.user);

    const response = await fetch("/api/admin/dealers");
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message ?? "Unable to load dealer applications");
    }
    setDealers(data.dealers);
  }, [router]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await loadDealers();
      } catch (failure) {
        if (active) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load administration"
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
  }, [loadDealers]);

  async function decide(dealerId: string, verificationStatus: "verified" | "rejected") {
    setBusyDealer(dealerId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/dealers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: dealerId,
          verification_status: verificationStatus,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Unable to update dealer verification");
      }
      setNotice(
        `${data.dealer.dealership_name} marked ${verificationStatus}.`
      );
      await loadDealers();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to update dealer verification"
      );
    } finally {
      setBusyDealer("");
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">
        Loading administration...
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

  const pendingCount = dealers.filter(
    (dealer) => dealer.verification_status === "pending"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <WorkspaceHeader title="Administration" userName={account.full_name} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Administrator workspace
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">
              Dealership verification
            </h1>
            <p className="mt-2 text-slate-500">
              Review dealer applications before they can publish marketplace
              inventory.
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
            View marketplace
          </Link>
        </div>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending applications</p>
          <p className="mt-1 text-3xl font-extrabold">{pendingCount}</p>
        </div>

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

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-extrabold">All dealerships</h2>
          {dealers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No dealer applications are available.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {dealers.map((dealer) => (
                <article
                  key={dealer.dealer_id}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {dealer.dealership_name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {dealer.city_name}, {dealer.state_name}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        dealer.verification_status === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : dealer.verification_status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {dealer.verification_status}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">Owner</dt>
                      <dd className="font-semibold">{dealer.owner_name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Account email</dt>
                      <dd className="break-all font-semibold">
                        {dealer.owner_email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Business email</dt>
                      <dd className="break-all font-semibold">
                        {dealer.business_email || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Business phone</dt>
                      <dd className="font-semibold">
                        {dealer.business_phone || "Not provided"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-400">Address</dt>
                      <dd className="font-semibold">{dealer.street_address}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Account status</dt>
                      <dd className="font-semibold capitalize">
                        {dealer.account_status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Active listings</dt>
                      <dd className="font-semibold">
                        {dealer.active_listing_count}
                      </dd>
                    </div>
                  </dl>

                  {dealer.verification_status !== "verified" && (
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        disabled={busyDealer === dealer.dealer_id}
                        onClick={() => decide(dealer.dealer_id, "verified")}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        Verify dealership
                      </button>
                      {dealer.verification_status !== "rejected" && (
                        <button
                          type="button"
                          disabled={busyDealer === dealer.dealer_id}
                          onClick={() => decide(dealer.dealer_id, "rejected")}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
