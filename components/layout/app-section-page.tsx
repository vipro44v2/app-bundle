import Link from "next/link";
import AdminShell from "./admin-shell";
export default function AppSectionPage({
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <AdminShell>
      <div className="page-content">
        <header className="page-heading">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        <section className="surface empty-state">
          <p>
            {title === "Plan management"
              ? "This installation does not include app billing or subscription plans."
              : title === "Suggest a feature"
                ? "Feature requests are managed in the project issue tracker."
                : "Edit customer-facing wording in each bundle’s display settings."}
          </p>
          <Link className="secondary" href={action?.href ?? "/bundles"}>
            {action?.label ?? "Manage bundles"}
          </Link>
        </section>
      </div>
    </AdminShell>
  );
}
