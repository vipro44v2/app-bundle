import { notFound } from "next/navigation";
import { RoutedApp } from "@/components/app-client";
import { getBundleById } from "@/lib/shopify/bundles";
import { getShopifyProducts } from "@/lib/shopify/products";

export const dynamic = "force-dynamic";

export default async function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, catalog] = await Promise.all([
    getBundleById(decodeURIComponent(id)),
    getShopifyProducts(),
  ]);
  if (!bundle) notFound();
  return (
    <RoutedApp
      view="editor"
      existing={bundle}
      catalog={catalog.products}
      catalogCursor={catalog.nextCursor}
    />
  );
}
