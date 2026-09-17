import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  async headers() {
    const shop = process.env.SHOPIFY_SHOP_DOMAIN?.trim().toLowerCase();
    const merchantFrame =
      shop && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)
        ? ` https://${shop}`
        : "";
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors https://admin.shopify.com${merchantFrame};`,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
