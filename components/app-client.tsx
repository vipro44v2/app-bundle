"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  calculateBuyXGetYPrice,
  calculateProductBundlePrice,
  calculateQuantityBreakPrice,
} from "@/lib/bundle/pricing";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Gift,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

type Page = "dashboard" | "bundles" | "create";
type BundleType =
  | "Fixed bundle"
  | "Mix & match"
  | "Build your own"
  | "Volume discount"
  | "Buy X get Y"
  | "Frequently bought together";

const bundleTypes: {
  name: BundleType;
  description: string;
  icon: typeof Package;
}[] = [
  {
    name: "Fixed bundle",
    description:
      "Sell a pre-selected group of products together at a special price.",
    icon: Package,
  },
  {
    name: "Mix & match",
    description:
      "Let customers choose a set number of items from selected collections.",
    icon: Boxes,
  },
  {
    name: "Build your own",
    description: "Give shoppers the freedom to assemble a personalized bundle.",
    icon: Sparkles,
  },
  {
    name: "Volume discount",
    description: "Reward customers with better prices when they buy more.",
    icon: TrendingUp,
  },
  {
    name: "Buy X get Y",
    description:
      "Offer a free or discounted product after a qualifying purchase.",
    icon: Gift,
  },
  {
    name: "Frequently bought together",
    description: "Recommend complementary products to increase order value.",
    icon: ShoppingBag,
  },
];

type CatalogProduct = {
  id: string;
  name: string;
  vendor: string;
  price: number;
  stock: number;
  color?: string;
  emoji?: string;
  image?: string | null;
  available?: boolean;
};
type BundleRecord = {
  id: string;
  handle: string;
  name: string;
  type: BundleType;
  productIds: string[];
  products: number;
  discount: number;
  status: "Active" | "Draft";
  updatedAt: string;
  configuration?: BundleConfiguration;
};

type DealBar = {
  id: string;
  offerType?:
    | "quantity_break"
    | "buy_x_get_y"
    | "product_bundle"
    | "mix_match"
    | "alternative_product";
  buyQuantity: number;
  buyPriceMethod: "full_price" | "percentage_off" | "fixed_price";
  getQuantity: number;
  getPriceMethod: "percentage_off" | "fixed_price" | "free";
  getDiscount: number;
  title: string;
  subtitle: string;
  label: string;
  applySellingPlan: boolean;
  selectedByDefault: boolean;
  soldOut: boolean;
  imageMode: "none" | "upload" | "featured";
  upsellEnabled: boolean;
  giftEnabled: boolean;
  personalizationEnabled: boolean;
  highlightsEnabled: boolean;
};

type BundleConfiguration = {
  bars: DealBar[];
  accent?: string;
  style?: BundleStyle;
  freeShipping?: boolean;
  settings?: BundleSettings;
};

type BundleStyle = {
  layout: "stacked" | "compact" | "grid" | "minimal";
  cornerRadius: number;
  spacing: number;
  cardsBg: string;
  selectedBg: string;
  borderColor: string;
  blockTitle: string;
  badgeBg: string;
  badgeText: string;
  price: string;
  fullPrice: string;
  freeGiftBg: string;
  freeGiftText: string;
  freeGiftSelectedBg: string;
  freeGiftSelectedText: string;
  upsellBg: string;
  upsellText: string;
  upsellSelectedBg: string;
  upsellSelectedText: string;
};

const defaultBundleStyle = (): BundleStyle => ({
  layout: "stacked",
  cornerRadius: 14,
  spacing: 7,
  cardsBg: "#ededed",
  selectedBg: "#ffffff",
  borderColor: "#161616",
  blockTitle: "#161616",
  badgeBg: "#e8ebea",
  badgeText: "#161616",
  price: "#161616",
  fullPrice: "#69756e",
  freeGiftBg: "#6a6a6a",
  freeGiftText: "#ffffff",
  freeGiftSelectedBg: "#161616",
  freeGiftSelectedText: "#ffffff",
  upsellBg: "#d1d1d1",
  upsellText: "#161616",
  upsellSelectedBg: "#bdbdbd",
  upsellSelectedText: "#161616",
});

type BundleSettings = {
  blockTitle: string;
  discountName: string;
  markets: string;
  excludeMarkets: boolean;
  excludeB2B: boolean;
  widgetOnly: boolean;
  startDate: string;
  startTime: string;
  hasEndDate: boolean;
  endDate: string;
  endTime: string;
  differentVariants: boolean;
  hideThemeVariantPicker: boolean;
  hideUnavailableVariants: boolean;
  dontUpdateOtherProducts: boolean;
  swatchesEnabled: boolean;
  defaultVariantsEnabled: boolean;
  minimumItems: number;
  maximumItems: number;
  exactItems: number;
};

const defaultBundleSettings = (): BundleSettings => ({
  blockTitle: "BUNDLE & SAVE",
  discountName: "",
  markets: "all",
  excludeMarkets: false,
  excludeB2B: false,
  widgetOnly: false,
  startDate: new Date().toISOString().slice(0, 10),
  startTime: new Date().toTimeString().slice(0, 5),
  hasEndDate: false,
  endDate: "",
  endTime: "",
  differentVariants: false,
  hideThemeVariantPicker: false,
  hideUnavailableVariants: false,
  dontUpdateOtherProducts: false,
  swatchesEnabled: false,
  defaultVariantsEnabled: false,
  minimumItems: 2,
  maximumItems: 6,
  exactItems: 3,
});

const makeDealBar = (
  index: number,
  offerType: DealBar["offerType"] = "buy_x_get_y",
): DealBar => {
  const presets = [
    { buy: 1, get: 1, discount: 50, title: "Buy 1, get 1 free" },
    { buy: 2, get: 3, discount: 60, title: "Buy 2, get 3 free" },
    { buy: 3, get: 6, discount: 67, title: "Buy 3, get 6 free" },
  ];
  const preset = presets[index] ?? {
    buy: index + 1,
    get: index + 1,
    discount: 50,
    title: `Buy ${index + 1}, get ${index + 1} free`,
  };
  return {
    id: `bar-${Date.now()}-${index}`,
    offerType,
    buyQuantity: preset.buy,
    buyPriceMethod: "full_price",
    getQuantity: preset.get,
    getPriceMethod: "percentage_off",
    getDiscount: 100,
    title: preset.title,
    subtitle: "",
    label: `SAVE {{saved_percentage}}`,
    applySellingPlan: false,
    selectedByDefault: index === 0,
    soldOut: false,
    imageMode: "none",
    upsellEnabled: false,
    giftEnabled: index === 2,
    personalizationEnabled: false,
    highlightsEnabled: false,
  };
};

const makeBarsForType = (type: BundleType): DealBar[] => {
  if (type === "Volume discount")
    return [1, 2, 3].map((quantity, index) => ({
      ...makeDealBar(index, "quantity_break"),
      buyQuantity: quantity,
      getQuantity: 0,
      getDiscount: [0, 10, 15][index],
      title: `Buy ${quantity}+ items`,
      label: `SAVE {{saved_percentage}}`,
    }));
  if (type === "Buy X get Y")
    return [makeDealBar(0), makeDealBar(1), makeDealBar(2)];
  if (type === "Mix & match" || type === "Build your own")
    return [makeDealBar(0, "mix_match")];
  if (type === "Frequently bought together" || type === "Fixed bundle")
    return [makeDealBar(0, "product_bundle")];
  return [makeDealBar(0)];
};

export const demoProducts: CatalogProduct[] = [
  {
    id: "demo-1",
    name: "Premium Cotton T-Shirt",
    vendor: "Northstar Apparel",
    price: 29,
    stock: 145,
    color: "#d7e7e0",
    emoji: "👕",
  },
  {
    id: "demo-2",
    name: "Insulated Water Bottle",
    vendor: "Hydro Goods",
    price: 35,
    stock: 68,
    color: "#e3e9ef",
    emoji: "🥤",
  },
  {
    id: "demo-3",
    name: "Classic Leather Sneakers",
    vendor: "Sunday Supply",
    price: 89,
    stock: 32,
    color: "#eee7df",
    emoji: "👟",
  },
  {
    id: "demo-4",
    name: "Everyday Canvas Tote",
    vendor: "Northstar Apparel",
    price: 24,
    stock: 91,
    color: "#e8dfd1",
    emoji: "👜",
  },
  {
    id: "demo-5",
    name: "Minimalist Cap",
    vendor: "Sunday Supply",
    price: 22,
    stock: 0,
    color: "#dfe2e1",
    emoji: "🧢",
  },
];

