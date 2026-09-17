import type {
  BundleType,
  DealBar,
  BundleSettings,
  BundleStyle,
} from "@/types/bundle";
import { offerTypeFor } from "./validation";
export function defaultSettings(): BundleSettings {
  return {
    blockTitle: "BUNDLE & SAVE",
    discountName: "",
    markets: "all",
    excludeMarkets: false,
    excludeB2B: false,
    widgetOnly: false,
    startDate: "",
    startTime: "00:00",
    hasEndDate: false,
    endDate: "",
    endTime: "23:59",
    differentVariants: false,
    hideThemeVariantPicker: false,
    hideUnavailableVariants: true,
    dontUpdateOtherProducts: false,
    swatchesEnabled: false,
    defaultVariantsEnabled: false,
    minimumItems: 2,
    maximumItems: 6,
    exactItems: 3,
  };
}
export function defaultStyle(): BundleStyle {
  return {
    layout: "stacked",
    cornerRadius: 8,
    spacing: 8,
    cardsBg: "#ffffff",
    selectedBg: "#f7f7f7",
    borderColor: "#303030",
    blockTitle: "#303030",
    badgeBg: "#eeeeee",
    badgeText: "#303030",
    price: "#303030",
    fullPrice: "#616161",
    freeGiftBg: "#eeeeee",
    freeGiftText: "#303030",
    freeGiftSelectedBg: "#eeeeee",
    freeGiftSelectedText: "#303030",
    upsellBg: "#eeeeee",
    upsellText: "#303030",
    upsellSelectedBg: "#eeeeee",
    upsellSelectedText: "#303030",
  };
}
export function makeOffer(type: BundleType, index = 0): DealBar {
  const volume = type === "Volume discount",
    bxgy = type === "Buy X get Y";
  return {
    id: crypto.randomUUID(),
    offerType: offerTypeFor(type),
    buyQuantity: volume ? index + 1 : 1,
    getQuantity: bxgy ? 1 : 0,
    buyPriceMethod: "full_price",
    getPriceMethod: bxgy ? "free" : "percentage_off",
    getDiscount: bxgy ? 100 : 10,
    title: bxgy
      ? "Buy 1, get 1 free"
      : volume
        ? "Buy " + (index + 1) + " items"
        : "Bundle & save",
    subtitle: "",
    label: "SAVE {{saved_percentage}}",
    applySellingPlan: false,
    selectedByDefault: index === 0,
    soldOut: false,
    imageMode: "none",
    upsellEnabled: false,
    giftEnabled: false,
    personalizationEnabled: false,
    highlightsEnabled: false,
  };
}
