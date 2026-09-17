import {
  BUNDLE_TYPES,
  type BundleInput,
  type DealBar,
  type DealBarType,
} from "@/types/bundle";

export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const BAR_TYPES = new Set<DealBarType>([
  "quantity_break",
  "buy_x_get_y",
  "product_bundle",
  "mix_match",
  "alternative_product",
]);
const finiteRange = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

function validateBar(
  bar: DealBar,
  index: number,
  fields: Record<string, string>,
) {
  const prefix = `configuration.bars.${index}`;
  const type = bar.offerType ?? "buy_x_get_y";
  if (!BAR_TYPES.has(type))
    fields[`${prefix}.offerType`] = "Invalid offer type";
  if (!Number.isInteger(bar.buyQuantity) || bar.buyQuantity < 1)
    fields[`${prefix}.buyQuantity`] = "Must be at least 1";
  if (!Number.isInteger(bar.getQuantity) || bar.getQuantity < 0)
    fields[`${prefix}.getQuantity`] = "Must be 0 or greater";
  if (!finiteRange(bar.getDiscount, 0, 100))
    fields[`${prefix}.getDiscount`] = "Must be between 0 and 100";
  if (!bar.id || typeof bar.id !== "string")
    fields[`${prefix}.id`] = "ID is required";
}

export function parseBundleInput(value: unknown): BundleInput {
  if (typeof value !== "object" || value === null)
    throw new ValidationError("Invalid request body");
  const input = value as Partial<BundleInput>;
  const fields: Record<string, string> = {};
  if (!input.name?.trim()) fields.name = "Name is required";
  if (!BUNDLE_TYPES.includes(input.bundleType as BundleInput["bundleType"]))
    fields.bundleType = "Invalid bundle type";
  if (!Array.isArray(input.productIds) || input.productIds.length === 0)
    fields.productIds = "Select at least one product";
  else if (
    input.productIds.some(
      (id) => typeof id !== "string" || !PRODUCT_GID.test(id),
    )
  )
    fields.productIds = "Contains an invalid Shopify product ID";
  if (!finiteRange(input.discount, 0, 100))
    fields.discount = "Must be between 0 and 100";
  if (input.status !== "Active" && input.status !== "Draft")
    fields.status = "Invalid status";
  input.configuration?.bars?.forEach((bar, index) =>
    validateBar(bar, index, fields),
  );
  const settings = input.configuration?.settings;
  if (settings?.hasEndDate && settings.startDate && settings.endDate) {
    const start = Date.parse(
      `${settings.startDate}T${settings.startTime || "00:00"}:00Z`,
    );
    const end = Date.parse(
      `${settings.endDate}T${settings.endTime || "23:59"}:00Z`,
    );
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      fields["configuration.settings.endDate"] =
        "End date must be after start date";
  }
  if (Object.keys(fields).length)
    throw new ValidationError("Bundle validation failed", fields);
  return { ...input, name: input.name!.trim() } as BundleInput;
}
