import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

export const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export function configuredShop() {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN?.trim().toLowerCase();
  if (!shop || !SHOP_DOMAIN.test(shop))
    throw new AppError(
      "Shopify connection is not configured",
      503,
      "NOT_CONFIGURED",
    );
  return shop;
}
export function verifySessionToken(
  token: string,
  now = Math.floor(Date.now() / 1000),
) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId)
    throw new AppError(
      "Shopify connection is not configured",
      503,
      "NOT_CONFIGURED",
    );
  const shop = configuredShop();
  const invalid = () =>
    new AppError(
      "Open this app from your Shopify admin to continue",
      401,
      "UNAUTHORIZED",
    );
  try {
    if (token.length > 8192) throw invalid();
    const parts = token.split(".");
    if (
      parts.length !== 3 ||
      parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
    )
      throw invalid();
    const [header, payload, signature] = parts;
    const decodedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString(),
    );
    if (decodedHeader.alg !== "HS256") throw invalid();
    const expected = createHmac("sha256", secret)
      .update(header + "." + payload)
      .digest();
    const received = Buffer.from(signature, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw invalid();
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      claims.aud !== clientId ||
      claims.dest !== "https://" + shop ||
      claims.iss !== "https://" + shop + "/admin" ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= now ||
      !Number.isFinite(claims.nbf) ||
      claims.nbf > now ||
      !Number.isFinite(claims.iat) ||
      claims.iat > now + 5 ||
      typeof claims.sub !== "string" ||
      !claims.sub
    )
      throw invalid();
    return { shop, userId: claims.sub as string };
  } catch {
    throw invalid();
  }
}
export function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new AppError(
      "Open this app from your Shopify admin to continue",
      401,
      "UNAUTHORIZED",
    );
  return verifySessionToken(authorization.slice(7));
}
export function verifyWebhook(body: string, signature: string, secret: string) {
  if (!secret || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest();
  const received = Buffer.from(signature, "base64");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
