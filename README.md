# Thanh Sang Bundle

A Next.js Shopify bundle app with a compact, neutral admin interface and a theme app block. Bundles are stored in app-owned Shopify metaobjects; there is no local customer database.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The standalone app shows a connection prompt; authenticated operations must be opened from Shopify Admin. Tests mock APIs for local UI development; there is no production auth bypass or demo-data fallback.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome, a local server on port 3100 and mocked Shopify responses. Screenshots go to `artifacts/`; failed traces to `test-results/`. No live store is modified by these tests. On Windows, Node and Chrome must be allowed to start child processes.

## Authentication and installation

This version deliberately supports **one configured store per deployment**. It is not a multi-merchant OAuth app.

- Every admin endpoint verifies a Shopify App Bridge session JWT: HS256 signature, audience, issuer, destination, expiry, not-before, issued-at and user ID. The destination must equal `SHOPIFY_SHOP_DOMAIN`.
- Admin API calls use a server-side token for that same app and store. Either supply `SHOPIFY_ADMIN_ACCESS_TOKEN`, or use the client credentials grant. Shopify restricts that grant to apps and stores owned by the same organization: [client credentials documentation](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant).
- `/api/auth` redirects to the configured installed app in Shopify Admin. It does not start an authorization-code flow. The legacy `/api/auth/callback` returns 410; no token is exchanged or discarded.
- Public storefront reads expose only active offers within their schedule whose products are published online. Shop selection is checked against server configuration. This endpoint never creates, changes or deletes bundles.
- Webhooks verify the untouched request body using HMAC and constant-time comparison, then check the shop and topic. Uninstall/redaction clears the local token cache. Privacy requests are idempotent acknowledgements because the app does not persist customer/order data.

Copy `.env.example` to `.env.local` and set:

| Variable                      | Purpose                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SHOPIFY_API_KEY`             | Required installed app client ID; also used for the public App Bridge meta tag.                                                  |
| `SHOPIFY_API_SECRET`          | Required server-only session/webhook signing secret and client credentials secret.                                               |
| `SHOPIFY_SHOP_DOMAIN`         | Required canonical `your-store.myshopify.com` domain.                                                                            |
| `SHOPIFY_ADMIN_ACCESS_TOKEN`  | Optional server-only token for the same app and store; otherwise client credentials are used.                                    |
| `SHOPIFY_APP_URL`             | Deployment reference URL; also update Shopify TOML and the theme block. The runtime does not derive its host from this variable. |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | Optional legacy public client-ID fallback for App Bridge; does not replace server-side `SHOPIFY_API_KEY`.                        |

API and webhook configuration use version `2026-07`. Scopes in `shopify.app.production.toml`: `read_products`, `read_orders`, `write_metaobject_definitions`, `write_metaobjects`. Product writes are not needed. Configure/release app permissions and webhook subscriptions in Shopify; editing TOML alone does not deploy them.

## Merchant workflow

- Search, sort and filter bundles by Active, Draft, Scheduled or Ended. Desktop uses a table; mobile uses stacked rows without horizontal page scrolling.
- Edit products, percentage discounts or quantity offers, appearance and dates in one form with a sticky preview and save bar.
- Product selection preserves choices across searches and pages. Search is debounced and superseded requests are cancelled. The catalog samples variants to bound query cost, then checks additional pages when needed to find availability.
- Saves validate on client and server and prevent repeated in-flight submissions. Delete and in-app navigation away from changed forms require confirmation. Reload/close uses the native unsaved-changes prompt.
- Interface language is stored locally. Merchant-entered product names and offer copy remain unchanged.

Supported offers: fixed groups, frequently bought together, mix-and-match exact quantities, build-your-own quantity ranges, volume tiers and buy-X-get-Y using the same product or a separate gift product. The storefront offers one available variant per product row; multiple variant selections for the same product within one offer and selling plans are not implemented.

Admin previews calculate in integer currency minor units. The widget uses Shopify Ajax presentment prices (scaled by 100) and cart currency. Discounts are capped and totals cannot become negative. Savings compare against current variant prices, not compare-at list prices. Schedules use GMT+7; the dashboard uses UTC. Both are labelled in the UI.

## Storefront and checkout setup

1. Deploy the app to HTTPS and update `application_url` and allowed URLs in `shopify.app.production.toml`.
2. Install the same app on the configured store and grant permissions. Revenue requires order access.
3. Release the Shopify app configuration and theme extension, including uninstall/privacy webhook subscriptions: [webhook configuration](https://shopify.dev/docs/apps/build/webhooks/subscribe).
4. Add **Thanh Sang Bundle** to a product template in the theme editor. Set the block's App URL and save.
5. Configure matching Shopify automatic discounts, or integrate a Shopify Function for bundle-specific rules. Verify a real cart and checkout before activating offers.

**The widget does not enforce checkout discounts.** Line-item properties identify bundle/offer items and separate unrelated cart items, but are not a security boundary for pricing. Shopify must enforce eligibility when quantities change or products are removed. Free shipping, subscriptions, market/B2B restrictions, upsells and custom gifts are not implemented. Unsupported enabled settings are rejected on save.

## Operational limits

- No multi-store installation/token persistence, billing, Shopify Function or automatic discount provisioning. This version is not App Store ready.
- Dashboard totals describe all store orders, not attributed bundle revenue. They scan at most 5,000 orders and 5,000 products and report truncation.
- Bundle reads paginate Shopify and cap results at 10,000 bundles. Malformed saved metaobjects cause a visible error rather than silently becoming defaults; repair invalid data in Shopify.
- Public storefront responses can be cached for up to 30 seconds. Confirm offer changes after that window.
- Automated tests use mocks. Live installation, permissions, webhook delivery, theme compatibility and checkout discounts require a configured development store.
- `.next` and TypeScript build caches are ignored and removed from Git tracking; local outputs are retained. Changes are not committed or deployed automatically.
