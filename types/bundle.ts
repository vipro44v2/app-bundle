export const BUNDLE_TYPES = [
  "Fixed bundle",
  "Mix & match",
  "Build your own",
  "Volume discount",
  "Buy X get Y",
  "Frequently bought together",
] as const;

export type BundleType = (typeof BUNDLE_TYPES)[number];
export type BundleStatus = "Active" | "Draft";
export type DealBarType =
  | "quantity_break"
  | "buy_x_get_y"
  | "product_bundle"
  | "mix_match"
  | "alternative_product";

export type DealBar = {
  id: string;
  offerType?: DealBarType;
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

export type BundleSettings = {
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

export type BundleConfiguration = {
  bars: DealBar[];
  accent?: string;
  style?: BundleStyle;
  freeShipping?: boolean;
  settings?: BundleSettings;
};

export type BundleStyle = {
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

export type BundleInput = {
  name: string;
  bundleType: BundleType;
  productIds: string[];
  discount: number;
  status: BundleStatus;
  configuration?: BundleConfiguration;
};

export type BundleRecord = {
  id: string;
  handle: string;
  name: string;
  type: BundleType;
  productIds: string[];
  products: number;
  discount: number;
  status: BundleStatus;
  configuration?: BundleConfiguration;
  updatedAt: string;
};
