import AdminShell from "@/components/layout/admin-shell";
import BundleList from "@/components/bundles/bundle-list";
import { getBundles } from "@/lib/shopify/bundles";

export const dynamic = "force-dynamic";
export default async function BundlesPage() {
  return (
    <AdminShell>
      <BundleList initialBundles={await getBundles()} />
    </AdminShell>
  );
}
