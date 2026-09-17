import assert from "node:assert/strict";
import test from "node:test";
import { shopifyAdmin } from "../lib/shopify";
import { productOptions, getShopifyProducts } from "../lib/shopify/products";
import { AppError } from "../lib/errors";
process.env.SHOPIFY_SHOP_DOMAIN = "test-shop.myshopify.com";
process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "test-token";
test("HTTP 200 GraphQL errors and malformed JSON fail closed", async () => {
  const original = global.fetch;
  try {
    for (const response of [
      new Response(JSON.stringify({ errors: [{ message: "denied" }] })),
      new Response("not json"),
      new Response("{}"),
    ]) {
      global.fetch = async () => response;
      await assert.rejects(
        shopifyAdmin("query Test { shop { name } }"),
        (error) => error instanceof AppError && error.status === 502,
      );
    }
  } finally {
    global.fetch = original;
  }
});

test("catalog bounds nested variant cost and finds available variants on later pages", async () => {
  const original = global.fetch;
  const unavailable = {
    id: "gid://shopify/ProductVariant/1",
    title: "Small",
    price: "10",
    availableForSale: false,
  };
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls++;
    const { query, variables } = JSON.parse(options?.body as string);
    if (query.startsWith("query Products")) {
      assert.match(query, /variants\(first: 5\)/);
      return Response.json({
        data: {
          shop: { currencyCode: "USD" },
          products: {
            nodes: [
              {
                id: "gid://shopify/Product/1",
                title: "Tee",
                vendor: "Store",
                status: "ACTIVE",
                totalInventory: 5,
                variantsCount: { count: 120 },
                variants: {
                  nodes: [unavailable],
                  pageInfo: { hasNextPage: true, endCursor: "c1" },
                },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      });
    }
    assert.equal(variables.after, "c1");
    return Response.json({
      data: {
        product: {
          variants: {
            nodes: [
              {
                ...unavailable,
                id: "gid://shopify/ProductVariant/6",
                availableForSale: true,
                price: "12",
              },
            ],
            pageInfo: { hasNextPage: true, endCursor: "c2" },
          },
        },
      },
    });
  };
  try {
    const { products } = await getShopifyProducts();
    assert.equal(products[0].available, true);
    assert.equal(products[0].price, 12);
    assert.equal(products[0].variantCount, 120);
    assert.equal(calls, 2);
  } finally {
    global.fetch = original;
  }
});
test("mutations are never blindly retried", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response("", { status: 503 });
  };
  try {
    await assert.rejects(shopifyAdmin("mutation Create { create }"));
    assert.equal(calls, 1);
  } finally {
    global.fetch = original;
  }
});
test("transient query failures retry and return data", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () =>
    ++calls === 1
      ? new Response("", { status: 429, headers: { "retry-after": "0.25" } })
      : Response.json({ data: { shop: { name: "Store" } } });
  try {
    const result = await shopifyAdmin<{ shop: { name: string } }>(
      "query Test { shop { name } }",
    );
    assert.equal(result.data!.shop.name, "Store");
    assert.equal(calls, 2);
  } finally {
    global.fetch = original;
  }
});
test("product pagination clamps integers and rejects malformed limits/cursors/search", () => {
  assert.equal(productOptions({ limit: 0 }).first, 1);
  assert.equal(productOptions({ limit: 1000 }).first, 100);
  for (const limit of [NaN, Infinity, 1.5])
    assert.throws(() => productOptions({ limit }));
  assert.throws(() => productOptions({ cursor: "not a cursor" }));
  assert.throws(() => productOptions({ query: "x".repeat(201) }));
  assert.throws(() => productOptions({ query: "bad\u0000search" }));
  assert.equal(
    productOptions({ query: 'shirt" status:active' }).query,
    'title:"shirt status active*"',
  );
});
