import { BUNDLE_TYPE } from "@/lib/bundles";
import { shopifyAdmin } from "@/lib/shopify";
import type { DashboardData } from "@/types/dashboard";

export async function getDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  const since = new Date(now - 30 * 86400000).toISOString();
  const response = await shopifyAdmin<{
    shop: { name: string; currencyCode: string };
    products: { nodes: Array<{ totalInventory: number }> };
    orders: {
      nodes: Array<{
        createdAt: string;
        currentTotalPriceSet: { shopMoney: { amount: string } };
      }>;
    };
    metaobjects: {
      nodes: Array<{ fields: Array<{ key: string; value: string }> }>;
    };
  }>(
    `query Dashboard($bundleType: String!, $orderQuery: String!) { shop { name currencyCode } products(first: 100) { nodes { totalInventory } } orders(first: 250, query: $orderQuery, sortKey: CREATED_AT) { nodes { createdAt currentTotalPriceSet { shopMoney { amount currencyCode } } } } metaobjects(type: $bundleType, first: 100) { nodes { fields { key value } } } }`,
    { bundleType: BUNDLE_TYPE, orderQuery: `created_at:>=${since}` },
  );
  if (!response.data)
    throw new Error(
      response.errors?.map((error) => error.message).join(", ") ||
        "Unable to load dashboard",
    );
  const { shop, products, orders, metaobjects } = response.data;
  const revenue = orders.nodes.reduce(
    (sum, order) => sum + Number(order.currentTotalPriceSet.shopMoney.amount),
    0,
  );
  const daily = new Map<string, number>();
  for (let index = 29; index >= 0; index--)
    daily.set(new Date(now - index * 86400000).toISOString().slice(0, 10), 0);
  for (const order of orders.nodes) {
    const date = order.createdAt.slice(0, 10);
    if (daily.has(date))
      daily.set(
        date,
        (daily.get(date) ?? 0) +
          Number(order.currentTotalPriceSet.shopMoney.amount),
      );
  }
  return {
    shop: shop.name,
    currency: shop.currencyCode,
    revenue,
    orders: orders.nodes.length,
    averageOrderValue: orders.nodes.length ? revenue / orders.nodes.length : 0,
    bundles: metaobjects.nodes.length,
    activeBundles: metaobjects.nodes.filter((node) =>
      node.fields.some(
        (field) => field.key === "status" && field.value === "Active",
      ),
    ).length,
    products: products.nodes.length,
    inventory: products.nodes.reduce(
      (sum, product) => sum + Math.max(0, product.totalInventory || 0),
      0,
    ),
    dailyRevenue: [...daily].map(([date, value]) => ({ date, value })),
  };
}
