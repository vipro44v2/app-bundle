import { NextResponse } from "next/server";
// Single-store client-credentials architecture: no authorization-code exchange.
export function GET() {
  return NextResponse.json(
    {
      error:
        "This single-store app uses Shopify Admin authentication. Open it from your installed apps.",
      code: "OAUTH_NOT_SUPPORTED",
    },
    { status: 410 },
  );
}
