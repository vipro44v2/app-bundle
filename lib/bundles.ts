import { shopifyAdmin } from "@/lib/shopify";
import { AppError } from "@/lib/errors";
import { parseBundleInput } from "@/lib/bundle/validation";
import {
  type BundleConfiguration,
  type BundleInput,
  type BundleRecord,
} from "@/types/bundle";
export type {
  BundleConfiguration,
  BundleInput,
  BundleSettings,
  DealBar,
} from "@/types/bundle";

export const BUNDLE_TYPE = "$app:bundleflow_bundle";

type ShopifyUserError = { field?: string[]; message: string; code?: string };

export function assertNoUserErrors(errors: ShopifyUserError[] | undefined) {
  if (errors?.length)
    throw new AppError(
      errors.map((error) => error.message).join(", "),
      422,
      "SHOPIFY_USER_ERROR",
    );
}

let definitionInFlight: Promise<void> | null = null;
export function ensureBundleDefinition() {
  if (!definitionInFlight)
    definitionInFlight = ensureDefinition().finally(() => {
      definitionInFlight = null;
    });
  return definitionInFlight;
}
async function ensureDefinition() {
  const existing = (await shopifyAdmin(
    `query BundleDefinition($type: String!) { metaobjectDefinitionByType(type: $type) { id fieldDefinitions { key } } }`,
    { type: BUNDLE_TYPE },
  )) as {
    data?: {
      metaobjectDefinitionByType?: {
        id: string;
        fieldDefinitions: Array<{ key: string }>;
      } | null;
    };
  };
  const definition = existing.data?.metaobjectDefinitionByType;
  if (definition?.id) {
    if (
      !definition.fieldDefinitions.some(
        (field) => field.key === "configuration",
      )
    ) {
      const updated = (await shopifyAdmin(
        `mutation UpdateBundleDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
          metaobjectDefinitionUpdate(id: $id, definition: $definition) { userErrors { field message code } }
        }`,
        {
          id: definition.id,
          definition: {
            fieldDefinitions: [
              {
                create: {
                  key: "configuration",
                  name: "Configuration",
                  type: "json",
                },
              },
            ],
          },
        },
      )) as {
        data?: {
          metaobjectDefinitionUpdate?: { userErrors?: ShopifyUserError[] };
        };
      };
      assertNoUserErrors(updated.data?.metaobjectDefinitionUpdate?.userErrors);
      if (!updated.data?.metaobjectDefinitionUpdate)
        throw new AppError("Unable to update bundle definition", 502);
    }
    return;
  }

  const created = (await shopifyAdmin(
    `mutation CreateBundleDefinition($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        name: "BundleFlow bundle",
        type: BUNDLE_TYPE,
        displayNameKey: "name",
        access: { admin: "MERCHANT_READ_WRITE" },
        fieldDefinitions: [
          {
            key: "name",
            name: "Name",
            type: "single_line_text_field",
            required: true,
          },
          {
            key: "bundle_type",
            name: "Bundle type",
            type: "single_line_text_field",
            required: true,
          },
          {
            key: "product_ids",
            name: "Product IDs",
            type: "json",
            required: true,
          },
          {
            key: "discount",
            name: "Discount",
            type: "number_decimal",
            required: true,
          },
          {
            key: "status",
            name: "Status",
            type: "single_line_text_field",
            required: true,
          },
          {
            key: "created_at",
            name: "Created at",
            type: "date_time",
            required: true,
          },
          {
            key: "configuration",
            name: "Configuration",
            type: "json",
          },
        ],
      },
    },
  )) as {
    data?: { metaobjectDefinitionCreate?: { userErrors?: ShopifyUserError[] } };
  };
  assertNoUserErrors(created.data?.metaobjectDefinitionCreate?.userErrors);
  if (!created.data?.metaobjectDefinitionCreate)
    throw new AppError("Unable to create bundle definition", 502);
}

export function bundleFields(input: BundleInput, includeCreatedAt = false) {
  const fields = [
    { key: "name", value: input.name },
    { key: "bundle_type", value: input.bundleType },
    { key: "product_ids", value: JSON.stringify(input.productIds) },
    { key: "discount", value: String(input.discount) },
    { key: "status", value: input.status },
  ];
  fields.push({
    key: "configuration",
    value: JSON.stringify(input.configuration ?? { bars: [] }),
  });
  if (includeCreatedAt)
    fields.push({ key: "created_at", value: new Date().toISOString() });
  return fields;
}

export function parseBundle(node: {
  id: string;
  handle: string;
  updatedAt: string;
  fields: Array<{ key: string; value: string }>;
}): BundleRecord {
  const values = Object.fromEntries(
    node.fields.map((field) => [field.key, field.value]),
  );
  let productIds: string[] = [];
  let configuration: BundleConfiguration | undefined;
  try {
    productIds = JSON.parse(values.product_ids || "[]");
  } catch {
    console.warn("Corrupt bundle products", { id: node.id });
    throw new AppError(
      "A saved bundle has invalid products. Repair it in Shopify.",
      422,
      "CORRUPT_BUNDLE",
    );
  }
  try {
    configuration = values.configuration
      ? (JSON.parse(values.configuration) as BundleConfiguration)
      : undefined;
  } catch {
    console.warn("Corrupt bundle configuration", { id: node.id });
    throw new AppError(
      "A saved bundle has invalid configuration. Repair it in Shopify.",
      422,
      "CORRUPT_BUNDLE",
    );
  }
  let validated: BundleInput;
  try {
    validated = parseBundleInput({
      name: values.name,
      bundleType: values.bundle_type,
      productIds,
      discount: values.discount?.trim() ? Number(values.discount) : NaN,
      status: values.status,
      configuration,
    });
  } catch {
    console.warn("Corrupt saved bundle", { id: node.id });
    throw new AppError(
      "A saved bundle contains invalid data. Repair it in Shopify.",
      422,
      "CORRUPT_BUNDLE",
    );
  }
  return {
    id: node.id,
    handle: node.handle,
    name: validated.name,
    type: validated.bundleType,
    productIds: validated.productIds,
    products: validated.productIds.length,
    discount: validated.discount,
    status: validated.status,
    configuration: validated.configuration,
    updatedAt: node.updatedAt,
  };
}
