import { configuredShop } from "@/lib/auth";
import { AppError } from "@/lib/errors";
const API_VERSION = "2026-07";
let cachedToken: {
  shop: string;
  clientId: string;
  value: string;
  expiresAt: number;
} | null = null;
let pendingToken: Promise<string> | null = null;
export function clearAdminToken() {
  cachedToken = null;
  pendingToken = null;
}
async function getAdminToken() {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN)
    return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const shop = configuredShop();
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret)
    throw new AppError(
      "Shopify connection is not configured",
      503,
      "NOT_CONFIGURED",
    );
  if (
    cachedToken?.shop === shop &&
    cachedToken.clientId === clientId &&
    cachedToken.expiresAt > Date.now() + 60_000
  )
    return cachedToken.value;
  if (!pendingToken)
    pendingToken = (async () => {
      const response = await fetch(
        "https://" + shop + "/admin/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok)
        throw new AppError(
          "Unable to connect to Shopify. Check the app installation.",
          502,
          "SHOPIFY_AUTH",
        );
      const data = await response.json();
      if (
        typeof data.access_token !== "string" ||
        !data.access_token ||
        !Number.isFinite(data.expires_in) ||
        data.expires_in <= 0
      )
        throw new AppError(
          "Invalid Shopify token response",
          502,
          "SHOPIFY_AUTH",
        );
      cachedToken = {
        shop,
        clientId,
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return cachedToken.value;
    })().finally(() => {
      pendingToken = null;
    });
  return pendingToken;
}
export type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};
export async function shopifyAdmin<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<ShopifyGraphqlResponse<T>> {
  const shop = configuredShop();
  const readOnly = /^\s*query\b/.test(query);
  for (let attempt = 0; attempt < (readOnly ? 3 : 1); attempt++) {
    try {
      const response = await fetch(
        "https://" + shop + "/admin/api/" + API_VERSION + "/graphql.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": await getAdminToken(),
          },
          body: JSON.stringify({ query, variables }),
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );
      const retry = readOnly && attempt < 2;
      if (retry && (response.status === 429 || response.status >= 500)) {
        const seconds = Math.min(
          3,
          Math.max(
            0.25,
            Number(response.headers.get("retry-after")) || 0.5 * 2 ** attempt,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        continue;
      }
      if (!response.ok) {
        if (response.status === 401) clearAdminToken();
        console.error("Shopify HTTP error", {
          status: response.status,
          requestId: response.headers.get("x-request-id"),
        });
        throw new AppError(
          "Shopify could not complete the request. Please try again.",
          502,
          "SHOPIFY_HTTP",
        );
      }
      let body: ShopifyGraphqlResponse<T>;
      try {
        body = await response.json();
      } catch {
        throw new AppError(
          "Invalid response from Shopify",
          502,
          "SHOPIFY_RESPONSE",
        );
      }
      if (body?.errors?.length) {
        if (
          retry &&
          body.errors.every((error) => error.extensions?.code === "THROTTLED")
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** attempt),
          );
          continue;
        }
        console.error("Shopify GraphQL error", {
          codes: body.errors.map(
            (error) => error.extensions?.code ?? "UNKNOWN",
          ),
          requestId: response.headers.get("x-request-id"),
        });
        throw new AppError(
          "Shopify rejected the request. Check app permissions and try again.",
          502,
          "SHOPIFY_GRAPHQL",
        );
      }
      if (!body?.data)
        throw new AppError("Shopify returned no data", 502, "SHOPIFY_RESPONSE");
      return body;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (readOnly && attempt < 2) continue;
      console.error("Shopify connection error", {
        type: error instanceof Error ? error.name : "UnknownError",
      });
      throw new AppError(
        "Shopify is temporarily unavailable. Please try again.",
        502,
        "SHOPIFY_UNAVAILABLE",
      );
    }
  }
  throw new AppError("Shopify is busy. Please try again.", 503, "SHOPIFY_BUSY");
}
