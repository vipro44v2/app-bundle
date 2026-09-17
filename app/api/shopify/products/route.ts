import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getShopifyProducts } from "@/lib/shopify/products";

export async function GET(request: NextRequest) {
  try {
    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") ?? 50,
    );
    return NextResponse.json(
      await getShopifyProducts({
        cursor: request.nextUrl.searchParams.get("cursor"),
        query: request.nextUrl.searchParams.get("query") ?? undefined,
        limit: Number.isFinite(requestedLimit) ? requestedLimit : 50,
      }),
    );
  } catch (error) {
    return apiError(error, "Unable to load products");
  }
}
