import { NextResponse } from "next/server";
import { BUNDLE_TYPE, parseBundle } from "@/lib/bundles";
import { shopifyAdmin } from "@/lib/shopify";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET() {
  try {
    const bundleResponse = (await shopifyAdmin(
      `query StorefrontBundles($type: String!) { shop { currencyCode } metaobjects(type: $type, first: 50) { nodes { id handle updatedAt fields { key value } } } }`,
      { type: BUNDLE_TYPE },
    )) as {
      data?: {
        shop: { currencyCode: string };
        metaobjects: { nodes: Parameters<typeof parseBundle>[0][] };
      };
    };
    if (!bundleResponse.data) throw new Error("Unable to load bundles");
    const bundles = bundleResponse.data.metaobjects.nodes
      .map(parseBundle)
      .filter((bundle) => bundle.status === "Active");
    const ids = [...new Set(bundles.flatMap((bundle) => bundle.productIds))];
    const productResponse = ids.length
      ? ((await shopifyAdmin(
          `query BundleProducts($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { id title handle featuredImage { url altText } options { name values } variants(first: 50) { nodes { id title price availableForSale selectedOptions { name value } } } } } }`,
          { ids },
        )) as {
          data?: {
            nodes: Array<null | {
              id: string;
              title: string;
              handle: string;
              featuredImage?: { url: string; altText?: string } | null;
              options: Array<{ name: string; values: string[] }>;
              variants: {
                nodes: Array<{
                  id: string;
                  title: string;
                  price: string;
                  availableForSale: boolean;
                  selectedOptions: Array<{ name: string; value: string }>;
                }>;
              };
            }>;
          };
        })
      : { data: { nodes: [] } };
    const products = new Map(
      (productResponse.data?.nodes ?? [])
        .filter(Boolean)
        .map((product) => [product!.id, product!]),
    );
    return NextResponse.json(
      {
        currency: bundleResponse.data.shop.currencyCode,
        bundles: bundles.map((bundle) => ({
          ...bundle,
          products: bundle.productIds
            .map((id) => products.get(id))
            .filter(Boolean)
            .map((product) => {
              const selectedVariant =
                product!.variants.nodes.find(
                  (variant) => variant.availableForSale,
                ) ?? product!.variants.nodes[0];
              return {
                id: product!.id,
                title: product!.title,
                handle: product!.handle,
                image: product!.featuredImage?.url ?? null,
                options: product!.options,
                variants: product!.variants.nodes.map((variant) => ({
                  id: variant.id.split("/").pop(),
                  title: variant.title,
                  price: Number(variant.price),
                  available: variant.availableForSale,
                  selectedOptions: variant.selectedOptions,
                })),
                variantId: selectedVariant?.id.split("/").pop(),
                price: Number(selectedVariant?.price ?? 0),
                available: selectedVariant?.availableForSale ?? false,
              };
            }),
        })),
      },
      {
        headers: {
          ...cors,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: cors },
    );
  }
}
