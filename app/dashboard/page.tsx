import AdminShell from "@/components/layout/admin-shell";
import DashboardView from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/shopify/dashboard";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  return (
    <AdminShell>
      <DashboardView data={await getDashboardData()} />
    </AdminShell>
  );
}
