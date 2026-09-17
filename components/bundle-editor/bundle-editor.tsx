"use client";
import Text from "@/components/localization/text";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import {
  BUNDLE_TYPES,
  type BundleInput,
  type BundleRecord,
  type BundleType,
  type BundleSettings,
} from "@/types/bundle";
import type { CatalogProduct } from "@/types/product";
import {
  defaultSettings,
  defaultStyle,
  makeOffer,
} from "@/lib/bundle/defaults";
import { parseBundleInput, ValidationError } from "@/lib/bundle/validation";
import { currencyFormatter } from "@/lib/bundle/pricing";
import { adminFetch, RequestError } from "@/lib/admin-fetch";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import OffersEditor from "./offers-editor";
import BundlePreview from "./bundle-preview";
const ProductModal = dynamic(() => import("./product-modal"), { ssr: false });
const descriptions: Record<BundleType, string> = {
  "Fixed bundle": "Sell all selected products together.",
  "Mix & match": "Customers choose an exact number of items.",
  "Build your own": "Customers choose items within a quantity range.",
  "Volume discount": "Offer a discount for buying more of one product.",
  "Buy X get Y": "Offer free or discounted items with a qualifying purchase.",
  "Frequently bought together": "Recommend complementary products together.",
};
export default function BundleEditor({
  existing,
  catalog: initialCatalog,
  catalogCursor,
  currency = "USD",
}: {
  existing?: BundleRecord | null;
  catalog: CatalogProduct[];
  catalogCursor: string | null;
  currency?: string;
  view?: "editor";
}) {
  const router = useRouter();
  const initial = useRef<BundleInput>({
    name: existing?.name ?? "",
    bundleType: existing?.type ?? "Fixed bundle",
    productIds: existing?.productIds ?? [],
    discount: existing?.discount ?? 15,
    status: existing?.status ?? "Draft",
    configuration: {
      ...existing?.configuration,
      bars: existing?.configuration?.bars ?? [],
      settings: { ...defaultSettings(), ...existing?.configuration?.settings },
      style: { ...defaultStyle(), ...existing?.configuration?.style },
      freeShipping: existing?.configuration?.freeShipping ?? false,
    },
  });
  const [input, setInput] = useState<BundleInput>(initial.current);
  const [saved, setSaved] = useState(JSON.stringify(initial.current));
  const [id, setId] = useState(existing?.id);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [leave, setLeave] = useState<string | null>(null);
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(input) !== saved;
  const unsupported =
    !!input.configuration?.freeShipping ||
    input.configuration!.bars.some(
      (bar) =>
        bar.applySellingPlan ||
        bar.giftEnabled ||
        bar.upsellEnabled ||
        bar.personalizationEnabled ||
        bar.highlightsEnabled ||
        bar.buyPriceMethod !== "full_price" ||
        bar.getPriceMethod === "fixed_price" ||
        bar.imageMode === "upload",
    ) ||
    (!!input.configuration?.settings &&
      [
        "excludeMarkets",
        "excludeB2B",
        "widgetOnly",
        "hideThemeVariantPicker",
        "swatchesEnabled",
        "defaultVariantsEnabled",
      ].some(
        (key) =>
          input.configuration!.settings![key as keyof BundleSettings] === true,
      ));
  const money = currencyFormatter(currency);
  const fields = useMemo(() => {
    try {
      parseBundleInput(input);
      return serverFields;
    } catch (reason) {
      return reason instanceof ValidationError
        ? { ...serverFields, ...reason.fields }
        : serverFields;
    }
  }, [input, serverFields]);
  const errors = touched
    ? fields
    : Object.fromEntries(
        Object.entries(fields).filter(([key]) => visited[key]),
      );
  const update = (patch: Partial<BundleInput>) => {
    setInput((current) => ({ ...current, ...patch }));
    setServerFields({});
    setNotice("");
  };
  const settings = input.configuration!.settings!;
  const style = input.configuration!.style!;
  const updateSettings = (patch: Partial<BundleSettings>) =>
    update({
      configuration: {
        ...input.configuration!,
        settings: { ...settings, ...patch },
      },
    });
  const chosen = input.productIds
    .map((productId) => catalog.find((product) => product.id === productId))
    .filter((product): product is CatalogProduct => !!product);
  const mergeCatalog = useCallback(
    (incoming: CatalogProduct[]) =>
      setCatalog((current) => [
        ...new Map(
          [...current, ...incoming].map((product) => [product.id, product]),
        ).values(),
      ]),
    [],
  );
  const closeModal = useCallback(() => setModal(false), []);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const intercept = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !anchor ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        anchor.target === "_blank"
      )
        return;
      if (
        anchor.origin === location.origin &&
        anchor.pathname !== location.pathname
      ) {
        event.preventDefault();
        event.stopPropagation();
        setLeave(anchor.pathname + anchor.search);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", intercept, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", intercept, true);
    };
  }, [dirty]);
  const focusError = (details: Record<string, string>) => {
    const first = Object.keys(details)[0];
    const target =
      form.current?.querySelector<HTMLElement>(
        `[name="${CSS.escape(first)}"]`,
      ) ?? form.current?.querySelector<HTMLElement>("[data-errors]");
    target?.closest("details")?.setAttribute("open", "");
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const save = async () => {
    if (lock.current) return;
    setTouched(true);
    try {
      parseBundleInput(input);
    } catch (reason) {
      if (reason instanceof ValidationError) {
        focusError(reason.fields);
        return;
      }
    }
    lock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { bundle } = await adminFetch<{ bundle: BundleRecord }>(
        id ? `/api/bundles/${encodeURIComponent(id)}` : "/api/bundles",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      setId(bundle.id);
      setSaved(JSON.stringify(input));
      setNotice(
        input.status === "Draft"
          ? "Draft saved."
          : "Bundle saved. Check the offer on your storefront.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save bundle",
      );
      if (reason instanceof RequestError && reason.details) {
        setServerFields(reason.details);
        focusError(reason.details);
      }
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const back = () => (dirty ? setLeave("/bundles") : router.push("/bundles"));
  return (
    <div className="page-content editor-page">
      <header className="page-heading">
        <div className="editor-title">
          <button
            type="button"
            className="icon-button"
            aria-label="Back to bundles"
            onClick={back}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1>{id ? "Edit bundle" : "Create bundle"}</h1>
            <p>
              {id
                ? input.name || "Bundle details"
                : "Set up your products, offer and storefront display."}
            </p>
          </div>
        </div>
        <span className={`status ${input.status.toLowerCase()}`}>
          {input.status}
        </span>
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            type="button"
            className="text-button"
            onClick={() => setNotice("")}
          >
            <Text text={"Dismiss"} />
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {unsupported && (
        <div className="notice">
          <p>
            This bundle has legacy options that the storefront cannot apply.
            Remove them before saving. Your products and discount percentages
            will be kept.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              update({
                configuration: {
                  ...input.configuration!,
                  freeShipping: false,
                  bars: input.configuration!.bars.map((bar) => ({
                    ...bar,
                    applySellingPlan: false,
                    giftEnabled: false,
                    upsellEnabled: false,
                    personalizationEnabled: false,
                    highlightsEnabled: false,
                    buyPriceMethod: "full_price",
                    getPriceMethod:
                      bar.getPriceMethod === "fixed_price"
                        ? "percentage_off"
                        : bar.getPriceMethod,
                    imageMode: "none",
                  })),
                  settings: {
                    ...settings,
                    markets: "all",
                    excludeMarkets: false,
                    excludeB2B: false,
                    widgetOnly: false,
                    hideThemeVariantPicker: false,
                    swatchesEnabled: false,
                    defaultVariantsEnabled: false,
                  },
                },
              })
            }
          >
            Remove unsupported options
          </button>
        </div>
      )}
      <div className="editor-grid">
        <form
          ref={form}
          className="surface editor-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          onBlur={(event) => {
            const name = event.target.getAttribute("name");
            if (name) setVisited((current) => ({ ...current, [name]: true }));
          }}
        >
          {touched && Object.keys(fields).length > 0 && (
            <div
              className="error-banner"
              tabIndex={-1}
              data-errors
              role="alert"
            >
              <strong>
                <Text text={"Review the following fields"} />
              </strong>
              <ul>
                {Object.entries(fields).map(([key, value]) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => focusError({ [key]: value })}
                    >
                      {value}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <fieldset disabled={saving} className="editor-fields">
            <section className="editor-section">
              <h2>
                <Text text={"Bundle details"} />
              </h2>
              <label htmlFor="bundle-name">
                <Text text={"Name"} />
              </label>
              <input
                id="bundle-name"
                name="name"
                maxLength={100}
                value={input.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="e.g. Everyday essentials"
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "name-hint name-error" : "name-hint"
                }
              />
              <p id="name-hint" className="help-text">
                <Text
                  text={
                    "Used to identify this bundle and as the default offer title."
                  }
                />
              </p>
              {errors.name && (
                <p id="name-error" className="field-error">
                  {errors.name}
                </p>
              )}
              <label htmlFor="bundle-type">
                <Text text={"Bundle type"} />
              </label>
              <select
                id="bundle-type"
                name="bundleType"
                value={input.bundleType}
                onChange={(event) => {
                  const type = event.target.value as BundleType;
                  update({
                    bundleType: type,
                    configuration: {
                      ...input.configuration!,
                      bars: ["Volume discount", "Buy X get Y"].includes(type)
                        ? [makeOffer(type)]
                        : [],
                    },
                  });
                }}
              >
                {BUNDLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    <Text text={type} />
                  </option>
                ))}
              </select>
              <p className="help-text">{descriptions[input.bundleType]}</p>
            </section>
            <section className="editor-section">
              <div className="section-heading">
                <h2>
                  <Text text={"Products"} />
                  <span className="muted"> ({input.productIds.length})</span>
                </h2>
                <button
                  type="button"
                  className="secondary"
                  name="productIds"
                  aria-describedby={
                    errors.productIds ? "products-error" : undefined
                  }
                  onClick={() => setModal(true)}
                >
                  <Plus size={15} />
                  <Text text={"Select products"} />
                </button>
              </div>
              {!input.productIds.length && (
                <p className="help-text">
                  <Text text={"Choose the products included in this offer."} />
                </p>
              )}
              <div className="editor-products">
                {input.productIds.map((productId, index) => {
                  const product = catalog.find((item) => item.id === productId);
                  return (
                    <div className="editor-product" key={productId}>
                      <span className="product-image">
                        {product?.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Package size={20} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {product?.name ?? "Product no longer available"}
                        </strong>
                        <small>
                          {product
                            ? `${money.format(product.price)} · ${product.available ? product.stock + " in stock" : "Unavailable"}`
                            : productId}
                        </small>
                        {input.bundleType === "Buy X get Y" && (
                          <small>
                            {index === 0
                              ? "Qualifying product"
                              : "Gift product"}
                          </small>
                        )}
                      </div>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={`Remove ${product?.name ?? "missing product"}`}
                        onClick={() =>
                          update({
                            productIds: input.productIds.filter(
                              (item) => item !== productId,
                            ),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {errors.productIds && (
                <p id="products-error" className="field-error">
                  {errors.productIds}
                </p>
              )}
            </section>
            {["Volume discount", "Buy X get Y"].includes(input.bundleType) ? (
              <OffersEditor
                type={input.bundleType}
                bars={input.configuration!.bars}
                errors={errors}
                onChange={(bars) =>
                  update({ configuration: { ...input.configuration!, bars } })
                }
              />
            ) : (
              <section className="editor-section">
                <h2>
                  <Text text={"Discount"} />
                </h2>
                <label>
                  <Text text={"Percentage off"} />
                  <input
                    name="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={input.discount}
                    onChange={(event) =>
                      update({ discount: Number(event.target.value) })
                    }
                    aria-invalid={!!errors.discount}
                    aria-describedby={
                      errors.discount ? "discount-error" : undefined
                    }
                  />
                </label>
                {errors.discount && (
                  <p id="discount-error" className="field-error">
                    {errors.discount}
                  </p>
                )}
                {input.bundleType === "Mix & match" && (
                  <label>
                    <Text text={"Items customers must choose"} />
                    <input
                      name="configuration.settings.exactItems"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.exactItems}
                      onChange={(event) =>
                        updateSettings({
                          exactItems: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                )}
                {input.bundleType === "Build your own" && (
                  <div className="form-row">
                    <label>
                      <Text text={"Minimum items"} />
                      <input
                        name="configuration.settings.minimumItems"
                        type="number"
                        min="1"
                        max="100"
                        value={settings.minimumItems}
                        onChange={(event) =>
                          updateSettings({
                            minimumItems: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <Text text={"Maximum items"} />
                      <input
                        name="configuration.settings.maximumItems"
                        type="number"
                        min={settings.minimumItems}
                        max="100"
                        value={settings.maximumItems}
                        onChange={(event) =>
                          updateSettings({
                            maximumItems: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </section>
            )}
            <section className="editor-section">
              <h2>
                <Text text={"Display"} />
              </h2>
              <label>
                <Text text={"Widget heading"} />
                <input
                  maxLength={200}
                  value={settings.blockTitle}
                  onChange={(event) =>
                    updateSettings({ blockTitle: event.target.value })
                  }
                />
              </label>
              <label>
                <Text text={"Cart label"} />
                <input
                  maxLength={200}
                  value={settings.discountName}
                  onChange={(event) =>
                    updateSettings({ discountName: event.target.value })
                  }
                  placeholder="Optional label"
                />
              </label>
              <details className="display-settings">
                <summary>
                  <Text text={"Appearance"} />
                </summary>
                <div className="form-row">
                  <label>
                    <Text text={"Layout"} />
                    <select
                      value={style.layout}
                      onChange={(event) =>
                        update({
                          configuration: {
                            ...input.configuration!,
                            style: {
                              ...style,
                              layout: event.target.value as typeof style.layout,
                            },
                          },
                        })
                      }
                    >
                      {["stacked", "compact", "grid", "minimal"].map(
                        (layout) => (
                          <option key={layout}>{layout}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    <Text text={"Corner radius"} />
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={style.cornerRadius}
                      onChange={(event) =>
                        update({
                          configuration: {
                            ...input.configuration!,
                            style: {
                              ...style,
                              cornerRadius: Number(event.target.value),
                            },
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="color-fields">
                  {(
                    [
                      "cardsBg",
                      "selectedBg",
                      "borderColor",
                      "blockTitle",
                      "badgeBg",
                      "badgeText",
                      "price",
                      "fullPrice",
                    ] as const
                  ).map((key) => (
                    <label key={key}>
                      {
                        {
                          cardsBg: "Background",
                          selectedBg: "Selected background",
                          borderColor: "Border",
                          blockTitle: "Heading",
                          badgeBg: "Badge",
                          badgeText: "Badge text",
                          price: "Price",
                          fullPrice: "Original price",
                        }[key]
                      }
                      <input
                        type="color"
                        value={style[key]}
                        onChange={(event) =>
                          update({
                            configuration: {
                              ...input.configuration!,
                              style: { ...style, [key]: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
            </section>
            <section className="editor-section">
              <h2>
                <Text text={"Status and schedule"} />
              </h2>
              <label>
                <Text text={"Status"} />
                <select
                  name="status"
                  value={input.status}
                  onChange={(event) =>
                    update({
                      status: event.target.value as BundleInput["status"],
                    })
                  }
                >
                  <option value="Draft">
                    <Text text={"Draft"} />
                  </option>
                  <option value="Active">
                    <Text text={"Active"} />
                  </option>
                </select>
              </label>
              <p className="help-text">
                <Text
                  text={
                    "Active offers appear within their scheduled dates. Configure matching Shopify discounts before activating."
                  }
                />
              </p>
              <div className="form-row">
                <label>
                  <Text text={"Start date (optional)"} />
                  <input
                    name="configuration.settings.startDate"
                    type="date"
                    value={settings.startDate}
                    onChange={(event) =>
                      updateSettings({ startDate: event.target.value })
                    }
                  />
                </label>
                <label>
                  <Text text={"Start time (GMT+7)"} />
                  <input
                    name="configuration.settings.startTime"
                    type="time"
                    value={settings.startTime}
                    onChange={(event) =>
                      updateSettings({ startTime: event.target.value })
                    }
                  />
                </label>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.hasEndDate}
                  onChange={(event) =>
                    updateSettings({ hasEndDate: event.target.checked })
                  }
                />
                <Text text={"Set an end date"} />
              </label>
              {settings.hasEndDate && (
                <div className="form-row">
                  <label>
                    <Text text={"End date"} />
                    <input
                      name="configuration.settings.endDate"
                      type="date"
                      value={settings.endDate}
                      onChange={(event) =>
                        updateSettings({ endDate: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <Text text={"End time (GMT+7)"} />
                    <input
                      name="configuration.settings.endTime"
                      type="time"
                      value={settings.endTime}
                      onChange={(event) =>
                        updateSettings({ endTime: event.target.value })
                      }
                    />
                  </label>
                </div>
              )}
            </section>
          </fieldset>
          <button type="submit" className="sr-only" tabIndex={-1}>
            <Text text={"Save bundle"} />
          </button>
        </form>
        <BundlePreview input={input} products={chosen} currency={currency} />
      </div>
      <footer className={`editor-save-bar ${dirty ? "is-dirty" : ""}`}>
        <span>
          {saving
            ? "Saving your changes…"
            : dirty
              ? "Unsaved changes"
              : id
                ? "All changes saved"
                : "New bundle · not saved yet"}
        </span>
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={back}
          >
            <Text text={"Cancel"} />
          </button>
          <button
            type="button"
            className="primary"
            disabled={saving || !dirty}
            onClick={save}
          >
            {saving ? "Saving…" : "Save bundle"}
          </button>
        </div>
      </footer>
      {modal && (
        <ProductModal
          catalog={catalog}
          initialCursor={catalogCursor}
          selected={input.productIds}
          currency={currency}
          onApply={(productIds) => update({ productIds })}
          onProductsLoaded={mergeCatalog}
          close={closeModal}
        />
      )}
      {leave && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          confirmLabel="Discard changes"
          onCancel={() => setLeave(null)}
          onConfirm={() => {
            setSaved(JSON.stringify(input));
            router.push(leave);
          }}
        >
          <p>
            <Text text={"Your changes to this bundle have not been saved."} />
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
