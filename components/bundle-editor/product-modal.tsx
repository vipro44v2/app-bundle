"use client";

import Image from "next/image";
import { Package, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CatalogProduct, ProductPage } from "@/types/product";
import { isApiError } from "@/types/api";

type ModalProduct = Omit<CatalogProduct, "available"> & { available?: boolean };
type Props = {
  catalog: ModalProduct[];
  initialCursor: string | null;
  selected: string[];
  onApply: (ids: string[]) => void;
  onProductsLoaded: (products: ModalProduct[]) => void;
  close: () => void;
};

function ProductVisual({ product }: { product: ModalProduct }) {
  return (
    <span className="product-image" style={{ background: product.color }}>
      {product.image ? (
        <Image src={product.image} alt="" width={48} height={48} />
      ) : (
        product.emoji
      )}
    </span>
  );
}

export default function ProductModal({
  catalog,
  initialCursor,
  selected,
  onApply,
  onProductsLoaded,
  close,
}: Props) {
  const [query, setQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState(selected);
  const [results, setResults] = useState(catalog);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const initialCatalogRef = useRef(catalog);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    searchRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [close]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults(initialCatalogRef.current);
      setNextCursor(initialCursor);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/shopify/products?query=${encodeURIComponent(normalized)}`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok || isApiError(payload))
          throw new Error(
            isApiError(payload) ? payload.error : "Unable to search products",
          );
        const page = payload as ProductPage;
        setResults(page.products);
        setNextCursor(page.nextCursor);
        onProductsLoaded(page.products);
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to search products",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialCursor, onProductsLoaded, query]);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      if (query.trim()) params.set("query", query.trim());
      const response = await fetch(`/api/shopify/products?${params}`);
      const payload: unknown = await response.json();
      if (!response.ok || isApiError(payload))
        throw new Error(
          isApiError(payload) ? payload.error : "Unable to load products",
        );
      const page = payload as ProductPage;
      setResults((current) => [...current, ...page.products]);
      setNextCursor(page.nextCursor);
      onProductsLoaded(page.products);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load products",
      );
    } finally {
      setLoading(false);
    }
  };
  const toggle = (id: string) =>
    setDraftSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        ref={dialogRef}
      >
        <div className="modal-head">
          <div>
            <h2 id="product-modal-title">Select products</h2>
            <p>Choose products or individual variants for this bundle.</p>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close product selector"
          >
            <X size={21} />
          </button>
        </div>
        <div className="modal-body">
          <div className="product-pane">
            <div className="modal-search">
              <div className="search-box">
                <Search size={17} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                />
              </div>
            </div>
            <div className="product-list">
              {results.map((product) => (
                <label
                  className={`product-row ${draftSelected.includes(product.id) ? "selected" : ""} ${!product.available ? "unavailable" : ""}`}
                  key={product.id}
                >
                  <input
                    type="checkbox"
                    checked={draftSelected.includes(product.id)}
                    onChange={() => toggle(product.id)}
                    disabled={
                      !product.available && !draftSelected.includes(product.id)
                    }
                  />
                  <ProductVisual product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.vendor}</small>
                    <p>
                      <span
                        className={
                          product.available ? "active-stock" : "no-stock"
                        }
                      >
                        {product.available ? "Available" : "Unavailable"}
                      </span>{" "}
                      {product.stock > 0
                        ? `${product.stock} in stock`
                        : "Inventory not available"}
                    </p>
                  </div>
                  <b>${product.price.toFixed(2)}</b>
                </label>
              ))}
              {loading && (
                <div className="table-loading">Loading products…</div>
              )}
              {error && <div className="api-error">{error}</div>}
              {!loading && !error && !results.length && (
                <div className="table-empty">
                  <strong>No products found</strong>
                </div>
              )}
              {nextCursor && !loading && (
                <button
                  type="button"
                  className="secondary product-load-more"
                  onClick={loadMore}
                >
                  Load more products
                </button>
              )}
            </div>
          </div>
          <aside className="selection-pane">
            <div>
              <h3>Selected</h3>
              <p>{draftSelected.length} products</p>
            </div>
            <div className="selected-list">
              {!draftSelected.length ? (
                <div className="empty-mini">
                  <Package size={25} />
                  <p>No products selected</p>
                </div>
              ) : (
                catalog
                  .filter((product) => draftSelected.includes(product.id))
                  .map((product) => (
                    <div key={product.id}>
                      <ProductVisual product={product} />
                      <div>
                        <strong>{product.name}</strong>
                        <small>All variants</small>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => toggle(product.id)}
                        aria-label={`Remove ${product.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </aside>
        </div>
        <div className="modal-footer">
          <span>
            {draftSelected.length} product
            {draftSelected.length !== 1 ? "s" : ""} selected
          </span>
          <div>
            <button className="secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                onApply(draftSelected);
                close();
              }}
              disabled={!draftSelected.length}
            >
              Add to bundle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
