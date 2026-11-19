import "server-only";
import { result as reply } from "./result";
import { withDatabaseContext } from "../db";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
} from "../auth";

export const getAccount = withDatabaseContext(async function getAccount() {

  try {
    const user = await getAuthenticatedUser();
    return reply({ success: true, user });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return reply(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Current user error:", error);
    return reply(
      { success: false, message: "Unable to load account" },
      { status: 500 }
    );
  }
});
