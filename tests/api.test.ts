import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import * as bundles from "../app/api/bundles/route";
import * as bundle from "../app/api/bundles/[id]/route";
import * as products from "../app/api/shopify/products/route";
import * as dashboard from "../app/api/dashboard/route";
import * as store from "../app/api/shopify/store/route";
import * as webhook from "../app/api/shopify/webhooks/route";
import { createHmac } from "node:crypto";
test("every admin API rejects unauthenticated callers before accessing Shopify", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error("Unexpected upstream call");
  };
  try {
    const context = {
      params: Promise.resolve({ id: "gid://shopify/Metaobject/1" }),
    };
    for (const [handler, method] of [
      [bundles.GET, "GET"],
      [bundles.POST, "POST"],
      [products.GET, "GET"],
      [dashboard.GET, "GET"],
      [store.GET, "GET"],
    ] as const) {
      const response = await handler(
        new NextRequest("http://localhost/api/test", { method }),
      );
      assert.equal(response.status, 401);
    }
    for (const [handler, method] of [
      [bundle.GET, "GET"],
      [bundle.PATCH, "PATCH"],
      [bundle.DELETE, "DELETE"],
    ] as const)
      assert.equal(
        (
          await handler(
            new NextRequest("http://localhost/api/test", { method }),
            context,
          )
        ).status,
        401,
      );
    assert.equal(calls, 0);
  } finally {
    global.fetch = original;
  }
});
test("privacy webhooks are signed, shop-bound and idempotent", async () => {
  process.env.SHOPIFY_API_SECRET = "test-secret";
  process.env.SHOPIFY_SHOP_DOMAIN = "test-shop.myshopify.com";
  const body = '{"shop_id":1}';
  const hmac = createHmac("sha256", "test-secret")
    .update(body)
    .digest("base64");
  for (const topic of [
    "app/uninstalled",
    "customers/data_request",
    "customers/redact",
    "shop/redact",
  ]) {
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await webhook.POST(
            new NextRequest("http://localhost/api/shopify/webhooks", {
              method: "POST",
              body,
              headers: {
                "x-shopify-hmac-sha256": hmac,
                "x-shopify-shop-domain": "test-shop.myshopify.com",
                "x-shopify-topic": topic,
              },
            }),
          )
        ).status,
        200,
      );
  }
  assert.equal(
    (
      await webhook.POST(
        new NextRequest("http://localhost/api/shopify/webhooks", {
          method: "POST",
          body,
          headers: { "x-shopify-hmac-sha256": "invalid" },
        }),
      )
    ).status,
    401,
  );
});
