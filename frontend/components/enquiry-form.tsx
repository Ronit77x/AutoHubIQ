"use client";
import { submitEnquiryAction } from "../app/actions";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function EnquiryForm({ listingId }: { listingId: string }) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestType, setRequestType] = useState("enquiry");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError(""); setNotice(""); setNeedsLogin(false);
    try {
      const response = await submitEnquiryAction(listingId, Object.fromEntries(values));
      const data = response.data;
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(data.message ?? "Unable to submit enquiry");
      setNotice(data.message); form.reset(); setRequestType("enquiry");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to submit enquiry"); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal";
  return <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
    <h2 className="text-xl font-semibold">Contact the dealer</h2>
    <Link href="/offers" className="mt-2 inline-block text-sm font-semibold text-accent-700 hover:underline">View or edit my offers</Link>
    <p className="mt-2 text-sm text-slate-500">Your account name, email and message will be shared with this dealer. A test drive is a request; the dealer must confirm it.</p>
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">Request type<select name="request_type" value={requestType} onChange={event => setRequestType(event.target.value)} className={input}><option value="enquiry">Vehicle enquiry</option><option value="test_drive">Request a test drive</option><option value="offer">Make an offer</option></select></label>
      {requestType === "offer" && <label className="space-y-2 text-sm font-semibold">Offer amount (₹)<input name="offer_amount" type="number" min="0.01" max="9999999999.99" step="0.01" required className={input} /><span className="block text-xs font-normal text-slate-500">For customer accounts. The dealer will contact you; this does not reserve the car.</span></label>}
      <label className="space-y-2 text-sm font-semibold">Phone (optional)<input name="phone" type="tel" maxLength={20} className={input} /></label>
      <label className="space-y-2 text-sm font-semibold sm:col-span-2">Message<textarea name="message" required minLength={10} maxLength={2000} rows={3} className={input} placeholder="Ask about the vehicle or suggest a day for a test drive." /></label>
      <button disabled={busy} className="rounded-lg bg-accent-700 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Submitting..." : "Submit request"}</button>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error} {needsLogin && <Link href="/account" className="underline">Sign in or register</Link>}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800 sm:col-span-2">{notice}</p>}
    </form>
  </section>;
}
