import {
  BUNDLE_TYPE,
  assertNoUserErrors,
  bundleFields,
  ensureBundleDefinition,
  parseBundle,
} from "@/lib/bundles";
import { shopifyAdmin } from "@/lib/shopify";
import type { BundleInput, BundleRecord } from "@/types/bundle";

type MetaobjectNode = Parameters<typeof parseBundle>[0];

export async function getBundles(): Promise<BundleRecord[]> {
  await ensureBundleDefinition();
  const response = await shopifyAdmin<{
    metaobjects?: { nodes: MetaobjectNode[] };
  }>(
    `query Bundles($type: String!) { metaobjects(type: $type, first: 100, sortKey: "updated_at", reverse: true) { nodes { id handle updatedAt fields { key value } } } }`,
    { type: BUNDLE_TYPE },
  );
  if (!response.data?.metaobjects)
    throw new Error(
      response.errors?.map((error) => error.message).join(", ") ||
        "Unable to load Shopify bundles",
    );
  return response.data.metaobjects.nodes.map(parseBundle);
}

export async function getBundleById(id: string): Promise<BundleRecord | null> {
  const response = await shopifyAdmin<{ metaobject?: MetaobjectNode | null }>(
    `query Bundle($id: ID!) { metaobject(id: $id) { id handle updatedAt fields { key value } } }`,
    { id },
  );
  return response.data?.metaobject
    ? parseBundle(response.data.metaobject)
    : null;
}

export async function createBundle(input: BundleInput): Promise<BundleRecord> {
  await ensureBundleDefinition();
  const response = await shopifyAdmin<{
    metaobjectCreate?: {
      metaobject?: MetaobjectNode;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    `mutation CreateBundle($metaobject: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $metaobject) { metaobject { id handle updatedAt fields { key value } } userErrors { field message code } } }`,
    { metaobject: { type: BUNDLE_TYPE, fields: bundleFields(input, true) } },
  );
  assertNoUserErrors(response.data?.metaobjectCreate?.userErrors);
  const node = response.data?.metaobjectCreate?.metaobject;
  if (!node) throw new Error("Shopify did not create the bundle");
  return parseBundle(node);
}

export async function updateBundle(
  id: string,
  input: BundleInput,
): Promise<BundleRecord> {
  const response = await shopifyAdmin<{
    metaobjectUpdate?: {
      metaobject?: MetaobjectNode;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    `mutation UpdateBundle($id: ID!, $metaobject: MetaobjectUpdateInput!) { metaobjectUpdate(id: $id, metaobject: $metaobject) { metaobject { id handle updatedAt fields { key value } } userErrors { field message code } } }`,
    { id, metaobject: { fields: bundleFields(input) } },
  );
  assertNoUserErrors(response.data?.metaobjectUpdate?.userErrors);
  const node = response.data?.metaobjectUpdate?.metaobject;
  if (!node) throw new Error("Shopify did not update the bundle");
  return parseBundle(node);
}

export async function deleteBundle(id: string): Promise<string | null> {
  const response = await shopifyAdmin<{
    metaobjectDelete?: {
      deletedId?: string;
      userErrors?: Array<{ message: string }>;
    };
  }>(
    `mutation DeleteBundle($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message code } } }`,
    { id },
  );
  assertNoUserErrors(response.data?.metaobjectDelete?.userErrors);
  return response.data?.metaobjectDelete?.deletedId ?? null;
}
