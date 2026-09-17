import AppSectionPage from "@/components/layout/app-section-page";
import AdminShell from "@/components/layout/admin-shell";

export default function SettingsPage() {
  return (
    <AdminShell>
      <AppSectionPage
        eyebrow="Configuration"
        title="Settings"
        description="Configure bundle defaults, storefront behavior and app preferences."
      />
    </AdminShell>
  );
}
