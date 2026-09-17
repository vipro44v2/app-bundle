import { shopifyAdmin } from "@/lib/shopify";
import type { CatalogProduct, ProductPage } from "@/types/product";

type ProductVariantNode = {
  price: string;
  inventoryQuantity: number | null;
  availableForSale: boolean;
};
type ProductNode = {
  id: string;
  title: string;
  vendor: string;
  status: string;
  featuredImage?: { url: string } | null;
  variants?: { nodes?: ProductVariantNode[] };
};

function thumbnailUrl(url: string | null | undefined) {
  if (!url) return null;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}width=96&height=96&crop=center`;
}

export async function getShopifyProducts({
  cursor,
  query,
  limit = 50,
}: {
  cursor?: string | null;
  query?: string;
  limit?: number;
} = {}): Promise<ProductPage> {
  const pageSize = Math.min(50, Math.max(1, Math.floor(limit)));
  const response = await shopifyAdmin<{
    products?: {
      nodes: ProductNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query Products($first: Int!, $after: String, $query: String) { products(first: $first, after: $after, query: $query) { nodes { id title vendor status featuredImage { url altText } variants(first: 20) { nodes { price inventoryQuantity availableForSale } } } pageInfo { hasNextPage endCursor } } }`,
    { first: pageSize, after: cursor ?? null, query: query?.trim() || null },
  );
  const connection = response.data?.products;
  if (!connection)
    throw new Error(
      response.errors?.map((error) => error.message).join(", ") ||
        "Invalid Shopify product response",
    );
  const products: CatalogProduct[] = connection.nodes.map((product) => {
    const variants = product.variants?.nodes ?? [];
    return {
      id: product.id,
      name: product.title,
      vendor: product.vendor || "Shopify",
      price: Number(variants[0]?.price ?? 0),
      stock: variants.reduce(
        (total, variant) => total + Math.max(0, variant.inventoryQuantity ?? 0),
        0,
      ),
      available:
        product.status === "ACTIVE" &&
        variants.some((variant) => variant.availableForSale),
      image: thumbnailUrl(product.featuredImage?.url),
    };
  });
  return {
    products,
    nextCursor: connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null,
  };
}
