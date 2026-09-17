"use client";
import Text from "@/components/localization/text";
import Image from "next/image";
import { Package, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { currencyFormatter } from "@/lib/bundle/pricing";
import type { CatalogProduct, ProductPage } from "@/types/product";
export default function ProductModal({
  catalog,
  selected,
  currency,
  onApply,
  onProductsLoaded,
  close,
}: {
  catalog: CatalogProduct[];
  initialCursor: string | null;
  selected: string[];
  currency: string;
  onApply: (ids: string[]) => void;
  onProductsLoaded: (products: CatalogProduct[]) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(selected);
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const money = currencyFormatter(currency);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const version = ++generation.current;
    pending.current = true;
    setLoading(true);
    setError("");
    setCursor(null);
    const timer = setTimeout(
      async () => {
        try {
          const page = await adminFetch<ProductPage>(
            "/api/shopify/products?query=" + encodeURIComponent(query.trim()),
            { signal: current.signal },
          );
          if (current.signal.aborted || generation.current !== version) return;
          setResults(page.products);
          setCursor(page.nextCursor);
          onProductsLoaded(page.products);
        } catch (reason) {
          if (!current.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to load products",
            );
        } finally {
          if (!current.signal.aborted) {
            pending.current = false;
            setLoading(false);
          }
        }
      },
      query.trim() ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      current.abort();
    };
  }, [query, retry, onProductsLoaded]);
  const more = async () => {
    if (!cursor || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    const version = generation.current;
    const current = new AbortController();
    controller.current = current;
    try {
      const page = await adminFetch<ProductPage>(
        "/api/shopify/products?" +
          new URLSearchParams({ cursor, query: query.trim() }),
        { signal: current.signal },
      );
      if (current.signal.aborted || generation.current !== version) return;
      setResults((items) => [
        ...new Map(
          [...items, ...page.products].map((product) => [product.id, product]),
        ).values(),
      ]);
      setCursor(page.nextCursor);
      onProductsLoaded(page.products);
    } catch (reason) {
      if (!current.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "Unable to load products",
        );
    } finally {
      if (!current.signal.aborted && generation.current === version) {
        pending.current = false;
        setLoading(false);
      }
    }
  };
  const toggle = (id: string) =>
    setDraft((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : items.length < 50
          ? [...items, id]
          : items,
    );
  return (
    <dialog
      className="product-dialog"
      ref={dialog}
      aria-labelledby="product-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="modal-head">
        <div>
          <h2 id="product-modal-title">
            <Text text={"Select products"} />
          </h2>
          <p>
            <Text
              text={
                "Choose up to 50 products. Customers choose available variants on your storefront."
              }
            />
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close product selector"
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      <div className="modal-search">
        <label className="search-box">
          <Search size={16} />
          <span className="sr-only">
            <Text text={"Search products"} />
          </span>
          <input
            autoFocus
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
          />
        </label>
      </div>
      <div className="product-modal-body">
        <div className="product-list" aria-busy={loading}>
          {results.map((product) => (
            <label
              className={`product-row ${draft.includes(product.id) ? "selected" : ""}`}
              key={product.id}
            >
              <input
                type="checkbox"
                checked={draft.includes(product.id)}
                onChange={() => toggle(product.id)}
                disabled={
                  (!product.available || draft.length >= 50) &&
                  !draft.includes(product.id)
                }
              />
              <span className="product-image">
                {product.image ? (
                  <Image src={product.image} alt="" width={44} height={44} />
                ) : (
                  <Package size={21} />
                )}
              </span>
              <span className="product-info">
                <strong>{product.name}</strong>
                <small>
                  {product.variantCount ?? product.variants?.length ?? 0}
                  {product.variantCount === undefined &&
                  product.variantsTruncated
                    ? "+"
                    : ""}{" "}
                  <Text text={"variants"} />
                  {" · "}
                  {product.available
                    ? product.stock + " in stock"
                    : "Unavailable"}
                </small>
              </span>
              <span>{money.format(product.price)}</span>
            </label>
          ))}
          {loading && (
            <p className="table-loading" role="status">
              <Text text={"Loading products…"} />
            </p>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                type="button"
                className="secondary"
                onClick={() => setRetry((value) => value + 1)}
              >
                <Text text={"Retry"} />
              </button>
            </div>
          )}
          {!loading && !error && !results.length && (
            <div className="empty-state">
              <h3>
                <Text text={"No products found"} />
              </h3>
              <p>
                <Text text={"Try another product name."} />
              </p>
            </div>
          )}
          {cursor && !loading && (
            <button
              type="button"
              className="secondary load-more"
              onClick={more}
            >
              <Text text={"Load more products"} />
            </button>
          )}
        </div>
        <aside className="selection-pane">
          <h3>
            <Text text={"Selected ("} />
            {draft.length})
          </h3>
          {draft.length ? (
            draft.map((id) => (
              <div className="selected-product" key={id}>
                <span>
                  {catalog.find((product) => product.id === id)?.name ??
                    "Unavailable product"}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${catalog.find((product) => product.id === id)?.name ?? "product"}`}
                  onClick={() => toggle(id)}
                >
                  <X size={15} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">
              <Text text={"No products selected."} />
            </p>
          )}
        </aside>
      </div>
      <footer className="modal-footer">
        <span>
          <Text
            text="{{count}} of 50 selected"
            values={{ count: draft.length }}
          />
        </span>
        <div className="button-row">
          <button type="button" className="secondary" onClick={close}>
            <Text text={"Cancel"} />
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onApply(draft);
              close();
            }}
          >
            <Text text={"Apply selection"} />
          </button>
        </div>
      </footer>
    </dialog>
  );
}
