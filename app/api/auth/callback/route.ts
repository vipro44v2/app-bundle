import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function validHmac(params: URLSearchParams, secret: string) {
  const received = params.get("hmac") ?? "";
  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const digest = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");
  return (
    received.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(digest))
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shop = params.get("shop") ?? "";
  const state = params.get("state") ?? "";
  const savedState = request.cookies.get("shopify_oauth_state")?.value ?? "";
  const clientId = process.env.SHOPIFY_API_KEY ?? "";
  const secret = process.env.SHOPIFY_API_SECRET ?? "";

  if (!state || state !== savedState || !validHmac(params, secret)) {
    return NextResponse.json(
      { error: "Invalid OAuth callback" },
      { status: 401 },
    );
  }

  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: secret,
        code: params.get("code"),
      }),
    },
  );
  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: "Unable to complete Shopify installation" },
      { status: 502 },
    );
  }

  const handle = shop.replace(".myshopify.com", "");
  const response = NextResponse.redirect(
    `https://admin.shopify.com/store/${handle}/apps/${clientId}`,
  );
  response.cookies.delete("shopify_oauth_state");
  return response;
}
