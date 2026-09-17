import AppSectionPage from "@/components/layout/app-section-page";
export default function SuggestFeaturePage() {
  return (
    <AppSectionPage
      title="Suggest a feature"
      description="Request an improvement to your bundle workflow."
      action={{
        href: "https://github.com/vipro44v2/app-bundle/issues",
        label: "Open project issues",
      }}
    />
  );
}
