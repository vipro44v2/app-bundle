import {
  BUNDLE_TYPE,
  assertNoUserErrors,
  bundleFields,
  ensureBundleDefinition,
  parseBundle,
} from "@/lib/bundles";
import { shopifyAdmin } from "@/lib/shopify";
import { getProductsByIds } from "@/lib/shopify/products";
import { validateBundleId, ValidationError } from "@/lib/bundle/validation";
import { AppError } from "@/lib/errors";
import type { BundleInput, BundleRecord } from "@/types/bundle";
type MetaobjectNode = Parameters<typeof parseBundle>[0] & { type: string };
const nodeFields = "id type handle updatedAt fields { key value }";
export async function getBundles(): Promise<BundleRecord[]> {
  const bundles: BundleRecord[] = [];
  let cursor: string | null = null;
  do {
    const response: Awaited<
      ReturnType<
        typeof shopifyAdmin<{
          metaobjects: {
            nodes: MetaobjectNode[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        }>
      >
    > = await shopifyAdmin(
      'query Bundles($type: String!, $after: String) { metaobjects(type: $type, first: 100, after: $after, sortKey: "updated_at", reverse: true) { nodes { ' +
        nodeFields +
        " } pageInfo { hasNextPage endCursor } } }",
      { type: BUNDLE_TYPE, after: cursor },
    );
    const page = response.data!.metaobjects;
    bundles.push(...page.nodes.map(parseBundle));
    const next = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    if (next === cursor && next)
      throw new AppError("Invalid bundle pagination", 502);
    cursor = next;
    if (bundles.length > 10000)
      throw new AppError("Too many bundles to load. Contact support.", 422);
  } while (cursor);
  return bundles;
}
export async function getBundleById(id: string): Promise<BundleRecord | null> {
  id = validateBundleId(id);
  const response = await shopifyAdmin<{
    metaobject: MetaobjectNode | null;
    metaobjectDefinitionByType: { type: string } | null;
  }>(
    "query Bundle($id: ID!, $type: String!) { metaobjectDefinitionByType(type: $type) { type } metaobject(id: $id) { " +
      nodeFields +
      " } }",
    { id, type: BUNDLE_TYPE },
  );
  const node = response.data!.metaobject;
  // Shopify expands $app to app--<id> in returned type names.
  if (!node || node.type !== response.data!.metaobjectDefinitionByType?.type)
    return null;
  return parseBundle(node);
}
async function validateProducts(input: BundleInput) {
  const products = await getProductsByIds(input.productIds);
  if (products.length !== input.productIds.length)
    throw new ValidationError("Some selected products were deleted", {
      productIds: "Remove missing products and try again",
    });
  if (
    input.status === "Active" &&
    products.some((product) => !product.available)
  )
    throw new ValidationError("Some products are unavailable", {
      productIds:
        "Select active products with available variants, or save as draft",
    });
}
export async function createBundle(input: BundleInput): Promise<BundleRecord> {
  await validateProducts(input);
  await ensureBundleDefinition();
  const response = await shopifyAdmin<{
    metaobjectCreate: {
      metaobject?: MetaobjectNode;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    "mutation CreateBundle($metaobject: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $metaobject) { metaobject { " +
      nodeFields +
      " } userErrors { field message code } } }",
    { metaobject: { type: BUNDLE_TYPE, fields: bundleFields(input, true) } },
  );
  assertNoUserErrors(response.data!.metaobjectCreate.userErrors);
  const node = response.data!.metaobjectCreate.metaobject;
  if (!node) throw new AppError("Shopify did not create the bundle", 502);
  return parseBundle(node);
}
export async function updateBundle(
  id: string,
  input: BundleInput,
): Promise<BundleRecord> {
  id = validateBundleId(id);
  if (!(await getBundleById(id)))
    throw new AppError("Bundle not found", 404, "NOT_FOUND");
  await validateProducts(input);
  await ensureBundleDefinition();
  const response = await shopifyAdmin<{
    metaobjectUpdate: {
      metaobject?: MetaobjectNode;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    "mutation UpdateBundle($id: ID!, $metaobject: MetaobjectUpdateInput!) { metaobjectUpdate(id: $id, metaobject: $metaobject) { metaobject { " +
      nodeFields +
      " } userErrors { field message code } } }",
    { id, metaobject: { fields: bundleFields(input) } },
  );
  assertNoUserErrors(response.data!.metaobjectUpdate.userErrors);
  const node = response.data!.metaobjectUpdate.metaobject;
  if (!node) throw new AppError("Shopify did not update the bundle", 502);
  return parseBundle(node);
}
export async function deleteBundle(id: string): Promise<string> {
  id = validateBundleId(id);
  if (!(await getBundleById(id)))
    throw new AppError("Bundle not found", 404, "NOT_FOUND");
  const response = await shopifyAdmin<{
    metaobjectDelete: {
      deletedId?: string;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    "mutation DeleteBundle($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message code } } }",
    { id },
  );
  assertNoUserErrors(response.data!.metaobjectDelete.userErrors);
  const deleted = response.data!.metaobjectDelete.deletedId;
  if (!deleted) throw new AppError("Shopify did not delete the bundle", 502);
  return deleted;
}
