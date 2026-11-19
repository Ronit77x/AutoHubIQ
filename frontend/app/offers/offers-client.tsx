"use client";
import { updateOfferAction } from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Offer {
  enquiry_id: string; listing_id: string; offer_amount: string; message: string;
  phone: string | null; created_at: string; updated_at: string | null;
  contacted_at: string | null; editable: boolean; listing_status: string;
  dealership_name: string; manufacturer_name: string; model_name: string; manufacturing_year: number;
}

export default function OffersPage({ initial }: { initial: { offers: Offer[]; error: string; needsLogin: boolean } }) {
  const router = useRouter();
  const offers = initial.offers;
  const loading = false;
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState("");
  const needsLogin = initial.needsLogin;
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>, offerId: string) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await updateOfferAction(offerId, body);
      const data = response.data;
      if (!response.ok) throw new Error(data.message ?? "Unable to save offer");
      setEditing(null);
      router.refresh();
      setNotice("Offer updated. The dealer will see your revised details.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save offer"); }
    finally { setBusy(false); }
  }
  const input = "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal";
  return <main className="min-h-screen bg-neutral-50 px-5 py-10 text-slate-900"><div className="mx-auto max-w-3xl">
    <Link href="/" className="font-semibold text-accent-700 hover:underline">← Back to AutoHubIQ</Link>
    <h1 className="mt-6 text-3xl font-semibold">My offers</h1>
    <p className="mt-2 text-sm text-slate-500">Edit your offers until the dealer marks you as contacted. Calls and emails happen outside the app; their status is recorded by the dealer. Unavailable listings cannot be edited.</p>
    {error && <p role="alert" className="mt-5 text-sm text-red-700">{error} {needsLogin && <Link href="/account" className="underline">Sign in or register</Link>}</p>}
    {notice && <p role="status" className="mt-5 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p className="mt-6">Loading offers...</p> : !error && offers.length === 0 ? <p className="mt-6 text-slate-500">You haven’t made any offers yet. Open a vehicle listing to make an offer.</p> : null}
    <div className="mt-6 space-y-5">{offers.map(offer => <article key={offer.enquiry_id} className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{offer.manufacturing_year} {offer.manufacturer_name} {offer.model_name}</h2>
      <p className="mt-1 text-sm text-slate-500">{offer.dealership_name} · {new Date(offer.created_at).toLocaleDateString("en-IN")}</p>
      <p className="mt-3 text-sm font-semibold">{offer.contacted_at ? "Dealer marked contacted" : offer.editable ? "Awaiting dealer contact" : "Listing unavailable"}</p>
      {offer.updated_at && <p className="mt-1 text-xs text-slate-500">Edited {new Date(offer.updated_at).toLocaleString("en-IN")}</p>}
      {editing === offer.enquiry_id ? <form onSubmit={event => save(event, offer.enquiry_id)} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">Offer amount (₹)<input className={input} name="offer_amount" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={offer.offer_amount} /></label>
        <label className="block text-sm font-semibold">Message<textarea className={input} name="message" required minLength={10} maxLength={2000} rows={3} defaultValue={offer.message} /></label>
        <label className="block text-sm font-semibold">Phone (optional)<input className={input} name="phone" type="tel" maxLength={20} defaultValue={offer.phone ?? ""} /></label>
        <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save changes"}</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button></div>
      </form> : <>
        <p className="mt-3 font-semibold">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(offer.offer_amount))}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{offer.message}</p>
        {offer.phone && <p className="mt-2 text-sm">{offer.phone}</p>}
        {offer.editable && <button onClick={() => { setEditing(offer.enquiry_id); setError(""); setNotice(""); }} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Edit offer</button>}
      </>}
      {offer.listing_status === "active" && <Link className="mt-4 block text-sm font-semibold text-accent-700 hover:underline" href={`/listings/${offer.listing_id}`}>View vehicle</Link>}
    </article>)}</div>
  </div></main>;
}
