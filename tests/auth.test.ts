import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { requireAdmin, verifySessionToken, verifyWebhook } from "../lib/auth";
import { AppError } from "../lib/errors";
process.env.SHOPIFY_API_KEY = "test-client";
process.env.SHOPIFY_API_SECRET = "test-secret";
process.env.SHOPIFY_SHOP_DOMAIN = "test-shop.myshopify.com";
function token(patch: Record<string, unknown> = {}, algorithm = "HS256") {
  const header = Buffer.from(JSON.stringify({ alg: algorithm })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      aud: "test-client",
      dest: "https://test-shop.myshopify.com",
      iss: "https://test-shop.myshopify.com/admin",
      exp: 200,
      nbf: 90,
      iat: 90,
      sub: "42",
      ...patch,
    }),
  ).toString("base64url");
  return (
    header +
    "." +
    payload +
    "." +
    createHmac("sha256", "test-secret")
      .update(header + "." + payload)
      .digest("base64url")
  );
}
test("session accepts a signed token for the configured shop", () =>
  assert.equal(verifySessionToken(token(), 100).userId, "42"));
test("session rejects missing, expired, malformed and wrong-store credentials", () => {
  assert.throws(
    () => requireAdmin(new Request("http://localhost/api/bundles")),
    (error) => error instanceof AppError && error.status === 401,
  );
  for (const value of [
    "not-a-token",
    token({ exp: 99 }),
    token({ nbf: 101 }),
    token({ aud: "other" }),
    token({ dest: "https://evil.myshopify.com" }),
    token({ iss: "https://evil.myshopify.com/admin" }),
    token({}, "none"),
    token() + ".extra",
    token().slice(0, -8) + "aaaaaaaa",
  ])
    assert.throws(() => verifySessionToken(value, 100));
});
test("webhook HMAC handles raw body, missing secret and malformed values", () => {
  const body = '{"id":1}',
    secret = "test-webhook-secret";
  const hmac = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(verifyWebhook(body, hmac, secret), true);
  for (const signature of ["", "é".repeat(44), "x".repeat(44), hmac.slice(1)])
    assert.equal(verifyWebhook(body, signature, secret), false);
  assert.equal(verifyWebhook(body + " ", hmac, secret), false);
  assert.equal(verifyWebhook(body, hmac, ""), false);
});
