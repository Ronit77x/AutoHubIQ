"use client";
import { loginAction, registerAction } from "../actions";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

interface City {
  city_id: number;
  city_name: string;
  state_name: string;
}

export default function AccountPage({ initialCities }: { initialCities: City[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [accountType, setAccountType] = useState<"customer" | "dealer">(
    "customer"
  );
  const cities = initialCities;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const restore = () => setMode(new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login");
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const isRegister = mode === "register";
    const payload: Record<string, unknown> = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    if (isRegister) {
      payload.full_name = formData.get("full_name");
      payload.phone = formData.get("phone");
      payload.account_type = accountType;
      if (accountType === "dealer") {
        payload.dealership_name = formData.get("dealership_name");
        payload.city_id = Number(formData.get("city_id"));
        payload.street_address = formData.get("street_address");
      }
    }

    try {
      const response = await (isRegister ? registerAction(payload) : loginAction(payload));
      const data = response.data;
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Unable to continue");
      }

      if (data.user.user_role === "admin") {
        router.push("/admin");
      } else if (data.user.user_role === "dealer") {
        router.push("/dealer");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to continue"
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent-600 focus:ring-2 focus:ring-accent-100";

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="font-semibold text-accent-700 hover:underline">
          ← Back to AutoHubIQ
        </Link>
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">
            AutoHubIQ account
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to manage your marketplace account or register as a
            dealership.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setShowPassword(false);
                  window.history.pushState({}, "", "/account?mode="+value);
                  setError("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                  mode === value
                    ? "bg-accent-700 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {value === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 p-1">
              {(["customer", "dealer"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAccountType(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                    accountType === value
                      ? "bg-accent-700 text-white"
                      : "text-slate-600"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {mode === "login" && <p className="mt-3 text-xs leading-5 text-slate-500">Choose what brings you here. Your saved account role determines your workspace; administrators also use this sign-in form.</p>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <label className="block space-y-2 text-sm font-semibold">
                  Full name
                  <input
                    className={inputClass}
                    name="full_name"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                  />
                </label>
                <label className="block space-y-2 text-sm font-semibold">
                  Phone (optional)
                  <input
                    className={inputClass}
                    name="phone"
                    maxLength={20}
                    autoComplete="tel"
                  />
                </label>
              </>
            )}

            <label className="block space-y-2 text-sm font-semibold">
              Email
              <input
                className={inputClass}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Password
              <span className="relative block">
              <input
                className={`${inputClass} pr-12`}
                name="password"
                id="account-password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
              />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword} aria-controls="account-password"
                onClick={() => setShowPassword(value => !value)}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 focus-visible:outline-2 focus-visible:outline-accent-700">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              </span>
              {mode === "register" && (
                <span className="block text-xs font-normal text-slate-500">
                  Use at least 12 characters.
                </span>
              )}
            </label>

            {mode === "register" && accountType === "dealer" && (
              <>
                <label className="block space-y-2 text-sm font-semibold">
                  Dealership name
                  <input
                    className={inputClass}
                    name="dealership_name"
                    required
                    minLength={2}
                    maxLength={150}
                    autoComplete="organization"
                  />
                </label>
                <label className="block space-y-2 text-sm font-semibold">
                  City
                  <select
                    className={inputClass}
                    name="city_id"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a city
                    </option>
                    {cities.map((city) => (
                      <option key={city.city_id} value={city.city_id}>
                        {city.city_name}, {city.state_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 text-sm font-semibold">
                  Business address
                  <textarea
                    className={inputClass}
                    name="street_address"
                    required
                    minLength={5}
                    rows={3}
                    autoComplete="street-address"
                  />
                </label>
                <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  New dealerships start in pending review. You can sign in and
                  prepare your profile, but publishing inventory requires
                  administrator verification.
                </p>
              </>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent-700 px-5 py-3 font-semibold text-white transition hover:bg-accent-800 disabled:cursor-wait disabled:opacity-60"
            >
              {busy
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Account passwords are stored as salted, one-way hashes. AutoHubIQ
            staff will never ask you to share your password.
          </p>
        </section>
      </div>
    </main>
  );
}
