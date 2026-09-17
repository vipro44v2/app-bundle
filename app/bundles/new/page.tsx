import { RoutedApp } from "@/components/app-client";
import { getShopifyProducts } from "@/lib/shopify/products";

export const dynamic = "force-dynamic";
export default async function NewBundlePage() {
  const page = await getShopifyProducts();
  return (
    <RoutedApp
      view="editor"
      catalog={page.products}
      catalogCursor={page.nextCursor}
    />
  );
}
