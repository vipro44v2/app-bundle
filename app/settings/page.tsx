"use client";
import Text from "@/components/localization/text";
import LanguageSwitcher from "@/components/localization/auto-translate";
import Link from "next/link";
import AdminShell from "@/components/layout/admin-shell";
import { useAdminData } from "@/hooks/use-admin-data";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
export default function SettingsPage() {
  const { data, error, reload } = useAdminData<{
    name: string;
    domain: string;
    currencyCode: string;
  }>("/api/shopify/store");
  return (
    <AdminShell>
      {error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data ? (
        <LoadingState label="Loading settings" />
      ) : (
        <div className="page-content">
          <header className="page-heading">
            <div>
              <h1>
                <Text text={"Settings"} />
              </h1>
              <p>
                <Text text={"Store connection and storefront setup."} />
              </p>
            </div>
          </header>
          <div className="surface settings-page">
            <section className="settings-row">
              <div>
                <h2>Language</h2>
                <p>Choose your admin interface language.</p>
              </div>
              <LanguageSwitcher />
            </section>
            <section className="settings-row">
              <div>
                <h2>
                  <Text text={"Connected store"} />
                </h2>
                <p>
                  <Text
                    text={"Your catalog and bundles are managed in this store."}
                  />
                </p>
              </div>
              <dl>
                <div>
                  <dt>
                    <Text text={"Store"} />
                  </dt>
                  <dd>{data.name}</dd>
                </div>
                <div>
                  <dt>
                    <Text text={"Domain"} />
                  </dt>
                  <dd>{data.domain}</dd>
                </div>
                <div>
                  <dt>
                    <Text text={"Currency"} />
                  </dt>
                  <dd>{data.currencyCode}</dd>
                </div>
              </dl>
            </section>
            <section className="settings-row">
              <div>
                <h2>
                  <Text text={"Storefront widget"} />
                </h2>
                <p>
                  <Text text={"Show bundle offers on product pages."} />
                </p>
              </div>
              <div>
                <ol>
                  <li>
                    <Text
                      text={
                        "Open your theme editor and select a product template."
                      }
                    />
                  </li>
                  <li>
                    <Text text={"Add the Thanh Sang Bundle app block."} />
                  </li>
                  <li>
                    <Text
                      text={
                        "Set its app URL to this app’s public address, then save the theme."
                      }
                    />
                  </li>
                </ol>
                <a
                  className="secondary"
                  href={`https://${data.domain}/admin/themes`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Text text={"Open themes"} />
                </a>
              </div>
            </section>
            <section className="settings-row">
              <div>
                <h2>
                  <Text text={"Checkout discounts"} />
                </h2>
                <p>
                  <Text text={"Configure these before activating offers."} />
                </p>
              </div>
              <div>
                <p>
                  <Text
                    text={
                      "The widget adds products to the cart. It does not create or enforce checkout discounts. Set up matching automatic discounts in Shopify, or connect a Shopify Function for bundle-specific conditions."
                    }
                  />
                </p>
                <a
                  className="secondary"
                  href={`https://${data.domain}/admin/discounts`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Text text={"Open discounts"} />
                </a>
              </div>
            </section>
            <section className="settings-row">
              <div>
                <h2>
                  <Text text={"Offer text and appearance"} />
                </h2>
                <p>
                  <Text text={"Customize each offer for your customers."} />
                </p>
              </div>
              <div>
                <p>
                  <Text
                    text={
                      "Edit the heading, offer text, colors and schedule inside each bundle."
                    }
                  />
                </p>
                <Link className="secondary" href="/bundles">
                  <Text text={"Manage bundles"} />
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