const existingBundles = [
  {
    name: "Summer Essentials",
    type: "Fixed bundle",
    products: 3,
    revenue: "$12,480",
    orders: 342,
    status: "Active",
  },
  {
    name: "Build Your Routine",
    type: "Mix & match",
    products: 8,
    revenue: "$8,920",
    orders: 219,
    status: "Active",
  },
  {
    name: "Buy 2, save 15%",
    type: "Volume discount",
    products: 12,
    revenue: "$6,740",
    orders: 186,
    status: "Draft",
  },
];

function Logo() {
  return (
    <div className="logo">
      <span className="brand-mark">TS</span>
      <span className="brand-name">
        Thanh Sang <b>Bundle</b>
      </span>
    </div>
  );
}

export function Sidebar({
  page,
  setPage,
  open,
  close,
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  close: () => void;
}) {
  const links: { label: string; icon: typeof Package; page?: Page }[] = [
    { label: "Home", icon: LayoutDashboard, page: "dashboard" },
    { label: "Bundle deals", icon: Package, page: "bundles" },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Settings },
  ];
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={close} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <Logo />
          <button className="icon-button mobile-only" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <div className="store-pill">
          <div className="store-avatar">N</div>
          <div>
            <strong>Northstar Store</strong>
            <span>northstar.myshopify.com</span>
          </div>
          <ChevronDown size={16} />
        </div>
        <nav>
          {links.map(({ label, icon: Icon, page: target }) => (
            <button
              key={label}
              className={page === target ? "active" : ""}
              onClick={() => {
                if (target) setPage(target);
                close();
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button>
            <CircleHelp size={19} />
            Help center
          </button>
          <div className="trial">
            <strong>Free trial</strong>
            <span>9 days remaining</span>
            <div>
              <i />
            </div>
            <button>View plans</button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ toggle }: { toggle: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-only" onClick={toggle}>
        <Menu size={21} />
      </button>
      <div className="top-search">
        <Search size={18} />
        <input placeholder="Search Thanh Sang Bundle" />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-button">
          <Bell size={19} />
          <i />
        </button>
        <button className="avatar">JD</button>
      </div>
    </header>
  );
}

export function Dashboard({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good morning, Jamie</h1>
          <p>Here’s how your bundles are performing this month.</p>
        </div>
        <button className="primary" onClick={() => navigate("create")}>
          <Plus size={18} />
          Create bundle
        </button>
      </div>
      <section className="metrics">
        <Metric
          label="Bundle revenue"
          value="$42,500"
          trend="12.5%"
          icon={TrendingUp}
        />
        <Metric
          label="Bundle orders"
          value="1,240"
          trend="8.2%"
          icon={ShoppingBag}
        />
        <Metric
          label="Average order value"
          value="$125.40"
          trend="5.7%"
          icon={Tag}
        />
        <Metric
          label="Bundle conversion"
          value="3.2%"
          trend="0.4%"
          icon={Users}
        />
      </section>
      <section className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-head">
            <div>
              <h2>Bundle revenue</h2>
              <p>Revenue generated from bundles</p>
            </div>
            <select>
              <option>Last 30 days</option>
              <option>Last 7 days</option>
            </select>
          </div>
          <div className="chart-value">
            <strong>$42,500</strong>
            <span>↗ 12.5% vs last period</span>
          </div>
          <div className="chart">
            <div className="grid-lines" />
            <svg viewBox="0 0 700 190" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#008060" stopOpacity=".24" />
                  <stop offset="1" stopColor="#008060" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 158 C55 145 78 162 120 130 S185 108 220 116 S290 88 330 99 S395 60 430 75 S495 48 535 62 S605 32 700 20 L700 190 L0 190Z"
                fill="url(#fill)"
              />
              <path
                d="M0 158 C55 145 78 162 120 130 S185 108 220 116 S290 88 330 99 S395 60 430 75 S495 48 535 62 S605 32 700 20"
                fill="none"
                stroke="#008060"
                strokeWidth="3"
              />
            </svg>
            <div className="chart-labels">
              <span>Jul 6</span>
              <span>Jul 12</span>
              <span>Jul 18</span>
              <span>Jul 24</span>
              <span>Aug 3</span>
            </div>
          </div>
        </div>
        <div className="card setup-card">
          <div className="card-head">
            <div>
              <h2>Setup guide</h2>
              <p>3 of 4 tasks complete</p>
            </div>
            <span className="progress-ring">75%</span>
          </div>
          {[
            "Install app embed",
            "Create your first bundle",
            "Customize bundle widget",
            "Publish to your store",
          ].map((x, i) => (
            <div className="check-row" key={x}>
              <span className={i < 3 ? "done" : ""}>
                {i < 3 ? <Check size={14} /> : i + 1}
              </span>
              <div>
                <strong>{x}</strong>
                <small>{i < 3 ? "Completed" : "Ready when you are"}</small>
              </div>
              {i === 3 && <ChevronRight size={17} />}
            </div>
          ))}
        </div>
      </section>
      <section className="card table-card">
        <div className="card-head">
          <div>
            <h2>Top performing bundles</h2>
            <p>Your best sellers in the last 30 days</p>
          </div>
          <button className="text-button" onClick={() => navigate("bundles")}>
            View all <ChevronRight size={16} />
          </button>
        </div>
        <BundleTable compact />
      </section>
    </div>
  );
}

type DashboardData = {
  shop: string;
  currency: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  bundles: number;
  activeBundles: number;
  products: number;
  inventory: number;
  dailyRevenue: Array<{ date: string; value: number }>;
};

function EmbeddedNav() {
  return null;
}

export function LiveDashboard({
  navigate,
  initialData: data,
}: {
  navigate: (page: Page) => void;
  initialData: DashboardData;
}) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data?.currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  const max = Math.max(
    ...(data?.dailyRevenue.map((day) => day.value) ?? [1]),
    1,
  );
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <h1>{data ? `Welcome back, ${data.shop}` : "Welcome back"}</h1>
          <p>
            Track your bundle performance and grow your average order value.
          </p>
        </div>
        <button className="primary" onClick={() => navigate("create")}>
          <Plus size={18} />
          Create bundle deal
        </button>
      </div>
      <section className="metrics">
        <Metric
          label="Store revenue"
          value={data ? money(data.revenue) : "…"}
          trend={`${data?.orders ?? 0} orders`}
          icon={TrendingUp}
        />
        <Metric
          label="Average order value"
          value={data ? money(data.averageOrderValue) : "…"}
          trend="last 30 days"
          icon={ShoppingBag}
        />
        <Metric
          label="Active bundles"
          value={data ? `${data.activeBundles}` : "…"}
          trend={`${data?.bundles ?? 0} total`}
          icon={Gift}
        />
        <Metric
          label="Inventory units"
          value={data ? data.inventory.toLocaleString() : "…"}
          trend={`${data?.products ?? 0} products`}
          icon={Package}
        />
      </section>
      <section className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-head">
            <div>
              <h2>Revenue trend</h2>
              <p>Daily Shopify order revenue</p>
            </div>
            <span className="live-badge">
              <i />
              Live
            </span>
          </div>
          <div className="chart-value">
            <strong>{data ? money(data.revenue) : "Loading…"}</strong>
            <span>{data?.orders ?? 0} orders</span>
          </div>
          <div className="live-chart">
            {data?.dailyRevenue.map((day) => (
              <div key={day.date} title={`${day.date}: ${money(day.value)}`}>
                <i
                  style={{ height: `${Math.max(3, (day.value / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
        <div className="card setup-card">
          <div className="card-head">
            <div>
              <h2>Bundle health</h2>
              <p>Stored in Shopify Metaobjects</p>
            </div>
            <span className="metric-icon">
              <Gift size={20} />
            </span>
          </div>
          <div className="health-number">
            <strong>{data?.activeBundles ?? "…"}</strong>
            <span>active bundles</span>
          </div>
          <div className="check-row">
            <span className="done">
              <Check size={14} />
            </span>
            <div>
              <strong>Shopify catalog connected</strong>
              <small>{data?.products ?? 0} products synchronized</small>
            </div>
          </div>
          <div className="check-row">
            <span className="done">
              <Check size={14} />
            </span>
            <div>
              <strong>Orders connected</strong>
              <small>{data?.orders ?? 0} orders in this period</small>
            </div>
          </div>
          <button
            className="secondary full-button"
            onClick={() => navigate("bundles")}
          >
            Manage bundles <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Package;
}) {
  return (
    <div className="card metric">
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <b>↗ {trend}</b> from last month
      </small>
    </div>
  );
}

function BundleTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bundle</th>
            <th>Type</th>
            <th>Products</th>
            <th>Revenue</th>
            <th>Orders</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {existingBundles.slice(0, compact ? 3 : 10).map((b, i) => (
            <tr key={b.name}>
              <td>
                <div className="bundle-cell">
                  <span className={`bundle-thumb t${i}`}>
                    <Gift size={19} />
                  </span>
                  <strong>{b.name}</strong>
                </div>
              </td>
              <td>{b.type}</td>
              <td>{b.products}</td>
              <td>
                <strong>{b.revenue}</strong>
              </td>
              <td>{b.orders}</td>
              <td>
                <span className={`status ${b.status.toLowerCase()}`}>
                  {b.status}
                </span>
              </td>
              <td>
                <button className="icon-button">
                  <span className="dots">•••</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BundlesPage({ create }: { create: () => void }) {
  const [query, setQuery] = useState("");
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CATALOG</p>
          <h1>Bundles</h1>
          <p>Create and manage product offers for your store.</p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={18} />
          Create bundle
        </button>
      </div>
      <div className="card bundles-card">
        <div className="tabs">
          <button className="active">
            All <span>3</span>
          </button>
          <button>
            Active <span>2</span>
          </button>
          <button>
            Draft <span>1</span>
          </button>
        </div>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bundles"
            />
          </div>
          <button className="secondary">
            <SlidersHorizontal size={17} />
            Filter
          </button>
        </div>
        <BundleTable />
        <div className="pagination">
          <span>Showing 1–3 of 3 bundles</span>
          <div>
            <button disabled>
              <ChevronLeft size={16} />
            </button>
            <button>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveBundleTable({
  bundles,
  onEdit,
  onDelete,
}: {
  bundles: BundleRecord[];
  onEdit: (bundle: BundleRecord) => void;
  onDelete: (bundle: BundleRecord) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bundle</th>
            <th>Type</th>
            <th>Products</th>
            <th>Discount</th>
            <th>Updated</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle, index) => (
            <tr key={bundle.id}>
              <td>
                <div className="bundle-cell">
                  <span className={`bundle-thumb t${index % 3}`}>
                    <Gift size={19} />
                  </span>
                  <strong>{bundle.name}</strong>
                </div>
              </td>
              <td>{bundle.type}</td>
              <td>{bundle.products}</td>
              <td>
                <strong>{bundle.discount}%</strong>
              </td>
              <td>{new Date(bundle.updatedAt).toLocaleDateString()}</td>
              <td>
                <span className={`status ${bundle.status.toLowerCase()}`}>
                  {bundle.status}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button className="secondary" onClick={() => onEdit(bundle)}>
                    Edit
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={`Delete ${bundle.name}`}
                    onClick={() => onDelete(bundle)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveBundlesPage({
  create,
  edit,
  initialBundles,
}: {
  create: () => void;
  edit: (bundle: BundleRecord) => void;
  initialBundles: BundleRecord[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"All" | "Active" | "Draft">("All");
  const [bundles, setBundles] = useState<BundleRecord[]>(initialBundles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    fetch("/api/bundles")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setBundles(data.bundles);
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load bundles"))
      .finally(() => setLoading(false));
  };
  const remove = async (bundle: BundleRecord) => {
    if (!window.confirm(`Delete “${bundle.name}”? This cannot be undone.`))
      return;
    const response = await fetch(
      `/api/bundles/${encodeURIComponent(bundle.id)}`,
      { method: "DELETE" },
    );
    if (response.ok)
      setBundles((current) => current.filter((item) => item.id !== bundle.id));
    else setError((await response.json()).error || "Unable to delete bundle");
  };
  const filtered = bundles.filter(
    (bundle) =>
      (tab === "All" || bundle.status === tab) &&
      bundle.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHOPIFY CATALOG</p>
          <h1>Bundles</h1>
          <p>Create and manage offers stored directly in your Shopify admin.</p>
        </div>
        <button className="primary" onClick={create}>
          <Plus size={18} />
          Create bundle
        </button>
      </div>
      <div className="card bundles-card">
        <div className="tabs">
          <button
            className={tab === "All" ? "active" : ""}
            onClick={() => setTab("All")}
          >
            All <span>{bundles.length}</span>
          </button>
          <button
            className={tab === "Active" ? "active" : ""}
            onClick={() => setTab("Active")}
          >
            Active{" "}
            <span>{bundles.filter((b) => b.status === "Active").length}</span>
          </button>
          <button
            className={tab === "Draft" ? "active" : ""}
            onClick={() => setTab("Draft")}
          >
            Draft{" "}
            <span>{bundles.filter((b) => b.status === "Draft").length}</span>
          </button>
        </div>
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bundles"
            />
          </div>
          <button className="secondary" onClick={load}>
            <Clock3 size={17} />
            Refresh
          </button>
        </div>
        {error && (
          <div className="api-error">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="table-loading">Loading bundles from Shopify…</div>
        ) : filtered.length ? (
          <LiveBundleTable bundles={filtered} onEdit={edit} onDelete={remove} />
        ) : (
          <div className="table-empty">
            <Package size={28} />
            <strong>No bundles found</strong>
            <span>Create a bundle to save it directly in Shopify.</span>
            <button className="primary" onClick={create}>
              <Plus size={17} />
              Create bundle
            </button>
          </div>
        )}
        <div className="pagination">
          <span>
            Showing {filtered.length} of {bundles.length} bundles
          </span>
        </div>
      </div>
    </div>
  );
}

function ProductVisual({ product }: { product: CatalogProduct }) {
  return (
    <span className="product-image" style={{ background: product.color }}>
      {product.image ? (
        <Image src={product.image} alt="" width={48} height={48} />
      ) : (
        product.emoji
      )}
    </span>
  );
}

/* ProductModal is lazy-loaded from components/bundle-editor/product-modal.
function ProductModal({
  catalog,
  initialCursor,
  selected,
  onApply,
  onProductsLoaded,
  close,
}: {
  catalog: CatalogProduct[];
  initialCursor: string | null;
  selected: string[];
  onApply: (x: string[]) => void;
  onProductsLoaded: (products: CatalogProduct[]) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState(selected);
  const [results, setResults] = useState(catalog);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState("");
  const initialCatalogRef = useRef(catalog);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus(); };
  }, [close]);
  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) { setResults(initialCatalogRef.current); setNextCursor(initialCursor); setProductError(""); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingProducts(true); setProductError("");
      try {
        const response = await fetch(`/api/shopify/products?query=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to search products");
        setResults(data.products); setNextCursor(data.nextCursor); onProductsLoaded(data.products);
      } catch (error) { if (!controller.signal.aborted) setProductError(error instanceof Error ? error.message : "Unable to search products"); }
      finally { if (!controller.signal.aborted) setLoadingProducts(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [initialCursor, onProductsLoaded, query]);
  const loadMore = async () => {
    if (!nextCursor || loadingProducts) return;
    setLoadingProducts(true); setProductError("");
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      if (query.trim()) params.set("query", query.trim());
      const response = await fetch(`/api/shopify/products?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load more products");
      setResults((current) => [...current, ...data.products]); setNextCursor(data.nextCursor); onProductsLoaded(data.products);
    } catch (error) { setProductError(error instanceof Error ? error.message : "Unable to load more products"); }
    finally { setLoadingProducts(false); }
  };
  const toggle = (id: string) =>
    setDraftSelected(
      draftSelected.includes(id)
        ? draftSelected.filter((x) => x !== id)
        : [...draftSelected, id],
    );
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" ref={dialogRef}>
        <div className="modal-head">
          <div>
            <h2 id="product-modal-title">Select products</h2>
            <p>Choose products or individual variants for this bundle.</p>
          </div>
          <button className="icon-button" onClick={close}>
            <X size={21} />
          </button>
        </div>
        <div className="modal-body">
          <div className="product-pane">
            <div className="modal-search">
              <div className="search-box">
                <Search size={17} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products"
                />
              </div>
              <button className="secondary">
                <SlidersHorizontal size={17} />
                Filter
              </button>
            </div>
            <div className="product-list">
              {results.map((p) => (
                <label
                  className={`product-row ${draftSelected.includes(p.id) ? "selected" : ""} ${p.available === false ? "unavailable" : ""}`}
                  key={p.id}
                >
                  <input
                    type="checkbox"
                    checked={draftSelected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    disabled={p.available === false && !draftSelected.includes(p.id)}
                  />
                  <ProductVisual product={p} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.vendor}</small>
                    <p>
                      <span className={p.available !== false ? "active-stock" : "no-stock"}>
                        {p.available !== false ? "Available" : "Unavailable"}
                      </span>{" "}
                      {p.stock > 0 ? `${p.stock} in stock` : "Inventory not available"}
                    </p>
                  </div>
                  <b>${p.price.toFixed(2)}</b>
                </label>
              ))}
              {loadingProducts && <div className="table-loading">Loading products…</div>}
              {productError && <div className="api-error">{productError}</div>}
              {!loadingProducts && !productError && results.length === 0 && <div className="table-empty"><strong>No products found</strong></div>}
              {nextCursor && !loadingProducts && <button type="button" className="secondary product-load-more" onClick={loadMore}>Load more products</button>}
            </div>
          </div>
          <aside className="selection-pane">
            <div>
              <h3>Selected</h3>
              <p>{draftSelected.length} products</p>
            </div>
            <div className="selected-list">
              {draftSelected.length === 0 ? (
                <div className="empty-mini">
                  <Package size={25} />
                  <p>No products selected</p>
                </div>
              ) : (
                catalog
                  .filter((p) => draftSelected.includes(p.id))
                  .map((p) => (
                    <div key={p.id}>
                      <ProductVisual product={p} />
                      <div>
                        <strong>{p.name}</strong>
                        <small>All variants</small>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => toggle(p.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </aside>
        </div>
        <div className="modal-footer">
          <span>
            {draftSelected.length} product{draftSelected.length !== 1 ? "s" : ""} selected
          </span>
          <div>
            <button className="secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => { onApply(draftSelected); close(); }}
              disabled={!draftSelected.length}
            >
              Add to bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
*/

const ProductModal = dynamic(
  () => import("@/components/bundle-editor/product-modal"),
  { ssr: false },
);

const barTypeOptions: Array<{
  value: NonNullable<DealBar["offerType"]>;
  label: string;
  icon: typeof Package;
}> = [
  { value: "quantity_break", label: "Quantity break", icon: TrendingUp },
  { value: "buy_x_get_y", label: "Buy X, get Y", icon: Gift },
  { value: "product_bundle", label: "Product bundle", icon: Package },
  { value: "mix_match", label: "Mix & Match", icon: Boxes },
  { value: "alternative_product", label: "Alternative product", icon: Tag },
];

function DealBarsEditor({
  bars,
  setBars,
  expandedBar,
  setExpandedBar,
  updateBar,
}: {
  bars: DealBar[];
  setBars: React.Dispatch<React.SetStateAction<DealBar[]>>;
  expandedBar: string | null;
  setExpandedBar: (id: string | null) => void;
  updateBar: (id: string, patch: Partial<DealBar>) => void;
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addBar = (offerType: NonNullable<DealBar["offerType"]>) => {
    const bar = makeDealBar(bars.length, offerType);
    const titleByType: Record<NonNullable<DealBar["offerType"]>, string> = {
      quantity_break: `Buy ${bars.length + 1}+ items`,
      buy_x_get_y: bar.title,
      product_bundle: "Bundle & save",
      mix_match: "Choose your items",
      alternative_product: "Choose an alternative",
    };
    const prepared = { ...bar, title: titleByType[offerType] };
    setBars((items) => [...items, prepared]);
    setExpandedBar(prepared.id);
    setAddMenuOpen(false);
  };
  return (
    <div className="deal-bars">
      {bars.map((bar, index) => {
        const open = expandedBar === bar.id;
        const offerType = bar.offerType || "buy_x_get_y";
        const meta =
          barTypeOptions.find((option) => option.value === offerType) ||
          barTypeOptions[1];
        const TypeIcon = meta.icon;
        return (
          <div className={`deal-bar ${open ? "open" : ""}`} key={bar.id}>
            <div className="deal-bar__summary">
              <span className="drag">⠿</span>
              <button
                type="button"
                onClick={() => setExpandedBar(open ? null : bar.id)}
              >
                <ChevronRight size={16} />
                <TypeIcon size={16} />
                <strong>
                  Bar #{index + 1} · {meta.label} · {bar.title}
                </strong>
              </button>
              <button
                type="button"
                className="bar-delete"
                aria-label="Delete bar"
                onClick={() =>
                  setBars((items) => items.filter((item) => item.id !== bar.id))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
            {open && (
              <div className="deal-bar__body">
                <label className="bar-type-select">
                  Offer type
                  <select
                    value={offerType}
                    onChange={(event) =>
                      updateBar(bar.id, {
                        offerType: event.target.value as DealBar["offerType"],
                      })
                    }
                  >
                    {barTypeOptions.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {offerType === "buy_x_get_y" && (
                  <>
                    <div className="deal-bar-grid buy-row">
                      <label>
                        Buy
                        <input
                          type="number"
                          min="1"
                          value={bar.buyQuantity}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              buyQuantity: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Price
                        <select
                          value={bar.buyPriceMethod}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              buyPriceMethod: e.target
                                .value as DealBar["buyPriceMethod"],
                            })
                          }
                        >
                          <option value="full_price">Full price</option>
                          <option value="percentage_off">Percentage off</option>
                          <option value="fixed_price">Fixed price</option>
                        </select>
                      </label>
                    </div>
                    <div className="deal-bar-grid get-row">
                      <label>
                        Get
                        <input
                          type="number"
                          min="0"
                          value={bar.getQuantity}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              getQuantity: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Price
                        <select
                          value={bar.getPriceMethod}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              getPriceMethod: e.target
                                .value as DealBar["getPriceMethod"],
                            })
                          }
                        >
                          <option value="percentage_off">Percentage off</option>
                          <option value="fixed_price">Fixed price</option>
                          <option value="free">Free</option>
                        </select>
                      </label>
                      <label>
                        Discount per item
                        <div className="input-affix">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bar.getDiscount}
                            onChange={(e) =>
                              updateBar(bar.id, {
                                getDiscount: Number(e.target.value),
                              })
                            }
                          />
                          <span>%</span>
                        </div>
                      </label>
                    </div>
                  </>
                )}
                {offerType === "quantity_break" && (
                  <div className="deal-bar-grid text-row">
                    <label>
                      Minimum quantity
                      <input
                        type="number"
                        min="1"
                        value={bar.buyQuantity}
                        onChange={(e) =>
                          updateBar(bar.id, {
                            buyQuantity: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </label>
                    <label>
                      Discount
                      <div className="input-affix">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bar.getDiscount}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              getDiscount: Number(e.target.value),
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </div>
                )}
                {offerType === "product_bundle" && (
                  <div className="deal-bar-grid text-row">
                    <label>
                      Bundle quantity
                      <input
                        type="number"
                        min="1"
                        value={bar.buyQuantity}
                        onChange={(e) =>
                          updateBar(bar.id, {
                            buyQuantity: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </label>
                    <label>
                      Bundle discount
                      <div className="input-affix">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bar.getDiscount}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              getDiscount: Number(e.target.value),
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </div>
                )}
                {offerType === "mix_match" && (
                  <div className="deal-bar-grid text-row">
                    <label>
                      Items customers must choose
                      <input
                        type="number"
                        min="1"
                        value={bar.buyQuantity}
                        onChange={(e) =>
                          updateBar(bar.id, {
                            buyQuantity: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </label>
                    <label>
                      Discount
                      <div className="input-affix">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={bar.getDiscount}
                          onChange={(e) =>
                            updateBar(bar.id, {
                              getDiscount: Number(e.target.value),
                            })
                          }
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </div>
                )}
                {offerType === "alternative_product" && (
                  <div className="bar-callout">
                    <Tag size={16} />
                    <span>
                      Customers choose one alternative from the products
                      selected above.
                    </span>
                  </div>
                )}
                <div className="deal-bar-grid text-row">
                  <label>
                    Title
                    <input
                      value={bar.title}
                      onChange={(e) =>
                        updateBar(bar.id, { title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Subtitle
                    <input
                      value={bar.subtitle}
                      onChange={(e) =>
                        updateBar(bar.id, { subtitle: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="bar-label">
                  Label
                  <input
                    value={bar.label}
                    onChange={(e) =>
                      updateBar(bar.id, { label: e.target.value })
                    }
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={bar.applySellingPlan}
                    onChange={(e) =>
                      updateBar(bar.id, { applySellingPlan: e.target.checked })
                    }
                  />
                  Apply selling plan
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={bar.selectedByDefault}
                    onChange={(e) =>
                      updateBar(bar.id, { selectedByDefault: e.target.checked })
                    }
                  />
                  Selected by default
                </label>
                <div className="bar-tools">
                  <button
                    type="button"
                    className={bar.imageMode === "upload" ? "active" : ""}
                    onClick={() => updateBar(bar.id, { imageMode: "upload" })}
                  >
                    ▧ Add image
                  </button>
                  <button
                    type="button"
                    className={bar.imageMode === "featured" ? "active" : ""}
                    onClick={() => updateBar(bar.id, { imageMode: "featured" })}
                  >
                    <Tag size={14} /> Featured image
                  </button>
                  <button
                    type="button"
                    className={bar.upsellEnabled ? "active" : ""}
                    onClick={() =>
                      updateBar(bar.id, { upsellEnabled: !bar.upsellEnabled })
                    }
                  >
                    <Plus size={14} /> Add upsell
                  </button>
                  <button
                    type="button"
                    className={bar.giftEnabled ? "active" : ""}
                    onClick={() =>
                      updateBar(bar.id, { giftEnabled: !bar.giftEnabled })
                    }
                  >
                    <Gift size={14} /> Add gift
                  </button>
                  <button
                    type="button"
                    className={bar.personalizationEnabled ? "active" : ""}
                    onClick={() =>
                      updateBar(bar.id, {
                        personalizationEnabled: !bar.personalizationEnabled,
                      })
                    }
                  >
                    ✎ Add personalisation
                  </button>
                  <button
                    type="button"
                    className={bar.highlightsEnabled ? "active" : ""}
                    onClick={() =>
                      updateBar(bar.id, {
                        highlightsEnabled: !bar.highlightsEnabled,
                      })
                    }
                  >
                    ▦ Add highlights
                  </button>
                </div>
                <label className="sold-out-row">
                  <strong>Show as Sold out</strong>
                  <input
                    type="checkbox"
                    checked={bar.soldOut}
                    onChange={(e) =>
                      updateBar(bar.id, { soldOut: e.target.checked })
                    }
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
      <div className="add-bar-wrap">
        <button
          className="add-bar"
          type="button"
          aria-expanded={addMenuOpen}
          onClick={() => setAddMenuOpen((open) => !open)}
        >
          <Plus size={15} /> Add bar
        </button>
        {addMenuOpen && (
          <div className="add-bar-menu">
            {barTypeOptions.map(({ value, label, icon: Icon }) => (
              <button type="button" key={value} onClick={() => addBar(value)}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingCheck({
  label,
  checked,
  onChange,
  hint = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: boolean;
}) {
  return (
    <label className="settings-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
      {hint && <CircleHelp size={14} />}
    </label>
  );
}

export function BundleRulesEditor({
  type,
  discount,
  setDiscount,
  settings,
  updateSettings,
  bars,
  setBars,
  updateBar,
}: {
  type: BundleType;
  discount: string;
  setDiscount: (value: string) => void;
  settings: BundleSettings;
  updateSettings: <K extends keyof BundleSettings>(
    key: K,
    value: BundleSettings[K],
  ) => void;
  bars: DealBar[];
  setBars: React.Dispatch<React.SetStateAction<DealBar[]>>;
  updateBar: (id: string, patch: Partial<DealBar>) => void;
}) {
  if (type === "Buy X get Y") return null;
  if (type === "Volume discount")
    return (
      <details className="setting-panel" open>
        <summary>
          <span>
            <TrendingUp size={17} />
            Volume tiers
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="setting-panel__body type-rules">
          <p className="rule-help">
            Set a larger discount as the purchased quantity increases.
          </p>
          {bars.map((bar, index) => (
            <div className="tier-row" key={bar.id}>
              <span>Tier {index + 1}</span>
              <label>
                Minimum quantity
                <input
                  type="number"
                  min="1"
                  value={bar.buyQuantity}
                  onChange={(event) =>
                    updateBar(bar.id, {
                      buyQuantity: Math.max(1, Number(event.target.value)),
                    })
                  }
                />
              </label>
              <label>
                Discount
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bar.getDiscount}
                  onChange={(event) =>
                    updateBar(bar.id, {
                      getDiscount: Math.min(
                        100,
                        Math.max(0, Number(event.target.value)),
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="icon-button danger"
                aria-label="Remove tier"
                onClick={() =>
                  setBars((items) => items.filter((item) => item.id !== bar.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-bar"
            onClick={() =>
              setBars((items) => [
                ...items,
                {
                  ...makeDealBar(items.length),
                  getQuantity: 0,
                  getDiscount: Math.min(
                    100,
                    (items.at(-1)?.getDiscount ?? 0) + 5,
                  ),
                  title: `Buy ${items.length + 1}+`,
                },
              ])
            }
          >
            <Plus size={15} />
            Add volume tier
          </button>
        </div>
      </details>
    );
  if (type === "Mix & match" || type === "Build your own")
    return (
      <details className="setting-panel" open>
        <summary>
          <span>
            <Boxes size={17} />
            Selection rules
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="setting-panel__body type-rules">
          <p className="rule-help">
            {type === "Mix & match"
              ? "Require customers to choose an exact number of items."
              : "Allow customers to build a bundle within a flexible range."}
          </p>
          {type === "Mix & match" ? (
            <label>
              Items required
              <input
                type="number"
                min="1"
                value={settings.exactItems}
                onChange={(event) =>
                  updateSettings(
                    "exactItems",
                    Math.max(1, Number(event.target.value)),
                  )
                }
              />
            </label>
          ) : (
            <div className="settings-columns">
              <label>
                Minimum items
                <input
                  type="number"
                  min="1"
                  value={settings.minimumItems}
                  onChange={(event) =>
                    updateSettings(
                      "minimumItems",
                      Math.max(1, Number(event.target.value)),
                    )
                  }
                />
              </label>
              <label>
                Maximum items
                <input
                  type="number"
                  min={settings.minimumItems}
                  value={settings.maximumItems}
                  onChange={(event) =>
                    updateSettings(
                      "maximumItems",
                      Math.max(
                        settings.minimumItems,
                        Number(event.target.value),
                      ),
                    )
                  }
                />
              </label>
            </div>
          )}
          <label>
            Bundle discount
            <div className="input-affix">
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
              <span>%</span>
            </div>
          </label>
          <SettingCheck
            label="Allow multiple units of the same product"
            checked={settings.differentVariants}
            onChange={(value) => updateSettings("differentVariants", value)}
          />
        </div>
      </details>
    );
  return (
    <details className="setting-panel" open>
      <summary>
        <span>
          {type === "Fixed bundle" ? (
            <Package size={17} />
          ) : (
            <ShoppingBag size={17} />
          )}
          {type === "Fixed bundle" ? "Bundle pricing" : "Recommendation offer"}
        </span>
        <ChevronDown size={17} />
      </summary>
      <div className="setting-panel__body type-rules">
        <p className="rule-help">
          {type === "Fixed bundle"
            ? "All selected products are purchased together."
            : "Offer the selected complementary products together."}
        </p>
        <label>
          Percentage discount
          <div className="input-affix">
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
            <span>%</span>
          </div>
        </label>
        {type === "Frequently bought together" && (
          <SettingCheck
            label="Let customers deselect recommended products"
            checked={settings.differentVariants}
            onChange={(value) => updateSettings("differentVariants", value)}
          />
        )}
      </div>
    </details>
  );
}

function StyleColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="style-color">
      <span>{label}</span>
      <span className="style-color__input">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color`}
        />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function StyleColorGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="style-color-group">
      <h5>{title}</h5>
      <div>{children}</div>
    </section>
  );
}

function CreateWizard({
  back,
  existing,
  initialCatalog,
  initialCatalogCursor,
}: {
  back: () => void;
  existing?: BundleRecord | null;
  initialCatalog: CatalogProduct[];
  initialCatalogCursor: string | null;
}) {
  const [step, setStep] = useState(existing ? 1 : 0);
  const [type, setType] = useState<BundleType | null>(existing?.type ?? null);
  const [selected, setSelected] = useState<string[]>(
    existing?.productIds ?? [],
  );
  const [catalog, setCatalog] = useState<CatalogProduct[]>(initialCatalog);
  const mergeCatalog = useCallback(
    (incoming: CatalogProduct[]) =>
      setCatalog((current) => {
        const merged = new Map(current.map((product) => [product.id, product]));
        incoming.forEach((product) => merged.set(product.id, product));
        return [...merged.values()];
      }),
    [],
  );
  const [catalogSource] = useState<"loading" | "shopify" | "demo">("shopify");
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState(existing?.name ?? "");
  const [discount, setDiscount] = useState(String(existing?.discount ?? 15));
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [accent, setAccent] = useState(
    existing?.configuration?.accent ?? "#161616",
  );
  const [bundleStyle, setBundleStyle] = useState<BundleStyle>({
    ...defaultBundleStyle(),
    ...existing?.configuration?.style,
  });
  const updateStyle = <K extends keyof BundleStyle>(
    key: K,
    value: BundleStyle[K],
  ) => setBundleStyle((current) => ({ ...current, [key]: value }));
  const [freeShipping] = useState(
    existing?.configuration?.freeShipping ?? true,
  );
  const [bundleSettings, setBundleSettings] = useState<BundleSettings>({
    ...defaultBundleSettings(),
    ...existing?.configuration?.settings,
  });
  const updateSettings = <K extends keyof BundleSettings>(
    key: K,
    value: BundleSettings[K],
  ) => setBundleSettings((current) => ({ ...current, [key]: value }));
  const [bars, setBars] = useState<DealBar[]>(
    existing?.configuration?.bars?.length
      ? existing.configuration.bars
      : makeBarsForType(existing?.type ?? "Buy X get Y"),
  );
  const [expandedBar, setExpandedBar] = useState<string | null>(
    existing?.configuration?.bars?.[0]?.id ?? null,
  );
  const updateBar = (id: string, patch: Partial<DealBar>) =>
    setBars((current) =>
      current.map((bar) => {
        if (bar.id !== id)
          return patch.selectedByDefault
            ? { ...bar, selectedByDefault: false }
            : bar;
        return { ...bar, ...patch };
      }),
    );
  const canNext =
    step === 0
      ? !!type
      : step === 1
        ? selected.length > 0
        : step === 2
          ? !!discount
          : true;
  const chosen = useMemo(() => {
    const selectedIds = new Set(selected);
    return catalog.filter((product) => selectedIds.has(product.id));
  }, [catalog, selected]);
  const previewOptions = useMemo(() => {
    const unitPrice = chosen[0]?.price ?? 49;
    const productPrices = chosen.length
      ? chosen.map((product) => product.price)
      : [unitPrice];

    return (bars.length ? bars : [null]).map((bar, index) => {
      const offerType =
        bar?.offerType ||
        (type === "Volume discount"
          ? "quantity_break"
          : type === "Buy X get Y"
            ? "buy_x_get_y"
            : "product_bundle");
      const percentOff = (bar?.getDiscount ?? Number(discount)) || 0;
      const priceResult =
        offerType === "quantity_break" && bar
          ? calculateQuantityBreakPrice(unitPrice, bar.buyQuantity, percentOff)
          : offerType === "buy_x_get_y" && bar
            ? calculateBuyXGetYPrice(
                unitPrice,
                bar.buyQuantity,
                bar.getQuantity,
                bar.getPriceMethod === "free" ? 100 : percentOff,
              )
            : calculateProductBundlePrice(productPrices, percentOff);
      const previewTitle =
        offerType === "quantity_break" && bar
          ? `Buy ${bar.buyQuantity}+ items`
          : bar?.title || title || type;

      return {
        bar,
        key: bar?.id || `preview-${index}`,
        label: bar
          ? bar.label.replace(
              "{{saved_percentage}}",
              `${priceResult.savingsPercent}%`,
            )
          : `SAVE ${priceResult.savingsPercent}%`,
        previewTitle,
        price: priceResult.price,
        comparePrice: priceResult.regular,
      };
    });
  }, [bars, chosen, discount, title, type]);
  /* Initial catalog data is server-rendered. Legacy client bootstrap retained only
     as migration context and excluded from the compiled runtime.
  useEffect(() => {
    if (initialCatalog) return;
    let active = true;
    fetch("/api/shopify/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("Shopify catalog unavailable");
        return response.json();
      })
      .then((data: { products: CatalogProduct[] }) => {
        if (!active) return;
        if (data.products?.length) {
          setCatalog(
            data.products.map((product) => ({
              ...product,
              color: "#e6eee9",
              emoji: "📦",
            })),
          );
          setCatalogSource("shopify");
        } else {
          setCatalogSource("demo");
        }
      })
      .catch(() => active && setCatalogSource("demo"));
    return () => {
      active = false;
    };
  }, [initialCatalog]);
  */
  const saveBundle = async (status: "Active" | "Draft") => {
    if (!type) return;
    setSaving(true);
    setSaveError("");
    setSaveNotice("");
    try {
      const response = await fetch(
        existing
          ? `/api/bundles/${encodeURIComponent(existing.id)}`
          : "/api/bundles",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: title.trim() || `${type} bundle`,
            bundleType: type,
            productIds: selected,
            discount: Number(discount) || 0,
            status,
            configuration: {
              bars,
              accent,
              style: bundleStyle,
              freeShipping,
              settings: bundleSettings,
            },
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save bundle");
      if (existing) {
        setSaveNotice(
          status === "Active"
            ? "Bundle updated successfully."
            : "Draft saved successfully.",
        );
        window.setTimeout(() => setSaveNotice(""), 3500);
      } else if (status === "Active") setPublished(true);
      else back();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save bundle",
      );
    } finally {
      setSaving(false);
    }
  };
  if (published)
    return (
      <div className="content success-page">
        <div className="success-icon">
          <Check size={34} />
        </div>
        <p className="eyebrow">BUNDLE PUBLISHED</p>
        <h1>{title || "Your new bundle"} is live!</h1>
        <p>Customers can now see this offer in your Shopify storefront.</p>
        <div>
          <button className="secondary" onClick={back}>
            View bundles
          </button>
          <button
            className="primary"
            onClick={() => {
              setPublished(false);
              setStep(0);
            }}
          >
            Create another
          </button>
        </div>
      </div>
    );
  if (step > 0) {
    return (
      <div className="deal-editor">
        <header className="deal-editor__topbar">
          <div>
            <button className="icon-button" onClick={back}>
              <ArrowLeft size={19} />
            </button>
            <strong>{existing ? "Edit bundle deal" : "Bundle deal"}</strong>
          </div>
          <button className="secondary">
            <span>文</span> Translations
          </button>
        </header>
        <div className="deal-editor__grid">
          <section className="deal-settings">
            <details className="setting-panel" open>
              <summary>
                <span>
                  <Package size={17} />
                  Products
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="setting-panel__body">
                <div className="catalog-status">
                  <i
                    className={catalogSource === "shopify" ? "connected" : ""}
                  />
                  {catalogSource === "loading"
                    ? "Syncing Shopify…"
                    : catalogSource === "shopify"
                      ? "Shopify catalog connected"
                      : "Using demo catalog"}
                </div>
                <button
                  className="select-products-wide"
                  onClick={() => setModal(true)}
                >
                  <Plus size={17} />
                  {selected.length
                    ? `Change products (${selected.length})`
                    : "Select products"}
                </button>
              </div>
            </details>
            <details className="setting-panel" open>
              <summary>
                <span>
                  <Settings size={17} />
                  Settings
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="setting-panel__body bundle-settings-form">
                <label>
                  Name (only visible for you)
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${type} bundle`}
                  />
                </label>
                <label>
                  Block title
                  <input
                    value={bundleSettings.blockTitle}
                    onChange={(e) =>
                      updateSettings("blockTitle", e.target.value)
                    }
                  />
                </label>
                <label>
                  Discount name (shown in cart/checkout)
                  <input
                    value={bundleSettings.discountName}
                    onChange={(e) =>
                      updateSettings("discountName", e.target.value)
                    }
                  />
                </label>

                <fieldset>
                  <legend>Visibility</legend>
                  <label>
                    Markets
                    <select
                      value={bundleSettings.markets}
                      onChange={(e) =>
                        updateSettings("markets", e.target.value)
                      }
                    >
                      <option value="all">All</option>
                      <option value="primary">Primary market</option>
                      <option value="international">International</option>
                    </select>
                  </label>
                  <SettingCheck
                    label="Exclude markets"
                    checked={bundleSettings.excludeMarkets}
                    onChange={(value) =>
                      updateSettings("excludeMarkets", value)
                    }
                  />
                  <SettingCheck
                    label="Exclude B2B customers"
                    hint
                    checked={bundleSettings.excludeB2B}
                    onChange={(value) => updateSettings("excludeB2B", value)}
                  />
                  <SettingCheck
                    label="Apply discount only via bundle widget"
                    hint
                    checked={bundleSettings.widgetOnly}
                    onChange={(value) => updateSettings("widgetOnly", value)}
                  />
                </fieldset>

                <fieldset>
                  <legend>Active dates</legend>
                  <div className="settings-columns">
                    <label>
                      Start date
                      <input
                        type="date"
                        value={bundleSettings.startDate}
                        onChange={(e) =>
                          updateSettings("startDate", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Start time (GMT+7)
                      <input
                        type="time"
                        value={bundleSettings.startTime}
                        onChange={(e) =>
                          updateSettings("startTime", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <SettingCheck
                    label="Set end date"
                    checked={bundleSettings.hasEndDate}
                    onChange={(value) => updateSettings("hasEndDate", value)}
                  />
                  {bundleSettings.hasEndDate && (
                    <div className="settings-columns">
                      <label>
                        End date
                        <input
                          type="date"
                          value={bundleSettings.endDate}
                          onChange={(e) =>
                            updateSettings("endDate", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        End time (GMT+7)
                        <input
                          type="time"
                          value={bundleSettings.endTime}
                          onChange={(e) =>
                            updateSettings("endTime", e.target.value)
                          }
                        />
                      </label>
                    </div>
                  )}
                </fieldset>

                <fieldset>
                  <legend>Variants</legend>
                  <SettingCheck
                    label="Let customers choose different variants for each item"
                    hint
                    checked={bundleSettings.differentVariants}
                    onChange={(value) =>
                      updateSettings("differentVariants", value)
                    }
                  />
                  <SettingCheck
                    label="Hide theme variant picker"
                    checked={bundleSettings.hideThemeVariantPicker}
                    onChange={(value) =>
                      updateSettings("hideThemeVariantPicker", value)
                    }
                  />
                  <SettingCheck
                    label="Hide unavailable variant options"
                    checked={bundleSettings.hideUnavailableVariants}
                    onChange={(value) =>
                      updateSettings("hideUnavailableVariants", value)
                    }
                  />
                  <SettingCheck
                    label="Don't update other products when a variant is selected"
                    checked={bundleSettings.dontUpdateOtherProducts}
                    onChange={(value) =>
                      updateSettings("dontUpdateOtherProducts", value)
                    }
                  />
                  <div className="settings-action-grid">
                    <button
                      type="button"
                      className={bundleSettings.swatchesEnabled ? "active" : ""}
                      onClick={() =>
                        updateSettings(
                          "swatchesEnabled",
                          !bundleSettings.swatchesEnabled,
                        )
                      }
                    >
                      ◩ Add swatches
                    </button>
                    <button
                      type="button"
                      className={
                        bundleSettings.defaultVariantsEnabled ? "active" : ""
                      }
                      onClick={() =>
                        updateSettings(
                          "defaultVariantsEnabled",
                          !bundleSettings.defaultVariantsEnabled,
                        )
                      }
                    >
                      <SlidersHorizontal size={14} /> Set default variants
                    </button>
                  </div>
                </fieldset>
              </div>
            </details>
            <details className="setting-panel">
              <summary>
                <span>
                  <SlidersHorizontal size={17} />
                  Style
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="setting-panel__body style-editor">
                <div
                  className="style-layout-picker"
                  role="radiogroup"
                  aria-label="Bundle layout"
                >
                  {(["stacked", "compact", "grid", "minimal"] as const).map(
                    (layout) => (
                      <button
                        key={layout}
                        type="button"
                        role="radio"
                        aria-checked={bundleStyle.layout === layout}
                        aria-label={`${layout} layout`}
                        className={
                          bundleStyle.layout === layout ? "active" : ""
                        }
                        onClick={() => updateStyle("layout", layout)}
                      >
                        <span
                          className={`layout-preview layout-preview--${layout}`}
                        >
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      </button>
                    ),
                  )}
                </div>
                <div className="style-range-grid">
                  <label>
                    <span>Corner radius</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={bundleStyle.cornerRadius}
                      onChange={(event) =>
                        updateStyle("cornerRadius", Number(event.target.value))
                      }
                    />
                    <output>{bundleStyle.cornerRadius}px</output>
                  </label>
                  <label>
                    <span>Spacing</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={bundleStyle.spacing}
                      onChange={(event) =>
                        updateStyle("spacing", Number(event.target.value))
                      }
                    />
                    <output>{bundleStyle.spacing}px</output>
                  </label>
                </div>
                <h4>Colors</h4>
                <StyleColorGroup title="General">
                  <StyleColor
                    label="Cards bg"
                    value={bundleStyle.cardsBg}
                    onChange={(value) => updateStyle("cardsBg", value)}
                  />
                  <StyleColor
                    label="Selected bg"
                    value={bundleStyle.selectedBg}
                    onChange={(value) => updateStyle("selectedBg", value)}
                  />
                  <StyleColor
                    label="Border color"
                    value={bundleStyle.borderColor}
                    onChange={(value) => {
                      updateStyle("borderColor", value);
                      setAccent(value);
                    }}
                  />
                  <StyleColor
                    label="Block title"
                    value={bundleStyle.blockTitle}
                    onChange={(value) => updateStyle("blockTitle", value)}
                  />
                </StyleColorGroup>
                <StyleColorGroup title="Price">
                  <StyleColor
                    label="Price"
                    value={bundleStyle.price}
                    onChange={(value) => updateStyle("price", value)}
                  />
                  <StyleColor
                    label="Full price"
                    value={bundleStyle.fullPrice}
                    onChange={(value) => updateStyle("fullPrice", value)}
                  />
                </StyleColorGroup>
                <StyleColorGroup title="Badge">
                  <StyleColor
                    label="Background"
                    value={bundleStyle.badgeBg}
                    onChange={(value) => updateStyle("badgeBg", value)}
                  />
                  <StyleColor
                    label="Text"
                    value={bundleStyle.badgeText}
                    onChange={(value) => updateStyle("badgeText", value)}
                  />
                </StyleColorGroup>
                <StyleColorGroup title="Free gift">
                  <StyleColor
                    label="Background"
                    value={bundleStyle.freeGiftBg}
                    onChange={(value) => updateStyle("freeGiftBg", value)}
                  />
                  <StyleColor
                    label="Text"
                    value={bundleStyle.freeGiftText}
                    onChange={(value) => updateStyle("freeGiftText", value)}
                  />
                  <StyleColor
                    label="Selected bg"
                    value={bundleStyle.freeGiftSelectedBg}
                    onChange={(value) =>
                      updateStyle("freeGiftSelectedBg", value)
                    }
                  />
                  <StyleColor
                    label="Selected text"
                    value={bundleStyle.freeGiftSelectedText}
                    onChange={(value) =>
                      updateStyle("freeGiftSelectedText", value)
                    }
                  />
                </StyleColorGroup>
                <StyleColorGroup title="Upsell">
                  <StyleColor
                    label="Background"
                    value={bundleStyle.upsellBg}
                    onChange={(value) => updateStyle("upsellBg", value)}
                  />
                  <StyleColor
                    label="Text"
                    value={bundleStyle.upsellText}
                    onChange={(value) => updateStyle("upsellText", value)}
                  />
                  <StyleColor
                    label="Selected bg"
                    value={bundleStyle.upsellSelectedBg}
                    onChange={(value) => updateStyle("upsellSelectedBg", value)}
                  />
                  <StyleColor
                    label="Selected text"
                    value={bundleStyle.upsellSelectedText}
                    onChange={(value) =>
                      updateStyle("upsellSelectedText", value)
                    }
                  />
                </StyleColorGroup>
              </div>
            </details>
            <DealBarsEditor
              bars={bars}
              setBars={setBars}
              expandedBar={expandedBar}
              setExpandedBar={setExpandedBar}
              updateBar={updateBar}
            />
          </section>
          <aside className="deal-preview">
            <div className="deal-preview__head">
              <div>
                <strong>Preview</strong>
                <span>↗</span>
              </div>
              <button className="secondary">
                <Zap size={16} />
                Setup A/B test
              </button>
            </div>
            <div className="preview-controls">
              <label>
                Product previewing
                <select>
                  <option>{chosen[0]?.name || "Select products"}</option>
                </select>
              </label>
              <label>
                Country previewing
                <select>
                  <option>United States</option>
                </select>
              </label>
            </div>
            <div
              className={`bundle-preview bundle-preview--${bundleStyle.layout}`}
              style={
                {
                  "--preview-accent": accent,
                  "--preview-card-bg": bundleStyle.cardsBg,
                  "--preview-selected-bg": bundleStyle.selectedBg,
                  "--preview-border": bundleStyle.borderColor,
                  "--preview-title": bundleStyle.blockTitle,
                  "--preview-badge-bg": bundleStyle.badgeBg,
                  "--preview-badge-text": bundleStyle.badgeText,
                  "--preview-price": bundleStyle.price,
                  "--preview-full-price": bundleStyle.fullPrice,
                  "--preview-gift-bg": bundleStyle.freeGiftBg,
                  "--preview-gift-text": bundleStyle.freeGiftText,
                  "--preview-gift-selected-bg": bundleStyle.freeGiftSelectedBg,
                  "--preview-gift-selected-text":
                    bundleStyle.freeGiftSelectedText,
                  "--preview-radius": `${bundleStyle.cornerRadius}px`,
                  "--preview-spacing": `${bundleStyle.spacing}px`,
                } as React.CSSProperties
              }
            >
              <div className="bundle-preview__title">
                <i />
                {bundleSettings.blockTitle || "BUNDLE & SAVE"}
                <i />
              </div>
              {previewOptions.map(
                ({ bar, key, label, previewTitle, price, comparePrice }) => {
                  return (
                    <div
                      key={key}
                      className={`bundle-preview__option ${bar?.selectedByDefault || !bar ? "selected" : ""} ${bar?.soldOut ? "sold-out" : ""}`}
                    >
                      <div className="bundle-preview__deal">
                        <span className="preview-radio" />
                        <div>
                          <strong>{previewTitle}</strong>
                          {bar?.subtitle && <p>{bar.subtitle}</p>}
                        </div>
                        <em>{label}</em>
                        <b>
                          ${price.toFixed(2)}
                          <s>${comparePrice.toFixed(2)}</s>
                        </b>
                      </div>
                      {bar?.giftEnabled && (
                        <div className="bundle-preview__gift">
                          <Gift size={16} />
                          <strong>+ FREE special gift!</strong>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
              {!chosen.length && (
                <div className="preview-empty">
                  <Package size={25} />
                  Select products to preview your bundle
                </div>
              )}
            </div>
            {saveError && <div className="editor-error">{saveError}</div>}
            {saveNotice && (
              <div className="editor-notice">
                <Check size={16} />
                {saveNotice}
              </div>
            )}
            <div className="deal-preview__actions">
              <button
                className="secondary"
                disabled={saving || !type}
                onClick={() => saveBundle("Draft")}
              >
                {saving ? "Saving…" : "Save as draft"}
              </button>
              <button
                className="primary dark"
                disabled={saving || !type || !selected.length}
                onClick={() => saveBundle("Active")}
              >
                {saving ? "Publishing…" : existing ? "Update" : "Publish"}
              </button>
            </div>
          </aside>
        </div>
        {modal && (
          <ProductModal
            catalog={catalog}
            initialCursor={initialCatalogCursor}
            selected={selected}
            onApply={setSelected}
            onProductsLoaded={mergeCatalog}
            close={() => setModal(false)}
          />
        )}
      </div>
    );
  }
  return (
    <div className="wizard">
      <div className="wizard-head">
        <div className="wizard-title">
          <button
            className="icon-button"
            onClick={step ? () => setStep(step - 1) : back}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>Bundles</span>
            <h1>{existing ? "Edit bundle" : "Create new bundle"}</h1>
          </div>
        </div>
      </div>
      <div className="wizard-content">
        {step === 0 && (
          <>
            <div className="section-intro">
              <h2>Choose bundle type</h2>
              <p>
                Select the structure that best fits your merchandising strategy.
              </p>
            </div>
            <div className="type-grid">
              {bundleTypes.map(({ name, description, icon: Icon }) => (
                <button
                  key={name}
                  className={`type-card ${type === name ? "selected" : ""}`}
                  onClick={() => {
                    if (type !== name) {
                      const nextBars = makeBarsForType(name);
                      setBars(nextBars);
                      setExpandedBar(nextBars[0]?.id ?? null);
                    }
                    setType(name);
                  }}
                >
                  <span className="type-icon">
                    <Icon size={23} />
                  </span>
                  {type === name && (
                    <span className="chosen">
                      <Check size={14} />
                    </span>
                  )}
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <span className="select-label">
                    {type === name ? "Selected" : "Select type"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="section-intro">
              <p className="eyebrow">STEP 2 OF 6</p>
              <h2>Add products</h2>
              <p>
                Choose products from your{" "}
                {catalogSource === "shopify" ? "live Shopify" : "Shopify"}{" "}
                catalog.
              </p>
            </div>
            <div className="card products-card">
              <div className="card-head">
                <div>
                  <h2>Bundle products</h2>
                  <p>
                    {catalogSource === "loading"
                      ? "Syncing Shopify catalog…"
                      : catalogSource === "shopify"
                        ? `Live catalog · ${selected.length} selected`
                        : `Demo catalog · ${selected.length} selected`}
                  </p>
                </div>
                <button className="secondary" onClick={() => setModal(true)}>
                  <Plus size={17} />
                  Select products
                </button>
              </div>
              {chosen.length ? (
                <div className="chosen-products">
                  {chosen.map((p, i) => (
                    <div key={p.id}>
                      <span className="drag">⠿</span>
                      <ProductVisual product={p} />
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          ${p.price.toFixed(2)} · {p.stock} in stock
                        </small>
                      </div>
                      <label>
                        Qty <input type="number" min="1" defaultValue="1" />
                      </label>
                      <button
                        className="icon-button danger"
                        onClick={() =>
                          setSelected(selected.filter((x) => x !== p.id))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                      {i < chosen.length - 1 && (
                        <span className="plus-line">+</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>
                    <Package size={28} />
                  </span>
                  <h3>No products added</h3>
                  <p>
                    Select products from your Shopify catalog to get started.
                  </p>
                  <button className="primary" onClick={() => setModal(true)}>
                    <Plus size={17} />
                    Select products
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="section-intro">
              <p className="eyebrow">STEP 3 OF 6</p>
              <h2>Set bundle pricing</h2>
              <p>Choose how customers save when purchasing this bundle.</p>
            </div>
            <div className="form-grid">
              <div className="card form-card">
                <h3>Discount method</h3>
                <label className="radio-card">
                  <input type="radio" checked readOnly />
                  <span>
                    <strong>Percentage discount</strong>
                    <small>Take a percentage off the combined price.</small>
                  </span>
                </label>
                <label>
                  Discount value
                  <div className="input-affix">
                    <input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </label>
                <label>
                  Bundle title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer essentials"
                  />
                </label>
              </div>
              <div className="card summary-card">
                <p>PRICE PREVIEW</p>
                <div>
                  {chosen.map((p) => (
                    <span key={p.id}>
                      {p.name}
                      <b>${p.price.toFixed(2)}</b>
                    </span>
                  ))}
                </div>
                <hr />
                <span>
                  Regular price
                  <b>${chosen.reduce((s, p) => s + p.price, 0).toFixed(2)}</b>
                </span>
                <span className="saving">
                  Bundle discount
                  <b>
                    −$
                    {(
                      (chosen.reduce((s, p) => s + p.price, 0) *
                        (Number(discount) || 0)) /
                      100
                    ).toFixed(2)}
                  </b>
                </span>
                <span className="total">
                  Bundle price
                  <b>
                    $
                    {(
                      chosen.reduce((s, p) => s + p.price, 0) *
                      (1 - (Number(discount) || 0) / 100)
                    ).toFixed(2)}
                  </b>
                </span>
              </div>
            </div>
          </>
        )}
        {step >= 3 && step <= 4 && (
          <>
            <div className="section-intro">
              <p className="eyebrow">STEP {step + 1} OF 6</p>
              <h2>{step === 3 ? "Customize display" : "Set conditions"}</h2>
              <p>
                {step === 3
                  ? "Control how the bundle appears on your product pages."
                  : "Choose when and where this offer is available."}
              </p>
            </div>
            <div className="card form-card wide">
              <label>
                {step === 3 ? "Widget heading" : "Customer eligibility"}
                <input
                  defaultValue={
                    step === 3 ? "Complete the set & save" : "All customers"
                  }
                />
              </label>
              <label>
                {step === 3 ? "Call-to-action label" : "Markets"}
                <input
                  defaultValue={
                    step === 3 ? "Add bundle to cart" : "All markets"
                  }
                />
              </label>
              <label className="toggle-row">
                <div>
                  <strong>
                    {step === 3 ? "Show savings badge" : "No end date"}
                  </strong>
                  <small>
                    {step === 3
                      ? "Display the discount amount next to the price."
                      : "Keep this bundle active until manually disabled."}
                  </small>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <div className="section-intro">
              <p className="eyebrow">STEP 6 OF 6</p>
              <h2>Review and publish</h2>
              <p>Make sure everything looks good before going live.</p>
            </div>
            <div className="review-grid">
              <div className="card review-card">
                <span className="type-icon">
                  <Gift size={24} />
                </span>
                <div>
                  <small>BUNDLE</small>
                  <h2>{title || "Untitled bundle"}</h2>
                  <p>
                    {type} · {selected.length} products
                  </p>
                </div>
              </div>
              <div className="card review-list">
                <h3>Bundle summary</h3>
                <span>
                  Type<b>{type}</b>
                </span>
                <span>
                  Products<b>{selected.length}</b>
                </span>
                <span>
                  Discount<b>{discount}%</b>
                </span>
                <span>
                  Visibility<b>Online store</b>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      {saveError && <div className="save-error">{saveError}</div>}
      <div className="wizard-footer">
        <button
          className="secondary"
          disabled={saving || !type}
          onClick={() => saveBundle("Draft")}
        >
          {saving ? "Saving…" : "Save as draft"}
        </button>
        <div>
          {step > 0 && (
            <button className="secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button
            className="primary"
            disabled={!canNext || saving}
            onClick={() =>
              step === 5 ? saveBundle("Active") : setStep(step + 1)
            }
          >
            {step === 5
              ? saving
                ? "Publishing…"
                : existing
                  ? "Update bundle"
                  : "Publish bundle"
              : "Continue"}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      {modal && (
        <ProductModal
          catalog={catalog}
          initialCursor={initialCatalogCursor}
          selected={selected}
          onApply={setSelected}
          onProductsLoaded={mergeCatalog}
          close={() => setModal(false)}
        />
      )}
    </div>
  );
}

type RoutedAppProps = {
  view: "editor";
  catalog: CatalogProduct[];
  catalogCursor: string | null;
  existing?: BundleRecord | null;
};

export function RoutedApp(props: RoutedAppProps) {
  const router = useRouter();
  return (
    <>
      <EmbeddedNav />
      <CreateWizard
        existing={props.existing ?? null}
        initialCatalog={props.catalog}
        initialCatalogCursor={props.catalogCursor}
        back={() => router.push("/bundles")}
      />
    </>
  );
}

export default RoutedApp;
