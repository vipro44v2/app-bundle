"use client";
import AdminShell from "@/components/layout/admin-shell";
import DashboardView from "@/components/dashboard/dashboard-view";
import { useAdminData } from "@/hooks/use-admin-data";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import type { DashboardData } from "@/types/dashboard";
export default function DashboardPage() {
  const { data, error, loading, reload } =
    useAdminData<DashboardData>("/api/dashboard");
  return (
    <AdminShell>
      {error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data || loading ? (
        <LoadingState label="Loading overview" />
      ) : (
        <DashboardView data={data} />
      )}
    </AdminShell>
  );
}
