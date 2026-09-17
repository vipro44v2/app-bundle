import { LanguageBootstrap } from "@/components/localization/auto-translate";
import type { Metadata } from "next";
import Script from "next/script";
import ShopifyAppNav from "@/components/layout/shopify-app-nav";
import "./globals.css";
export const metadata: Metadata = {
  title: "Thanh Sang Bundle",
  description: "Manage bundle offers for your Shopify store.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const key =
    process.env.SHOPIFY_API_KEY ?? process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
  return (
    <html lang="en">
      <head>
        {key && (
          <>
            <meta name="shopify-api-key" content={key} />
            <Script
              src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
              strategy="beforeInteractive"
            />
          </>
        )}
      </head>
      <body>
        <LanguageBootstrap />
        {key && <ShopifyAppNav />}
        {children}
      </body>
    </html>
  );
}
