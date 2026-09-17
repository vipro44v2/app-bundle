import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getShopifyProducts } from "@/lib/shopify/products";
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json(
      await getShopifyProducts({
        cursor: request.nextUrl.searchParams.get("cursor"),
        query: request.nextUrl.searchParams.get("query") ?? undefined,
        limit: Number(request.nextUrl.searchParams.get("limit") ?? 50),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, "Unable to load products");
  }
}
