import Link from "next/link";
import {
  Check,
  ChevronRight,
  Gift,
  Package,
  ShoppingBag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { DashboardData } from "@/types/dashboard";

const card =
  "rounded-xl border border-[#e3e3e3] bg-white shadow-[0_1px_3px_rgba(0,0,0,.08)]";
const iconBox =
  "grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-green-50 text-green-600 [&>svg]:block";
const primary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-green-700 bg-green-600 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-green-700";

function Metric({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
}) {
  return (
    <div className={`${card} relative min-h-[142px] min-w-0 p-5`}>
      <span className={`${iconBox} absolute right-4 top-4`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 pr-11">
        <span className="block text-xs leading-snug text-[#6d7175]">
          {label}
        </span>
        <strong className="my-3 block overflow-wrap-anywhere text-[27px] leading-tight tracking-[-.5px]">
          {value}
        </strong>
        <small className="block text-[11px] leading-snug text-[#7b8780]">
          {trend}
        </small>
      </div>
    </div>
  );
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
    }).format(value);
  const max = Math.max(...data.dailyRevenue.map((day) => day.value), 1);
  return (
    <div className="mx-auto w-full max-w-[1220px] px-4 pb-[70px] pt-6 sm:px-[34px] sm:pt-8">
      <div className="mb-[26px] flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="m-0 text-[28px] font-bold leading-tight tracking-[-.7px]">
            Welcome back, {data.shop}
          </h1>
          <p className="mt-1.5 text-[#6d7175]">
            Track your bundle performance and grow your average order value.
          </p>
        </div>
        <Link className={`${primary} shrink-0`} href="/bundles/new">
          <Gift className="block" size={18} />
          Create bundle deal
        </Link>
      </div>
      <section className="mb-3.5 grid grid-cols-1 gap-3.5 min-[430px]:grid-cols-2 min-[900px]:grid-cols-4">
        <Metric
          label="Store revenue"
          value={money(data.revenue)}
          trend={`${data.orders} orders`}
          icon={TrendingUp}
        />
        <Metric
          label="Average order value"
          value={money(data.averageOrderValue)}
          trend="last 30 days"
          icon={ShoppingBag}
        />
        <Metric
          label="Active bundles"
          value={`${data.activeBundles}`}
          trend={`${data.bundles} total`}
          icon={Gift}
        />
        <Metric
          label="Inventory units"
          value={data.inventory.toLocaleString()}
          trend={`${data.products} products`}
          icon={Package}
        />
      </section>
      <section className="mb-3.5 grid min-w-0 grid-cols-1 gap-3.5 min-[900px]:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className={`${card} min-w-0 p-[19px]`}>
          <div className="flex min-w-0 items-start justify-between">
            <div>
              <h2 className="m-0 text-[15px] font-bold">Revenue trend</h2>
              <p className="mt-1 text-[11px] text-[#6d7175]">
                Daily Shopify order revenue
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
              <i className="size-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </div>
          <div className="mt-5 flex items-center gap-2.5">
            <strong className="text-2xl">{money(data.revenue)}</strong>
            <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] text-green-700">
              {data.orders} orders
            </span>
          </div>
          <div className="flex h-[190px] items-end gap-1 border-b border-[#e1e3e5] pt-5">
            {data.dailyRevenue.map((day) => (
              <div
                className="flex h-full flex-1 items-end"
                key={day.date}
                title={`${day.date}: ${money(day.value)}`}
              >
                <i
                  className="block min-h-[3px] w-full rounded-t bg-gradient-to-b from-green-500 to-green-300 hover:bg-green-600"
                  style={{ height: `${Math.max(3, (day.value / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#89928d]">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
        <div className={`${card} min-w-0 p-[19px]`}>
          <div className="flex min-w-0 items-start justify-between">
            <div>
              <h2 className="m-0 text-[15px] font-bold">Bundle health</h2>
              <p className="mt-1 text-[11px] text-[#6d7175]">
                Stored in Shopify Metaobjects
              </p>
            </div>
            <span className={iconBox}>
              <Gift size={20} />
            </span>
          </div>
          <div className="mt-6 flex items-baseline gap-2 py-5">
            <strong className="text-[40px] leading-none">
              {data.activeBundles}
            </strong>
            <span className="text-[11px] text-[#6d7175]">active bundles</span>
          </div>
          {[
            [
              "Shopify catalog connected",
              `${data.products} products synchronized`,
            ],
            ["Orders connected", `${data.orders} orders in this period`],
          ].map(([title, detail]) => (
            <div
              className="flex items-center gap-2.5 border-t border-[#e8e8e8] py-3.5"
              key={title}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-green-200 bg-green-50 text-green-600">
                <Check className="block" size={14} />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs">{title}</strong>
                <small className="block text-[10px] text-[#7b8780]">
                  {detail}
                </small>
              </div>
            </div>
          ))}
          <Link
            className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#cbd4ce] bg-white px-3.5 text-[13px] font-semibold text-[#26332c] hover:bg-gray-50"
            href="/bundles"
          >
            Manage bundles <ChevronRight className="block" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
