import { withDatabaseContext } from "../../../../lib/db";
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, isSameOrigin } from "../../../../lib/auth";

export const POST = withDatabaseContext(async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin requests are not allowed" },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
});
