import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import ShopifyAppNav from "@/components/layout/shopify-app-nav";
import AutoTranslate from "@/components/localization/auto-translate";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thanh Sang Bundle — Shopify bundles",
  description:
    "Create, publish and track high-converting Shopify bundle deals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const shopifyApiKey =
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ?? process.env.SHOPIFY_API_KEY ?? "";

  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={shopifyApiKey} />
        <Script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>
        <ShopifyAppNav />
        <AutoTranslate />
        {children}
      </body>
    </html>
  );
}
