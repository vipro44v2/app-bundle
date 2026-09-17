"use client";
import { createElement } from "react";
export default function ShopifyAppNav() {
  return createElement(
    "s-app-nav",
    null,
    createElement("s-link", { href: "/dashboard", rel: "home" }, "Overview"),
    createElement("s-link", { href: "/bundles" }, "Bundles"),
    createElement("s-link", { href: "/settings" }, "Settings"),
  );
}
