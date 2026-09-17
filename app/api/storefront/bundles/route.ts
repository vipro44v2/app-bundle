import { NextRequest, NextResponse } from "next/server";
import { configuredShop } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { getBundles } from "@/lib/shopify/bundles";
import { shopifyAdmin } from "@/lib/shopify";
import { isScheduledActive, parseBundleInput } from "@/lib/bundle/validation";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
export async function GET(request: NextRequest) {
  try {
    const shop = configuredShop();
    const requestedShop = request.nextUrl.searchParams.get("shop");
    if (requestedShop !== shop)
      return NextResponse.json(
        { error: "Unknown storefront" },
        { status: 403, headers: cors },
      );
    const productId = request.nextUrl.searchParams.get("product");
    if (!productId || !/^\d+$/.test(productId))
      return NextResponse.json(
        { error: "A product ID is required" },
        { status: 400, headers: cors },
      );
    const bundles = (await getBundles())
      .filter(
        (bundle) =>
          bundle.status === "Active" &&
          bundle.productIds.includes("gid://shopify/Product/" + productId) &&
          isScheduledActive(bundle.configuration?.settings),
      )
      .filter((bundle) => {
        try {
          parseBundleInput({ ...bundle, bundleType: bundle.type });
          return true;
        } catch {
          console.warn("Invalid storefront bundle skipped", { id: bundle.id });
          return false;
        }
      });
    const ids = [...new Set(bundles.flatMap((bundle) => bundle.productIds))];
    type Product = {
      id: string;
      title: string;
      handle: string;
      status: string;
      onlineStoreUrl: string | null;
    };
    const products = new Map<string, Product>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const response = await shopifyAdmin<{ nodes: (Product | null)[] }>(
        "query WidgetProducts($ids:[ID!]!) { nodes(ids:$ids) { ... on Product { id title handle status onlineStoreUrl } } }",
        { ids: ids.slice(offset, offset + 100) },
      );
      for (const product of response.data!.nodes)
        if (
          product?.id &&
          product.status === "ACTIVE" &&
          product.onlineStoreUrl
        )
          products.set(product.id, product);
    }
    return NextResponse.json(
      {
        bundles: bundles
          .filter((bundle) => bundle.productIds.every((id) => products.has(id)))
          .map((bundle) => ({
            id: bundle.id,
            name: bundle.name,
            type: bundle.type,
            discount: bundle.discount,
            configuration: bundle.configuration,
            products: bundle.productIds.map((id) => ({
              id,
              handle: products.get(id)!.handle,
              title: products.get(id)!.title,
            })),
          })),
      },
      {
        headers: {
          ...cors,
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
        },
      },
    );
  } catch (error) {
    const response = apiError(error, "Bundles are temporarily unavailable");
    Object.entries(cors).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  }
}
