# Thanh Sang Bundle

A responsive Next.js Shopify bundle app UI based on the supplied BundleFlow mockups.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The interface uses demo catalog data until Shopify credentials are configured.

## Connect Shopify

1. Copy `.env.example` to `.env.local` and add your Shopify app credentials.
2. Configure the app URL and allowed redirect URLs in the Shopify Partner Dashboard.
3. Replace the static access-token setup with Shopify OAuth/session storage before production use.
4. Product data is available through `GET /api/shopify/products`; verified webhooks can be sent to `POST /api/shopify/webhooks`.

The current project is an app MVP. Production billing, OAuth persistence, database-backed bundles, Shopify Functions discounts, and theme app extensions should be added before App Store submission.
