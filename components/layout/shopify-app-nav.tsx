"use client";

import { createElement } from "react";

export default function ShopifyAppNav() {
  return createElement(
    "s-app-nav",
    null,
    createElement("s-link", { href: "/dashboard", rel: "home" }, "Home"),
    createElement("s-link", { href: "/bundles" }, "More Upsells"),
    createElement("s-link", { href: "/translations" }, "Translations"),
    createElement("s-link", { href: "/dashboard" }, "Analytics"),
    createElement("s-link", { href: "/plan" }, "Plan management"),
    createElement(
      "s-link",
      { href: "/suggest-feature" },
      "Suggest feature",
    ),
    createElement("s-link", { href: "/settings" }, "Settings"),
  );
}
