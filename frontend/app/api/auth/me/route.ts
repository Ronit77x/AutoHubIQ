import { connection, NextRequest, NextResponse } from "next/server";
import {
  AuthConfigurationError,
  getAuthenticatedUser,
} from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 }
      );
    }

    console.error("Current user API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load account" },
      { status: 500 }
    );
  }
}
