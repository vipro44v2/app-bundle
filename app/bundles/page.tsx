"use client";
import AdminShell from "@/components/layout/admin-shell";
import BundleList from "@/components/bundles/bundle-list";
import { useAdminData } from "@/hooks/use-admin-data";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import type { BundleRecord } from "@/types/bundle";
export default function BundlesPage() {
  const { data, error, loading, reload } = useAdminData<{
    bundles: BundleRecord[];
  }>("/api/bundles");
  return (
    <AdminShell>
      {error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data ? (
        <LoadingState label="Loading bundles" />
      ) : (
        <BundleList
          initialBundles={data.bundles}
          reload={reload}
          refreshing={loading}
        />
      )}
    </AdminShell>
  );
}
