import { NextRequest, NextResponse } from "next/server";
import { configuredShop } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { apiError } from "@/lib/api-response";
export function GET(request: NextRequest) {
  try {
    const shop = configuredShop();
    const requested = request.nextUrl.searchParams.get("shop");
    if (requested && requested.toLowerCase() !== shop)
      throw new AppError(
        "This app is configured for a different store",
        403,
        "SHOP_MISMATCH",
      );
    const clientId = process.env.SHOPIFY_API_KEY;
    if (!clientId)
      throw new AppError(
        "Shopify connection is not configured",
        503,
        "NOT_CONFIGURED",
      );
    return NextResponse.redirect(
      "https://admin.shopify.com/store/" +
        shop.replace(".myshopify.com", "") +
        "/apps/" +
        encodeURIComponent(clientId),
    );
  } catch (error) {
    return apiError(error);
  }
}
