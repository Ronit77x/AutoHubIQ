"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkspaceHeader({
  title,
  userName,
}: {
  title: string;
  userName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out");
      router.push("/");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to sign out"
      );
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/" className="text-xl font-extrabold text-slate-900">
            AutoHub<span className="text-blue-700">IQ</span>
          </Link>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm font-medium text-slate-600 sm:inline">
            {userName}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
        {error && (
          <p className="w-full text-right text-sm text-red-700">{error}</p>
        )}
      </div>
    </header>
  );
}
