"use client";
import Link from "next/link";
import { LayoutDashboard, Menu, Package, Settings, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminData } from "@/hooks/use-admin-data";
const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/bundles", label: "Bundles", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const { data: store } = useAdminData<{ name: string; domain: string }>(
    "/api/shopify/store",
  );
  useEffect(() => setEmbedded(window.top !== window.self), []);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  return (
    <div className={`admin-shell ${embedded ? "is-embedded" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" href="/bundles">
          <span className="brand-mark">
            <Package size={18} />
          </span>
          Thanh Sang Bundle
        </Link>
        <span className="store-name">{store?.name ?? "Bundle management"}</span>
        <button
          type="button"
          className="icon-button nav-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls="app-navigation"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <nav
        id="app-navigation"
        aria-label="App navigation"
        className={`app-navigation ${menu ? "is-open" : ""}`}
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
        {store && (
          <div className="nav-store">
            <span className="store-avatar">
              {store.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{store.name}</strong>
              <small>{store.domain}</small>
            </div>
          </div>
        )}
      </nav>
      <main id="main-content">{children}</main>
    </div>
  );
}
