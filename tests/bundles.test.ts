import assert from "node:assert/strict";
import test from "node:test";
import {
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
} from "../lib/shopify/bundles";
import { parseBundle, bundleFields } from "../lib/bundles";
import { AppError } from "../lib/errors";
process.env.SHOPIFY_SHOP_DOMAIN = "test-shop.myshopify.com";
process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "test-token";
const input = {
  name: "Test bundle",
  bundleType: "Fixed bundle" as const,
  productIds: ["gid://shopify/Product/1"],
  discount: 15,
  status: "Draft" as const,
};
const node = {
  id: "gid://shopify/Metaobject/1",
  type: "app--123--bundleflow_bundle",
  handle: "bundle",
  updatedAt: "2026-09-17T00:00:00Z",
  fields: bundleFields(input, true),
};
function response(data: unknown) {
  return Response.json({ data });
}
test("CRUD persists fields and refuses other-app metaobjects", async () => {
  const original = global.fetch;
  const operations: string[] = [];
  global.fetch = async (_url, options) => {
    const { query, variables } = JSON.parse(options?.body as string);
    operations.push(query);
    if (query.startsWith("query Bundle("))
      return response({
        metaobject: node,
        metaobjectDefinitionByType: { type: node.type },
      });
    if (query.startsWith("query SelectedProducts"))
      return response({
        nodes: [
          {
            id: input.productIds[0],
            title: "Product",
            vendor: "Store",
            status: "ACTIVE",
            totalInventory: 10,
            variants: {
              nodes: [
                {
                  id: "gid://shopify/ProductVariant/1",
                  title: "Default",
                  price: "10",
                  availableForSale: true,
                },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        ],
      });
    if (query.startsWith("query BundleDefinition"))
      return response({
        metaobjectDefinitionByType: {
          id: "gid://shopify/MetaobjectDefinition/1",
          fieldDefinitions: [{ key: "configuration" }],
        },
      });
    if (query.startsWith("mutation CreateBundle")) {
      assert.equal(
        variables.metaobject.fields.find(
          (f: { key: string }) => f.key === "name",
        ).value,
        input.name,
      );
      return response({
        metaobjectCreate: { metaobject: node, userErrors: [] },
      });
    }
    if (query.startsWith("mutation UpdateBundle"))
      return response({
        metaobjectUpdate: { metaobject: node, userErrors: [] },
      });
    if (query.startsWith("mutation DeleteBundle"))
      return response({
        metaobjectDelete: { deletedId: node.id, userErrors: [] },
      });
    throw new Error("Unexpected operation");
  };
  try {
    assert.equal((await createBundle(input)).id, node.id);
    assert.equal((await updateBundle(node.id, input)).id, node.id);
    assert.equal(await deleteBundle(node.id), node.id);
    const before = operations.length;
    global.fetch = async () =>
      response({
        metaobject: { ...node, type: "app--999--bundleflow_bundle" },
        metaobjectDefinitionByType: { type: node.type },
      });
    assert.equal(await getBundleById(node.id), null);
    await assert.rejects(
      deleteBundle(node.id),
      (error) => error instanceof AppError && error.status === 404,
    );
    assert.equal(operations.length, before);
  } finally {
    global.fetch = original;
  }
});
test("malformed saved data is reported instead of silently becoming an empty bundle", () => {
  assert.throws(
    () =>
      parseBundle({
        ...node,
        fields: [
          ...node.fields.filter((field) => field.key !== "product_ids"),
          { key: "product_ids", value: "null" },
        ],
      }),
    (error) => error instanceof AppError && error.code === "CORRUPT_BUNDLE",
  );
});
test("omitting configuration clears old persisted configuration explicitly", () => {
  assert.equal(
    bundleFields(input).find((field) => field.key === "configuration")?.value,
    '{"bars":[]}',
  );
});
test("deleted products prevent creation", async () => {
  const original = global.fetch;
  global.fetch = async (_url, options) => {
    const { query } = JSON.parse(options?.body as string);
    if (query.startsWith("query SelectedProducts"))
      return response({ nodes: [] });
    return response({});
  };
  try {
    await assert.rejects(createBundle(input), /deleted/);
  } finally {
    global.fetch = original;
  }
});

test("saved bundles reject valid JSON with malformed nested data", () => {
  for (const [key, value] of [
    ["configuration", "null"],
    ["configuration", '{"bars":[],"settings":"invalid"}'],
    ["configuration", '{"bars":[{}]}'],
    ["discount", "-1"],
    ["discount", ""],
    ["product_ids", '["not-a-gid"]'],
    ["name", "   "],
  ]) {
    assert.throws(
      () =>
        parseBundle({
          ...node,
          fields: [
            ...node.fields.filter((field) => field.key !== key),
            { key, value },
          ],
        }),
      (error) => error instanceof AppError && error.code === "CORRUPT_BUNDLE",
    );
  }
});

test("mutation userErrors are surfaced without returning a successful bundle", async () => {
  const original = global.fetch;
  global.fetch = async (_url, options) => {
    const { query } = JSON.parse(options?.body as string);
    if (query.startsWith("query Bundle("))
      return response({
        metaobject: node,
        metaobjectDefinitionByType: { type: node.type },
      });
    return response({
      metaobjectDelete: {
        deletedId: null,
        userErrors: [{ message: "Cannot delete this bundle" }],
      },
    });
  };
  try {
    await assert.rejects(
      deleteBundle(node.id),
      (error) =>
        error instanceof AppError && error.code === "SHOPIFY_USER_ERROR",
    );
  } finally {
    global.fetch = original;
  }
});
