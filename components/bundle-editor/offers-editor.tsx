"use client";
import Text from "@/components/localization/text";
import { Plus, Trash2 } from "lucide-react";
import { makeOffer } from "@/lib/bundle/defaults";
import type { BundleType, DealBar } from "@/types/bundle";
export default function OffersEditor({
  type,
  bars,
  onChange,
  errors,
}: {
  type: BundleType;
  bars: DealBar[];
  onChange: (bars: DealBar[]) => void;
  errors: Record<string, string>;
}) {
  const update = (id: string, patch: Partial<DealBar>) =>
    onChange(
      bars.map((bar) =>
        bar.id === id
          ? { ...bar, ...patch }
          : patch.selectedByDefault
            ? { ...bar, selectedByDefault: false }
            : bar,
      ),
    );
  return (
    <section className="editor-section">
      <div className="section-heading">
        <div>
          <h2>
            {type === "Volume discount"
              ? "Volume tiers"
              : "Buy X, get Y offers"}
          </h2>
          <p>
            {type === "Volume discount"
              ? "Set the quantity and percentage discount for each tier."
              : "The first product is purchased; the second is the gift. Select one product to use it for both."}
          </p>
        </div>
      </div>
      {errors["configuration.bars"] && (
        <p className="field-error" role="alert">
          {errors["configuration.bars"]}
        </p>
      )}
      {bars.map((bar, index) => (
        <fieldset className="offer-editor" key={bar.id}>
          <legend>
            <Text text="Offer {{number}}" values={{ number: index + 1 }} />
          </legend>
          <div className="form-row">
            <label>
              <Text text={"Buy quantity"} />
              <input
                name={`configuration.bars.${index}.buyQuantity`}
                type="number"
                min="1"
                max="100"
                step="1"
                value={bar.buyQuantity}
                onChange={(event) =>
                  update(bar.id, { buyQuantity: Number(event.target.value) })
                }
              />
            </label>
            {type === "Buy X get Y" && (
              <label>
                <Text text={"Get quantity"} />
                <input
                  name={`configuration.bars.${index}.getQuantity`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={bar.getQuantity}
                  onChange={(event) =>
                    update(bar.id, { getQuantity: Number(event.target.value) })
                  }
                />
              </label>
            )}
            <label>
              <Text text={"Discount (%)"} />
              <input
                name={`configuration.bars.${index}.getDiscount`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={bar.getDiscount}
                onChange={(event) =>
                  update(bar.id, {
                    getDiscount: Number(event.target.value),
                    getPriceMethod: "percentage_off",
                  })
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <Text text={"Offer title"} />
              <input
                maxLength={200}
                value={bar.title}
                onChange={(event) =>
                  update(bar.id, { title: event.target.value })
                }
              />
            </label>
            <label>
              <Text text={"Subtitle"} />
              <input
                maxLength={200}
                value={bar.subtitle}
                onChange={(event) =>
                  update(bar.id, { subtitle: event.target.value })
                }
              />
            </label>
          </div>
          <div className="offer-options">
            <label className="check-label">
              <input
                type="checkbox"
                checked={bar.selectedByDefault}
                onChange={(event) =>
                  update(bar.id, { selectedByDefault: event.target.checked })
                }
              />
              <Text text={"Selected by default"} />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={bar.soldOut}
                onChange={(event) =>
                  update(bar.id, { soldOut: event.target.checked })
                }
              />
              <Text text={"Unavailable"} />
            </label>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove offer ${index + 1}`}
              onClick={() =>
                onChange(bars.filter((item) => item.id !== bar.id))
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          {Object.entries(errors)
            .filter(([key]) => key.startsWith(`configuration.bars.${index}.`))
            .map(([key, value]) => (
              <p className="field-error" role="alert" key={key}>
                {value}
              </p>
            ))}
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={bars.length >= 20}
        onClick={() => onChange([...bars, makeOffer(type, bars.length)])}
      >
        <Plus size={15} />
        <Text text={"Add offer"} />
      </button>
    </section>
  );
}
