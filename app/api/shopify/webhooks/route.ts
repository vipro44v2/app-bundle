import { NextRequest, NextResponse } from "next/server";
import { configuredShop, verifyWebhook } from "@/lib/auth";
import { clearAdminToken } from "@/lib/shopify";
import { apiError } from "@/lib/api-response";
export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  const rawBody = await request.text();
  if (
    !verifyWebhook(
      rawBody,
      request.headers.get("x-shopify-hmac-sha256") ?? "",
      secret,
    )
  )
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  try {
    if (request.headers.get("x-shopify-shop-domain") !== configuredShop())
      return NextResponse.json({ error: "Unknown shop" }, { status: 403 });
    JSON.parse(rawBody);
    const topic = request.headers.get("x-shopify-topic");
    if (topic === "app/uninstalled" || topic === "shop/redact")
      clearAdminToken();
    // No customer/order data is persisted. Privacy notifications are idempotent no-ops.
    if (
      ![
        "app/uninstalled",
        "customers/data_request",
        "customers/redact",
        "shop/redact",
      ].includes(topic ?? "")
    )
      return NextResponse.json(
        { error: "Unsupported webhook topic" },
        { status: 400 },
      );
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
