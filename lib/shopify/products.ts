import { shopifyAdmin } from "@/lib/shopify";
import { ValidationError, PRODUCT_GID } from "@/lib/bundle/validation";
import { AppError } from "@/lib/errors";
import type {
  CatalogProduct,
  CatalogVariant,
  ProductPage,
} from "@/types/product";
type ProductNode = {
  id: string;
  title: string;
  vendor: string;
  status: string;
  totalInventory: number;
  featuredImage?: { url: string } | null;
  variantsCount?: { count: number };
  variants: {
    nodes: CatalogVariant[];
    pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  };
};
// Keep the nested connection small: 100 products × 100 variants exceeds
// Shopify's maximum query cost, even when the actual catalog is small.
const fields =
  "id title vendor status totalInventory featuredImage { url } variantsCount { count } variants(first: 5) { nodes { id title price inventoryQuantity availableForSale } pageInfo { hasNextPage endCursor } }";
export function productOptions({
  cursor,
  query,
  limit = 50,
}: { cursor?: string | null; query?: string; limit?: number } = {}) {
  if (!Number.isFinite(limit) || !Number.isInteger(limit))
    throw new ValidationError("Product limit must be an integer");
  if (cursor && (cursor.length > 1024 || !/^[A-Za-z0-9+/_=-]+$/.test(cursor)))
    throw new ValidationError("Invalid product cursor");
  if (query && (query.length > 200 || /[\u0000-\u001f\u007f]/.test(query)))
    throw new ValidationError(
      "Search must be at most 200 characters without control characters",
    );
  // Merchant search is plain text, not an arbitrary Shopify query expression.
  const search = query
    ?.trim()
    .replace(/[\\":*()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    first: Math.min(100, Math.max(1, limit)),
    after: cursor || null,
    query: search ? 'title:"' + search + '*"' : null,
  };
}
function mapProduct(product: ProductNode): CatalogProduct {
  const variants = product.variants.nodes;
  const available = variants.find((variant) => variant.availableForSale);
  return {
    id: product.id,
    name: product.title,
    vendor: product.vendor,
    price: Number((available ?? variants[0])?.price ?? 0),
    stock: Math.max(0, product.totalInventory ?? 0),
    available: product.status === "ACTIVE" && !!available,
    image: product.featuredImage?.url ?? null,
    variants,
    variantCount: product.variantsCount?.count,
    variantsTruncated: product.variants.pageInfo.hasNextPage,
  };
}
async function resolveProducts(
  nodes: ProductNode[],
): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];
  for (const node of nodes) {
    const product = mapProduct(node);
    let page = node.variants.pageInfo;
    // Do not call a product sold out just because its first five variants are.
    while (node.status === "ACTIVE" && !product.available && page.hasNextPage) {
      if (!page.endCursor)
        throw new AppError("Invalid variant pagination", 502);
      const response = await shopifyAdmin<{
        product: { variants: ProductNode["variants"] } | null;
      }>(
        "query AvailableVariant($id: ID!, $after: String!) { product(id: $id) { variants(first: 100, after: $after) { nodes { id title price inventoryQuantity availableForSale } pageInfo { hasNextPage endCursor } } } }",
        { id: node.id, after: page.endCursor },
      );
      const connection = response.data!.product?.variants;
      if (!connection) break;
      const available = connection.nodes.find(
        (variant) => variant.availableForSale,
      );
      if (available) {
        product.available = true;
        product.price = Number(available.price);
        product.variants!.push(available);
      }
      if (
        connection.pageInfo.hasNextPage &&
        connection.pageInfo.endCursor === page.endCursor
      )
        throw new AppError("Invalid variant pagination", 502);
      page = connection.pageInfo;
    }
    products.push(product);
  }
  return products;
}
export async function getShopifyProducts(
  options: { cursor?: string | null; query?: string; limit?: number } = {},
): Promise<ProductPage> {
  const response = await shopifyAdmin<{
    shop: { currencyCode: string };
    products: {
      nodes: ProductNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    "query Products($first: Int!, $after: String, $query: String) { shop { currencyCode } products(first: $first, after: $after, query: $query) { nodes { " +
      fields +
      " } pageInfo { hasNextPage endCursor } } }",
    productOptions(options),
  );
  const { shop, products } = response.data!;
  return {
    products: await resolveProducts(products.nodes),
    nextCursor: products.pageInfo.hasNextPage
      ? products.pageInfo.endCursor
      : null,
    currency: shop.currencyCode,
  };
}
export async function getProductsByIds(
  ids: string[],
): Promise<CatalogProduct[]> {
  if (!ids.length) return [];
  if (ids.length > 50 || ids.some((id) => !PRODUCT_GID.test(id)))
    throw new ValidationError("Invalid product IDs");
  const response = await shopifyAdmin<{ nodes: (ProductNode | null)[] }>(
    "query SelectedProducts($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { " +
      fields +
      " } } }",
    { ids },
  );
  return resolveProducts(
    response.data!.nodes.filter((node): node is ProductNode => !!node?.id),
  );
}
