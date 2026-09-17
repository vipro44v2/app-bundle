export type DailyRevenue = { date: string; value: number };

export type DashboardData = {
  shop: string;
  currency: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  bundles: number;
  activeBundles: number;
  products: number;
  inventory: number;
  dailyRevenue: DailyRevenue[];
};
