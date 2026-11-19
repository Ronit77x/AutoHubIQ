import "server-only";
import { redirect } from "next/navigation";
import { getAccount } from "./account";

export async function requirePageRole(role: "dealer" | "admin") {
  const response = await getAccount();
  if (!response.ok) throw new Error(response.data.message ?? "Unable to load your account");
  const user = response.data.user;
  if (!user) redirect("/account");
  if (user.user_role !== role) redirect(user.user_role === "admin" ? "/admin" : user.user_role === "dealer" ? "/dealer" : "/");
  return user;
}

export function readData<T extends { ok: boolean; data: { message?: string } }>(response: T): T["data"] {
  if (!response.ok) throw new Error(response.data.message ?? "Unable to load data");
  return response.data;
}
