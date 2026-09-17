const API_VERSION = "2026-07";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAdminToken() {
  if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN)
    return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000)
    return cachedToken.value;
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!shop || !clientId || !clientSecret)
    throw new Error("Shopify credentials are not configured");
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `Unable to obtain Shopify access token: ${response.status}`,
    );
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 86_399) * 1000,
  };
  return cachedToken.value;
}

export type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function shopifyAdmin<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<ShopifyGraphqlResponse<T>> {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  if (!shop) throw new Error("Shopify shop domain is not configured");
  const token = await getAdminToken();
  const response = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(`Shopify Admin API error: ${response.status}`);
  return response.json() as Promise<ShopifyGraphqlResponse<T>>;
}
