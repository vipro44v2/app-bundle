import { NextRequest, NextResponse } from "next/server";

const SHOP_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop")?.toLowerCase() ?? "";
  if (!SHOP_PATTERN.test(shop)) {
    return NextResponse.json(
      { error: "Invalid Shopify shop domain" },
      { status: 400 },
    );
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  if (!clientId)
    return NextResponse.json(
      { error: "Shopify API key is missing" },
      { status: 500 },
    );

  const handle = shop.replace(".myshopify.com", "");
  const installUrl = new URL(
    `https://admin.shopify.com/store/${handle}/oauth/install`,
  );
  installUrl.searchParams.set("client_id", clientId);
  return NextResponse.redirect(installUrl);
}
