import { shopifyAdmin } from "@/lib/shopify";
import { getBundles } from "@/lib/shopify/bundles";
import { toMinor, fromMinor } from "@/lib/bundle/pricing";
import { isScheduledActive } from "@/lib/bundle/validation";
import type { DashboardData } from "@/types/dashboard";
export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
  ).toISOString();
  const [identity, bundles] = await Promise.all([
    shopifyAdmin<{ shop: { name: string; currencyCode: string } }>(
      "query DashboardShop { shop { name currencyCode } }",
    ),
    getBundles(),
  ]);
  const shop = identity.data!.shop;
  const daily = new Map<string, number>();
  for (let i = 0; i < 30; i++)
    daily.set(
      new Date(Date.parse(since) + i * 86400000).toISOString().slice(0, 10),
      0,
    );
  let orderCursor: string | null = null,
    productCursor: string | null = null;
  let orders = 0,
    revenueMinor = 0,
    products = 0,
    inventory = 0,
    partial = false;
  for (let page = 0; page < 20; page++) {
    const response: {
      data?: {
        orders: {
          nodes: {
            createdAt: string;
            currentTotalPriceSet: { shopMoney: { amount: string } };
          }[];
          pageInfo: { endCursor: string | null; hasNextPage: boolean };
        };
      };
    } = await shopifyAdmin(
      "query DashboardOrders($after: String, $query: String!) { orders(first: 250, after: $after, query: $query, sortKey: CREATED_AT) { nodes { createdAt currentTotalPriceSet { shopMoney { amount } } } pageInfo { hasNextPage endCursor } } }",
      { after: orderCursor, query: "created_at:>=" + since + " status:any" },
    );
    const connection = response.data!.orders;
    for (const order of connection.nodes) {
      const amount = toMinor(
        Number(order.currentTotalPriceSet.shopMoney.amount),
        shop.currencyCode,
      );
      revenueMinor += amount;
      orders++;
      const date = order.createdAt.slice(0, 10);
      if (daily.has(date)) daily.set(date, daily.get(date)! + amount);
    }
    if (!connection.pageInfo.hasNextPage) break;
    partial = page === 19;
    orderCursor = connection.pageInfo.endCursor;
  }
  for (let page = 0; page < 20; page++) {
    const response: {
      data?: {
        products: {
          nodes: { totalInventory: number }[];
          pageInfo: { endCursor: string | null; hasNextPage: boolean };
        };
      };
    } = await shopifyAdmin(
      "query DashboardInventory($after: String) { products(first: 250, after: $after) { nodes { totalInventory } pageInfo { hasNextPage endCursor } } }",
      { after: productCursor },
    );
    const connection = response.data!.products;
    products += connection.nodes.length;
    inventory += connection.nodes.reduce(
      (sum, product) => sum + Math.max(0, product.totalInventory ?? 0),
      0,
    );
    if (!connection.pageInfo.hasNextPage) break;
    partial ||= page === 19;
    productCursor = connection.pageInfo.endCursor;
  }
  return {
    shop: shop.name,
    currency: shop.currencyCode,
    revenue: fromMinor(revenueMinor, shop.currencyCode),
    orders,
    averageOrderValue: fromMinor(
      orders ? Math.round(revenueMinor / orders) : 0,
      shop.currencyCode,
    ),
    bundles: bundles.length,
    activeBundles: bundles.filter(
      (bundle) =>
        bundle.status === "Active" &&
        isScheduledActive(bundle.configuration?.settings),
    ).length,
    products,
    inventory,
    dailyRevenue: [...daily].map(([date, value]) => ({
      date,
      value: fromMinor(value, shop.currencyCode),
    })),
    partial,
  };
}
