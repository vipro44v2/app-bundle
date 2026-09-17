"use client";
import Text from "@/components/localization/text";
import { Package } from "lucide-react";
import {
  calculateBuyXGetYPrice,
  calculateProductBundlePrice,
  calculateQuantityBreakPrice,
  currencyFormatter,
} from "@/lib/bundle/pricing";
import type { BundleInput } from "@/types/bundle";
import type { CatalogProduct } from "@/types/product";
export default function BundlePreview({
  input,
  products,
  currency,
}: {
  input: BundleInput;
  products: CatalogProduct[];
  currency: string;
}) {
  const money = currencyFormatter(currency);
  const style = input.configuration?.style;
  const settings = input.configuration?.settings;
  const tiers = ["Volume discount", "Buy X get Y"].includes(input.bundleType);
  const offers = tiers ? (input.configuration?.bars ?? []) : [null];
  return (
    <aside className="editor-preview surface">
      <div className="section-heading">
        <h2>
          <Text text={"Live preview"} />
        </h2>
        <span className="muted">{currency}</span>
      </div>
      <p className="muted">
        <Text text={"Estimated prices for the selected products."} />
      </p>
      {products.length ? (
        <div
          className={`preview-offers preview-${style?.layout ?? "stacked"}`}
          style={{ gap: style?.spacing ?? 8 }}
        >
          <h3 style={{ color: style?.blockTitle }}>
            {settings?.blockTitle || input.name || "Bundle & save"}
          </h3>
          {offers.map((bar, index) => {
            const percent =
              bar?.getPriceMethod === "free"
                ? 100
                : (bar?.getDiscount ?? input.discount);
            const selectedCount =
              input.bundleType === "Mix & match"
                ? (settings?.exactItems ?? 1)
                : input.bundleType === "Build your own"
                  ? (settings?.minimumItems ?? 1)
                  : products.length;
            const prices = Array.from(
              { length: Math.min(100, selectedCount) },
              (_, i) => products[i % products.length].price,
            );
            const result =
              input.bundleType === "Buy X get Y" && bar
                ? calculateBuyXGetYPrice(
                    products[0].price,
                    bar.buyQuantity,
                    bar.getQuantity,
                    percent,
                    currency,
                    products[1]?.price ?? products[0].price,
                  )
                : input.bundleType === "Volume discount" && bar
                  ? calculateQuantityBreakPrice(
                      products[0].price,
                      bar.buyQuantity,
                      percent,
                      currency,
                    )
                  : calculateProductBundlePrice(
                      prices,
                      input.discount,
                      currency,
                    );
            return (
              <div
                key={bar?.id ?? index}
                className={`preview-offer ${bar?.soldOut ? "is-unavailable" : ""}`}
                style={{
                  background: bar?.selectedByDefault
                    ? style?.selectedBg
                    : style?.cardsBg,
                  borderColor: style?.borderColor,
                  borderRadius: style?.cornerRadius,
                }}
              >
                <div>
                  <strong>{bar?.title || input.name || "Bundle & save"}</strong>
                  <small>
                    {bar?.subtitle ||
                      (bar?.soldOut
                        ? "Unavailable"
                        : bar
                          ? `${bar.buyQuantity + (input.bundleType === "Buy X get Y" ? bar.getQuantity : 0)} items`
                          : `${selectedCount} items`)}
                  </small>
                  <span
                    className="preview-savings"
                    style={{
                      background: style?.badgeBg,
                      color: style?.badgeText,
                    }}
                  >
                    <Text
                      text="Save {{percent}}%"
                      values={{ percent: result.savingsPercent }}
                    />
                  </span>
                </div>
                <div className="preview-price">
                  <strong style={{ color: style?.price }}>
                    {money.format(result.price)}
                  </strong>
                  <s style={{ color: style?.fullPrice }}>
                    {money.format(result.regular)}
                  </s>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="preview-empty">
          <Package size={25} />
          <p>
            <Text text={"Select products to preview your offer."} />
          </p>
        </div>
      )}
      <dl className="preview-summary">
        <div>
          <dt>
            <Text text={"Products selected"} />
          </dt>
          <dd>{input.productIds.length}</dd>
        </div>
        <div>
          <dt>
            <Text text={"Status"} />
          </dt>
          <dd>
            <span className={`status ${input.status.toLowerCase()}`}>
              {input.status}
            </span>
          </dd>
        </div>
      </dl>
      {products.length > 0 && (
        <ul className="preview-products" aria-label="Selected products">
          {products.slice(0, 3).map((product) => (
            <li key={product.id}>
              <span>{product.name}</span>
              <span>{money.format(product.price)}</span>
            </li>
          ))}
          {products.length > 3 && (
            <li className="muted">+{products.length - 3} more products</li>
          )}
        </ul>
      )}
      <p className="help-text">
        <Text
          text={
            "Shopify calculates the final price at checkout. Configure matching discounts in Shopify before activating an offer."
          }
        />
      </p>
    </aside>
  );
}
