"use client";
import { useEffect, useState } from "react";
import AdminShell from "@/components/layout/admin-shell";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { adminFetch, RequestError } from "@/lib/admin-fetch";
import BundleEditor from "./bundle-editor";
import type { BundleRecord } from "@/types/bundle";
import type { ProductPage, CatalogProduct } from "@/types/product";
export default function EditorPage({ id }: { id?: string }) {
  const [data, setData] = useState<{
    catalog: ProductPage;
    bundle?: BundleRecord;
    products: CatalogProduct[];
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setData(null);
    Promise.all([
      adminFetch<ProductPage>("/api/shopify/products", {
        signal: controller.signal,
      }),
      id
        ? adminFetch<{ bundle: BundleRecord; products: CatalogProduct[] }>(
            `/api/bundles/${encodeURIComponent(id)}`,
            { signal: controller.signal },
          )
        : Promise.resolve(undefined),
    ])
      .then(([catalog, saved]) => {
        if (id && !saved?.bundle)
          throw new RequestError("Bundle not found", 404);
        if (!controller.signal.aborted)
          setData({
            catalog,
            bundle: saved?.bundle,
            products: saved?.products ?? [],
          });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason);
      });
    return () => controller.abort();
  }, [id, version]);
  return (
    <AdminShell>
      {error ? (
        <ErrorState
          error={error}
          retry={() => setVersion((value) => value + 1)}
        />
      ) : !data ? (
        <LoadingState label="Loading bundle editor" />
      ) : (
        <BundleEditor
          existing={data.bundle}
          catalog={[
            ...new Map(
              [...data.catalog.products, ...data.products].map((product) => [
                product.id,
                product,
              ]),
            ).values(),
          ]}
          catalogCursor={data.catalog.nextCursor}
          currency={data.catalog.currency}
        />
      )}
    </AdminShell>
  );
}
