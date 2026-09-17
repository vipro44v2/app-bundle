import {
  BUNDLE_TYPES,
  type BundleInput,
  type BundleConfiguration,
  type BundleSettings,
  type DealBar,
} from "@/types/bundle";

export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
export const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
export const BUNDLE_GID = /^gid:\/\/shopify\/Metaobject\/\d+$/;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const range = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
export function validateBundleId(id: string) {
  try {
    id = decodeURIComponent(id);
  } catch {
    throw new ValidationError("Invalid bundle ID");
  }
  if (!BUNDLE_GID.test(id)) throw new ValidationError("Invalid bundle ID");
  return id;
}
export function parseBundleInput(value: unknown): BundleInput {
  if (!record(value)) throw new ValidationError("Invalid request body");
  const fields: Record<string, string> = {};
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name || name.length > 100)
    fields.name = "Enter a name between 1 and 100 characters";
  if (!BUNDLE_TYPES.includes(value.bundleType as BundleInput["bundleType"]))
    fields.bundleType = "Choose a bundle type";
  if (
    !Array.isArray(value.productIds) ||
    !value.productIds.length ||
    value.productIds.length > 50
  )
    fields.productIds = "Select between 1 and 50 products";
  else if (
    value.productIds.some(
      (id) => typeof id !== "string" || !PRODUCT_GID.test(id),
    )
  )
    fields.productIds = "Invalid Shopify product ID";
  else if (new Set(value.productIds).size !== value.productIds.length)
    fields.productIds = "Remove duplicate products";
  if (
    Array.isArray(value.productIds) &&
    value.bundleType === "Volume discount" &&
    value.productIds.length !== 1
  )
    fields.productIds = "Select one product for a volume offer";
  if (
    Array.isArray(value.productIds) &&
    value.bundleType === "Buy X get Y" &&
    value.productIds.length > 2
  )
    fields.productIds =
      "Select one qualifying product and at most one gift product";
  if (!range(value.discount, 0, 100))
    fields.discount = "Discount must be between 0 and 100";
  if (!["Active", "Draft"].includes(value.status as string))
    fields.status = "Choose Active or Draft";
  let configuration: BundleConfiguration | undefined;
  if (value.configuration !== undefined) {
    if (!record(value.configuration))
      fields.configuration = "Invalid configuration";
    else {
      const config = value.configuration;
      const allowed = ["bars", "accent", "style", "freeShipping", "settings"];
      for (const key of Object.keys(config))
        if (!allowed.includes(key))
          fields["configuration." + key] = "Unknown configuration field";
      if (!Array.isArray(config.bars) || config.bars.length > 20)
        fields["configuration.bars"] = "Use at most 20 offers";
      const ids = new Set<string>();
      let defaults = 0;
      if (Array.isArray(config.bars))
        config.bars.forEach((bar: unknown, index: number) => {
          const prefix = "configuration.bars." + index;
          if (!record(bar)) {
            fields[prefix] = "Invalid offer";
            return;
          }
          const expected =
            value.bundleType === "Volume discount"
              ? "quantity_break"
              : value.bundleType === "Buy X get Y"
                ? "buy_x_get_y"
                : value.bundleType === "Mix & match" ||
                    value.bundleType === "Build your own"
                  ? "mix_match"
                  : "product_bundle";
          if (bar.offerType !== undefined && bar.offerType !== expected)
            fields[prefix + ".offerType"] = "Offer must match the bundle type";
          if (
            typeof bar.id !== "string" ||
            !bar.id ||
            bar.id.length > 100 ||
            ids.has(bar.id)
          )
            fields[prefix + ".id"] = "Offer IDs must be unique";
          else ids.add(bar.id);
          for (const key of ["buyQuantity", "getQuantity"])
            if (
              !range(bar[key], key === "buyQuantity" ? 1 : 0, 100) ||
              !Number.isInteger(bar[key])
            )
              fields[prefix + "." + key] =
                "Enter a whole quantity between " +
                (key === "buyQuantity" ? 1 : 0) +
                " and 100";
          if (!range(bar.getDiscount, 0, 100))
            fields[prefix + ".getDiscount"] =
              "Discount must be between 0 and 100";
          if (
            bar.buyPriceMethod !== undefined &&
            bar.buyPriceMethod !== "full_price"
          )
            fields[prefix + ".buyPriceMethod"] =
              "Only full-price qualifying items are supported";
          if (
            bar.getPriceMethod !== undefined &&
            !["percentage_off", "free"].includes(bar.getPriceMethod as string)
          )
            fields[prefix + ".getPriceMethod"] =
              "Use a percentage discount or free item";
          for (const key of ["title", "subtitle", "label"])
            if (
              bar[key] !== undefined &&
              (typeof bar[key] !== "string" ||
                (bar[key] as string).length > 200)
            )
              fields[prefix + "." + key] = "Use at most 200 characters";
          for (const key of [
            "applySellingPlan",
            "selectedByDefault",
            "soldOut",
            "upsellEnabled",
            "giftEnabled",
            "personalizationEnabled",
            "highlightsEnabled",
          ])
            if (bar[key] !== undefined && typeof bar[key] !== "boolean")
              fields[prefix + "." + key] = "Must be a boolean";
          if (bar.selectedByDefault) defaults++;
          for (const key of [
            "applySellingPlan",
            "upsellEnabled",
            "giftEnabled",
            "personalizationEnabled",
            "highlightsEnabled",
          ])
            if (bar[key] === true)
              fields[prefix + "." + key] =
                "This option is not supported by the storefront widget";
          if (
            bar.imageMode !== undefined &&
            !["none", "featured"].includes(bar.imageMode as string)
          )
            fields[prefix + ".imageMode"] = "Unsupported image mode";
          const allowedBar = [
            "id",
            "offerType",
            "buyQuantity",
            "getQuantity",
            "getDiscount",
            "buyPriceMethod",
            "getPriceMethod",
            "title",
            "subtitle",
            "label",
            "applySellingPlan",
            "selectedByDefault",
            "soldOut",
            "imageMode",
            "upsellEnabled",
            "giftEnabled",
            "personalizationEnabled",
            "highlightsEnabled",
          ];
          for (const key of Object.keys(bar))
            if (!allowedBar.includes(key))
              fields[prefix + "." + key] = "Unknown offer field";
        });
      if (defaults > 1)
        fields["configuration.bars"] = "Choose only one default offer";
      if (
        value.bundleType === "Volume discount" &&
        Array.isArray(config.bars)
      ) {
        const quantities = config.bars
          .filter(record)
          .map((bar) => bar.buyQuantity);
        if (new Set(quantities).size !== quantities.length)
          fields["configuration.bars"] = "Tier quantities must be unique";
      }
      if (
        ["Volume discount", "Buy X get Y"].includes(
          value.bundleType as string,
        ) &&
        (!Array.isArray(config.bars) || !config.bars.length)
      )
        fields["configuration.bars"] = "Add at least one offer";
      if (
        config.accent !== undefined &&
        (typeof config.accent !== "string" ||
          !/^#[0-9a-f]{6}$/i.test(config.accent))
      )
        fields["configuration.accent"] = "Use a six-digit hex color";
      if (config.freeShipping !== undefined && config.freeShipping !== false)
        fields["configuration.freeShipping"] =
          "Configure free shipping in Shopify Discounts";
      if (config.style !== undefined) {
        if (!record(config.style))
          fields["configuration.style"] = "Invalid style";
        else
          for (const [key, item] of Object.entries(config.style)) {
            if (key === "layout") {
              if (
                !["stacked", "compact", "grid", "minimal"].includes(
                  item as string,
                )
              )
                fields["configuration.style.layout"] = "Invalid layout";
            } else if (["cornerRadius", "spacing"].includes(key)) {
              if (!range(item, 0, 30))
                fields["configuration.style." + key] =
                  "Use a value between 0 and 30";
            } else if (
              ![
                "cardsBg",
                "selectedBg",
                "borderColor",
                "blockTitle",
                "badgeBg",
                "badgeText",
                "price",
                "fullPrice",
                "freeGiftBg",
                "freeGiftText",
                "freeGiftSelectedBg",
                "freeGiftSelectedText",
                "upsellBg",
                "upsellText",
                "upsellSelectedBg",
                "upsellSelectedText",
              ].includes(key) ||
              typeof item !== "string" ||
              !/^#[0-9a-f]{6}$/i.test(item)
            )
              fields["configuration.style." + key] =
                "Use a six-digit hex color";
          }
      }
      if (config.settings !== undefined) {
        if (!record(config.settings))
          fields["configuration.settings"] = "Invalid settings";
        else {
          const settings = config.settings;
          const textKeys = [
            "blockTitle",
            "discountName",
            "markets",
            "startDate",
            "startTime",
            "endDate",
            "endTime",
          ];
          const boolKeys = [
            "excludeMarkets",
            "excludeB2B",
            "widgetOnly",
            "hasEndDate",
            "differentVariants",
            "hideThemeVariantPicker",
            "hideUnavailableVariants",
            "dontUpdateOtherProducts",
            "swatchesEnabled",
            "defaultVariantsEnabled",
          ];
          const quantityKeys = ["minimumItems", "maximumItems", "exactItems"];
          for (const [key, item] of Object.entries(settings)) {
            if (textKeys.includes(key)) {
              if (typeof item !== "string" || item.length > 200)
                fields["configuration.settings." + key] = "Invalid text";
            } else if (boolKeys.includes(key)) {
              if (typeof item !== "boolean")
                fields["configuration.settings." + key] = "Must be a boolean";
            } else if (quantityKeys.includes(key)) {
              if (!range(item, 1, 100) || !Number.isInteger(item))
                fields["configuration.settings." + key] =
                  "Enter a whole quantity between 1 and 100";
            } else fields["configuration.settings." + key] = "Unknown setting";
          }
          for (const key of [
            "excludeMarkets",
            "excludeB2B",
            "widgetOnly",
            "hideThemeVariantPicker",
            "swatchesEnabled",
            "defaultVariantsEnabled",
          ])
            if (settings[key] === true)
              fields["configuration.settings." + key] =
                "This option is not supported";
          if (settings.markets !== undefined && settings.markets !== "all")
            fields["configuration.settings.markets"] =
              "Only all markets are supported";
          for (const key of ["startDate", "endDate"])
            if (
              settings[key] &&
              (typeof settings[key] !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(settings[key] as string) ||
                !Number.isFinite(Date.parse(settings[key] as string)) ||
                new Date(settings[key] as string).toISOString().slice(0, 10) !==
                  settings[key])
            )
              fields["configuration.settings." + key] = "Enter a valid date";
          for (const key of ["startTime", "endTime"])
            if (
              settings[key] &&
              (typeof settings[key] !== "string" ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings[key] as string))
            )
              fields["configuration.settings." + key] = "Enter a valid time";
          if (settings.hasEndDate && !settings.endDate)
            fields["configuration.settings.endDate"] = "End date is required";
          if (
            settings.hasEndDate &&
            settings.startDate &&
            settings.endDate &&
            Date.parse(
              settings.endDate +
                "T" +
                (settings.endTime || "23:59") +
                ":00+07:00",
            ) <=
              Date.parse(
                settings.startDate +
                  "T" +
                  (settings.startTime || "00:00") +
                  ":00+07:00",
              )
          )
            fields["configuration.settings.endDate"] =
              "End date must be after start date";
          if (
            typeof settings.minimumItems === "number" &&
            typeof settings.maximumItems === "number" &&
            settings.maximumItems < settings.minimumItems
          )
            fields["configuration.settings.maximumItems"] =
              "Maximum must be at least the minimum";
          if (
            value.bundleType === "Mix & match" &&
            !Number.isInteger(settings.exactItems)
          )
            fields["configuration.settings.exactItems"] =
              "Enter the required item count";
          if (value.bundleType === "Build your own") {
            for (const key of ["minimumItems", "maximumItems"])
              if (!Number.isInteger(settings[key]))
                fields["configuration.settings." + key] =
                  "Enter the customer selection limit";
          }
        }
      }
      configuration = config as unknown as BundleConfiguration;
    }
  }
  if (
    [
      "Mix & match",
      "Build your own",
      "Volume discount",
      "Buy X get Y",
    ].includes(value.bundleType as string) &&
    !configuration
  )
    fields.configuration = "Configure the bundle rules";
  if (
    ["Mix & match", "Build your own"].includes(value.bundleType as string) &&
    !configuration?.settings
  )
    fields["configuration.settings"] = "Configure customer selection limits";
  if (Object.keys(fields).length)
    throw new ValidationError("Check the highlighted fields", fields);
  return {
    name,
    bundleType: value.bundleType as BundleInput["bundleType"],
    productIds: value.productIds as string[],
    discount: value.discount as number,
    status: value.status as BundleInput["status"],
    ...(configuration ? { configuration } : {}),
  };
}

export function offerTypeFor(
  type: BundleInput["bundleType"],
): NonNullable<DealBar["offerType"]> {
  return type === "Volume discount"
    ? "quantity_break"
    : type === "Buy X get Y"
      ? "buy_x_get_y"
      : type === "Mix & match" || type === "Build your own"
        ? "mix_match"
        : "product_bundle";
}
export function isScheduledActive(
  settings?: Partial<BundleSettings>,
  now = Date.now(),
) {
  const start = settings?.startDate
    ? Date.parse(
        settings.startDate +
          "T" +
          (settings.startTime || "00:00") +
          ":00+07:00",
      )
    : 0;
  const end = settings?.hasEndDate
    ? Date.parse(
        settings.endDate + "T" + (settings.endTime || "23:59") + ":00+07:00",
      )
    : Infinity;
  return now >= start && now <= end;
}
