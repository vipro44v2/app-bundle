import { test, expect, type Page } from "@playwright/test";
const products = Array.from({ length: 4 }, (_, i) => ({
  id: `gid://shopify/Product/${i + 1}`,
  name: ["Everyday cotton tee", "Canvas tote", "Ceramic mug", "Gift pouch"][i],
  vendor: "Test Store",
  price: [19.99, 24, 12, 5][i],
  stock: 40,
  available: true,
  image: null,
  variants: [
    {
      id: `gid://shopify/ProductVariant/${i + 1}`,
      title: "Default",
      price: "19.99",
      availableForSale: true,
    },
  ],
}));
const initial = [
  {
    id: "gid://shopify/Metaobject/1",
    handle: "everyday",
    name: "Everyday essentials",
    type: "Fixed bundle",
    productIds: [products[0].id, products[1].id],
    products: 2,
    discount: 15,
    status: "Active",
    updatedAt: "2026-09-17T10:00:00Z",
  },
];
async function mock(page: Page) {
  let bundles = [...initial];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    if (url.pathname === "/api/shopify/store")
      return route.fulfill({
        json: {
          name: "Northstar Supply",
          domain: "test-shop.myshopify.com",
          currencyCode: "USD",
        },
      });
    if (url.pathname === "/api/dashboard")
      return route.fulfill({
        json: {
          shop: "Northstar Supply",
          currency: "USD",
          revenue: 1250.5,
          orders: 20,
          averageOrderValue: 62.53,
          bundles: 2,
          activeBundles: 1,
          products: 120,
          inventory: 1800,
          dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-09-${String(i + 1).padStart(2, "0")}`,
            value: i % 4 === 0 ? 0 : 25 + i * 3,
          })),
        },
      });
    if (url.pathname === "/api/shopify/products") {
      const query = url.searchParams.get("query")?.toLowerCase() ?? "";
      const result = products.filter((product) =>
        product.name.toLowerCase().includes(query),
      );
      return route.fulfill({
        json: { products: result, nextCursor: null, currency: "USD" },
      });
    }
    if (url.pathname === "/api/bundles" && method === "GET")
      return route.fulfill({ json: { bundles } });
    if (url.pathname === "/api/bundles" && method === "POST") {
      const input = route.request().postDataJSON();
      const bundle = {
        ...input,
        id: "gid://shopify/Metaobject/2",
        handle: "new",
        type: input.bundleType,
        products: input.productIds.length,
        updatedAt: "2026-09-17T11:00:00Z",
      };
      bundles.push(bundle);
      return route.fulfill({ status: 201, json: { bundle } });
    }
    if (url.pathname.startsWith("/api/bundles/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1)!);
      if (method === "DELETE") {
        bundles = bundles.filter((bundle) => bundle.id !== id);
        return route.fulfill({ json: { deleted: id } });
      }
      const saved = bundles.find((bundle) => bundle.id === id);
      if (method === "PATCH") {
        const input = route.request().postDataJSON(),
          bundle = {
            ...saved,
            ...input,
            type: input.bundleType,
            products: input.productIds.length,
          };
        bundles = bundles.map((item) => (item.id === id ? bundle : item));
        return route.fulfill({ json: { bundle } });
      }
      return route.fulfill({ json: { bundle: saved, products } });
    }
    return route.fulfill({ status: 404, json: { error: "Not found" } });
  });
}
test.beforeEach(async ({ page }) => {
  await mock(page);
});
for (const width of [320, 375, 430, 768, 1024, 1440]) {
  test(`responsive pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/dashboard",
      "/bundles",
      "/bundles/gid%3A%2F%2Fshopify%2FMetaobject%2F1/edit",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("status", { name: /Loading/ })).toHaveCount(
        0,
      );
      if (path.endsWith("/edit")) {
        await expect(
          page.getByRole("heading", { name: "Edit bundle", exact: true }),
        ).toBeVisible();
        await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
          "Everyday essentials",
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: `artifacts/settings-${width}.png`,
      fullPage: true,
    });
  });
}
test("create, search products, save once, update and delete", async ({
  page,
}) => {
  const failures: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/bundles") &&
      ["POST", "PATCH"].includes(request.method())
    )
      writes.push(request.method());
  });
  await page.goto("/bundles");
  await page.getByRole("link", { name: "Create bundle", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Weekend set");
  await page
    .getByRole("button", { name: "Select products", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Search products" }).fill("cotton");
  await expect(dialog.locator(".product-row")).toHaveCount(1);
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("textbox", { name: "Search products" }).fill("");
  await expect(dialog.locator(".product-row")).toHaveCount(4);
  await dialog
    .locator(".product-row")
    .filter({ hasText: "Canvas tote" })
    .getByRole("checkbox")
    .check();
  await dialog.getByRole("button", { name: "Apply selection" }).click();
  await page
    .getByRole("button", { name: "Save bundle", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved." }),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Weekend essentials");
  await page
    .getByRole("button", { name: "Save bundle", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to bundles" }).click();
  await expect(
    page.getByRole("link", { name: "Weekend essentials", exact: true }),
  ).toBeVisible();
  expect(writes).toEqual(["POST", "PATCH"]);
  await page
    .getByRole("link", { name: "Weekend essentials", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit bundle", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Weekend essentials",
  );
  await page.getByRole("button", { name: "Back to bundles" }).click();
  await page
    .getByRole("button", { name: "Delete Weekend essentials", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Weekend essentials", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Weekend essentials", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Weekend essentials", exact: true }),
  ).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("Vietnamese status labels preserve API enum values and language persists", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("vi");
  await page.goto("/bundles/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  const status = page.getByRole("combobox", {
    name: "Trạng thái",
    exact: true,
  });
  await status.selectOption({ label: "Đang hoạt động" });
  await expect(status).toHaveValue("Active");
  await status.selectOption({ label: "Bản nháp" });
  await expect(status).toHaveValue("Draft");
});

test("validation waits for a field visit and focuses the first error on save", async ({
  page,
}) => {
  await page.goto("/bundles/new");
  await page.getByLabel("Name", { exact: true }).fill("A bundle");
  await page.getByLabel("Percentage off", { exact: true }).fill("101");
  await page.getByLabel("Name", { exact: true }).click();
  await expect(
    page.getByText("Discount must be between 0 and 100", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Select between 1 and 50 products", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save bundle", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Select products", exact: true }),
  ).toBeFocused();
});
test("dirty form asks before leaving and modal restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/bundles/new");
  await page.getByLabel("Name", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Back to bundles" }).click();
  await expect(
    page.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const select = page.getByRole("button", {
    name: "Select products",
    exact: true,
  });
  await select.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(select).toBeFocused();
});
test("empty search can clear filters and refresh replaces stale records", async ({
  page,
}) => {
  await page.goto("/bundles");
  await page.getByRole("textbox", { name: "Search bundles" }).fill("missing");
  await expect(
    page.getByRole("heading", { name: "No matching bundles" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("link", { name: "Everyday essentials", exact: true }),
  ).toBeVisible();
  await page.route("**/api/bundles", (route) =>
    route.fulfill({ json: { bundles: [] } }),
  );
  await page.getByRole("button", { name: "Refresh bundles" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your first bundle" }),
  ).toBeVisible();
});
test("mobile product dialog stays inside viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/bundles/new");
  await page
    .getByRole("button", { name: "Select products", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Apply selection" }),
  ).toBeInViewport();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/product-picker-320.png" });
});
test("unauthorized state has a route back to Shopify admin", async ({
  page,
}) => {
  await page.route("**/api/bundles", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Open this app from your Shopify admin to continue" },
    }),
  );
  await page.goto("/bundles");
  await expect(
    page.getByRole("heading", { name: "Connect to your store" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Shopify admin" }),
  ).toHaveAttribute("href", "/api/auth");
});
test("desktop screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [name, path] of [
    ["overview", "/dashboard"],
    ["bundles", "/bundles"],
    ["editor", "/bundles/gid%3A%2F%2Fshopify%2FMetaobject%2F1/edit"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("status", { name: /Loading/ })).toHaveCount(0);
    await page.screenshot({
      path: `artifacts/${name}-1440.png`,
      fullPage: true,
    });
  }
});
