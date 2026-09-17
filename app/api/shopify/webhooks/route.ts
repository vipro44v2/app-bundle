import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const secret = process.env.SHOPIFY_API_SECRET ?? "";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const valid =
    hmac.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
  if (!valid)
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  return NextResponse.json({ received: true });
}
