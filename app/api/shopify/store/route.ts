import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";
export async function GET(request: NextRequest) {
  try {
    const { shop } = requireAdmin(request);
    const response = await shopifyAdmin<{
      shop: { name: string; currencyCode: string };
    }>("query StoreIdentity { shop { name currencyCode } }");
    return NextResponse.json(
      { ...response.data!.shop, domain: shop },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
