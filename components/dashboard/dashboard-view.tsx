"use client";
import Text from "@/components/localization/text";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { currencyFormatter } from "@/lib/bundle/pricing";
import type { DashboardData } from "@/types/dashboard";
const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
export default function DashboardView({ data }: { data: DashboardData }) {
  const [selected, setSelected] = useState<number | null>(null);
  const money = currencyFormatter(data.currency);
  const max = Math.max(...data.dailyRevenue.map((day) => day.value), 1);
  const hasRevenue = data.dailyRevenue.some((day) => day.value > 0);
  const day = selected === null ? null : data.dailyRevenue[selected];
  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <h1>
            <Text text="Welcome back, {{name}}" values={{ name: data.shop }} />
          </h1>
          <p>
            <Text text={"Your store at a glance. Last 30 days · UTC"} />
          </p>
        </div>
        <Link className="primary" href="/bundles/new">
          <Plus size={16} />
          <Text text={"Create bundle"} />
        </Link>
      </header>
      {data.partial && (
        <div className="notice" role="status">
          <Text
            text={
              "This overview includes up to 5,000 orders and products. View your full reports in Shopify Analytics."
            }
          />
        </div>
      )}
      <section className="surface metric-strip" aria-label="Store metrics">
        {[
          [
            "Store revenue",
            money.format(data.revenue),
            `${data.orders} orders`,
          ],
          [
            "Average order value",
            money.format(data.averageOrderValue),
            "Last 30 days",
          ],
          [
            "Active bundles",
            String(data.activeBundles),
            `${data.bundles} total offers`,
          ],
          [
            "Inventory units",
            data.inventory.toLocaleString(),
            `${data.products} products`,
          ],
        ].map(([label, value, detail]) => (
          <div className="metric" key={label}>
            <span>
              <Text text={label} />
            </span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>
      <section className="surface overview-details">
        <div className="revenue-panel">
          <div className="section-heading">
            <div>
              <h2>
                <Text text={"Store revenue"} />
              </h2>
              <p>
                <Text
                  text={"All store orders, including non-bundle purchases."}
                />
              </p>
            </div>
            <span className="muted">
              <Text text={"Last 30 days"} />
            </span>
          </div>
          <div className="chart-readout" aria-live="polite">
            {day ? (
              <>
                <span>{dateFormat.format(new Date(day.date))}</span>
                <strong>{money.format(day.value)}</strong>
              </>
            ) : (
              <>
                <span>
                  <Text text={"Total"} />
                </span>
                <strong>{money.format(data.revenue)}</strong>
              </>
            )}
          </div>
          {hasRevenue ? (
            <div
              className="revenue-chart"
              role="group"
              aria-label="Daily revenue; use arrow keys to explore"
            >
              {data.dailyRevenue.map((item, index) => (
                <button
                  type="button"
                  key={item.date}
                  aria-label={`${item.date}: ${money.format(item.value)}`}
                  tabIndex={index === (selected ?? 0) ? 0 : -1}
                  onFocus={() => setSelected(index)}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => setSelected(index)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === "ArrowRight"
                        ? 1
                        : event.key === "ArrowLeft"
                          ? -1
                          : 0;
                    if (offset) {
                      event.preventDefault();
                      const target = Math.max(
                        0,
                        Math.min(data.dailyRevenue.length - 1, index + offset),
                      );
                      (
                        event.currentTarget.parentElement?.children[
                          target
                        ] as HTMLElement
                      )?.focus();
                    }
                  }}
                >
                  <span
                    style={{
                      height: `${Math.max(item.value > 0 ? 1 : 0, (item.value / max) * 100)}%`,
                    }}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="chart-empty">
              <h3>
                <Text text={"No revenue in this period"} />
              </h3>
              <p>
                <Text
                  text={
                    "Daily revenue will appear here when your store receives orders."
                  }
                />
              </p>
            </div>
          )}
          <div className="chart-labels">
            <span>{data.dailyRevenue[0]?.date}</span>
            <span>{data.dailyRevenue.at(-1)?.date}</span>
          </div>
        </div>
        <aside className="health-panel">
          <h2>
            <Text text={"Bundle activity"} />
          </h2>
          <dl>
            <div>
              <dt>
                <Text text={"Active now"} />
              </dt>
              <dd>{data.activeBundles}</dd>
            </div>
            <div>
              <dt>
                <Text text={"Draft, scheduled or ended"} />
              </dt>
              <dd>{data.bundles - data.activeBundles}</dd>
            </div>
            <div>
              <dt>
                <Text text={"Total offers"} />
              </dt>
              <dd>{data.bundles}</dd>
            </div>
          </dl>
          <p>
            <Text
              text={
                "Review your offers and keep product availability up to date."
              }
            />
          </p>
          <Link className="secondary" href="/bundles">
            <Text text={"Manage bundles"} />
            <ArrowUpRight size={15} />
          </Link>
          <div className="setup-note">
            <h3>
              <Text text={"Storefront setup"} />
            </h3>
            <p>
              <Text
                text={
                  "Add the bundle block to your product template and configure matching Shopify discounts before activating offers."
                }
              />
            </p>
            <Link href="/settings">
              <Text text={"View setup instructions"} />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
