import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import { clearSessionCookie } from "../auth";

export const logout = withDatabaseContext(async function logout() {

  const response = reply({ success: true });
  await clearSessionCookie();
  return response;
});
