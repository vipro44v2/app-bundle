"use client";
import Text from "@/components/localization/text";
import Link from "next/link";
import { Plus, Search, RefreshCw, Package, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BundleRecord } from "@/types/bundle";
import {
  publicationStatus,
  type PublicationStatus,
} from "@/lib/bundle/publication";
import { adminFetch } from "@/lib/admin-fetch";
import ConfirmDialog from "@/components/ui/confirm-dialog";
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
export default function BundleList({
  initialBundles,
  reload,
  refreshing = false,
}: {
  initialBundles: BundleRecord[];
  reload: () => void;
  refreshing?: boolean;
}) {
  const [bundles, setBundles] = useState(initialBundles);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"All" | PublicationStatus>("All");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<BundleRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    setBundles(initialBundles);
  }, [initialBundles]);
  const filtered = useMemo(
    () =>
      bundles
        .filter(
          (bundle) =>
            (tab === "All" || publicationStatus(bundle, now) === tab) &&
            bundle.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        ),
    [bundles, query, tab, sort, now],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const remove = async () => {
    if (!target || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await adminFetch<{ deleted: string }>(
        `/api/bundles/${encodeURIComponent(target.id)}`,
        { method: "DELETE" },
      );
      if (result.deleted !== target.id)
        throw new Error("The bundle could not be deleted. Please retry.");
      setBundles((items) => items.filter((bundle) => bundle.id !== target.id));
      setNotice(`“${target.name}” deleted`);
      setTarget(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete bundle",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="page-content">
      <header className="page-heading">
        <div>
          <h1>
            <Text text={"Bundles"} />
          </h1>
          <p>
            <Text
              text={"Manage your offers, products and publishing status."}
            />
          </p>
        </div>
        <Link className="primary" href="/bundles/new">
          <Plus size={16} />
          <Text text={"Create bundle"} />
        </Link>
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
      <section
        className="surface bundle-surface"
        aria-label="Bundle list"
        aria-busy={refreshing}
      >
        <div className="list-tabs" role="group" aria-label="Filter by status">
          {(["All", "Active", "Draft", "Scheduled", "Ended"] as const).map(
            (item) => (
              <button
                type="button"
                aria-pressed={tab === item}
                key={item}
                onClick={() => {
                  setTab(item);
                  setPage(1);
                }}
              >
                <Text text={item} />
                <span>
                  {item === "All"
                    ? bundles.length
                    : bundles.filter(
                        (bundle) => publicationStatus(bundle, now) === item,
                      ).length}
                </span>
              </button>
            ),
          )}
        </div>
        <div className="list-toolbar">
          <label className="search-box">
            <Search size={16} />
            <span className="sr-only">
              <Text text={"Search bundles"} />
            </span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search bundles"
            />
          </label>
          <label className="sort-label">
            <span className="sr-only">
              <Text text={"Sort bundles"} />
            </span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="updated">
                <Text text={"Recently updated"} />
              </option>
              <option value="name">
                <Text text={"Name A–Z"} />
              </option>
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            onClick={reload}
            disabled={refreshing}
            aria-label="Refresh bundles"
          >
            <RefreshCw size={15} />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
        {error && !target && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {visible.length ? (
          <table className="bundle-table">
            <caption className="sr-only">
              <Text text={"Bundles with products, discounts and status"} />
            </caption>
            <thead>
              <tr>
                {[
                  "Bundle",
                  "Products",
                  "Discount",
                  "Status",
                  "Updated",
                  "Actions",
                ].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((bundle) => (
                <tr key={bundle.id}>
                  <td className="bundle-name">
                    <Link
                      href={`/bundles/${encodeURIComponent(bundle.id)}/edit`}
                    >
                      {bundle.name}
                    </Link>
                    <span>{bundle.type}</span>
                  </td>
                  <td data-label="Products">{bundle.products}</td>
                  <td data-label="Discount">
                    {bundle.type === "Volume discount"
                      ? "Tiered"
                      : bundle.type === "Buy X get Y"
                        ? "Buy X get Y"
                        : bundle.discount + "%"}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status ${publicationStatus(bundle, now).toLowerCase()}`}
                    >
                      <Text text={publicationStatus(bundle, now)} />
                    </span>
                  </td>
                  <td data-label="Updated">
                    {Number.isFinite(Date.parse(bundle.updatedAt))
                      ? dateFormat.format(new Date(bundle.updatedAt))
                      : "Unknown"}
                  </td>
                  <td className="row-actions">
                    <Link
                      className="secondary"
                      href={`/bundles/${encodeURIComponent(bundle.id)}/edit`}
                    >
                      <Text text={"Edit"} />
                      <span className="sr-only"> {bundle.name}</span>
                    </Link>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Delete ${bundle.name}`}
                      onClick={() => {
                        setError("");
                        setTarget(bundle);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <Package size={28} />
            <h2>
              {bundles.length
                ? "No matching bundles"
                : "Create your first bundle"}
            </h2>
            <p>
              {bundles.length
                ? "Try a different name or clear your filters."
                : "Group products and set up an offer for your customers."}
            </p>
            {bundles.length ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setQuery("");
                  setTab("All");
                }}
              >
                <Text text={"Clear filters"} />
              </button>
            ) : (
              <Link className="primary" href="/bundles/new">
                <Text text={"Create bundle"} />
              </Link>
            )}
          </div>
        )}
        <footer className="list-footer">
          <span>
            <Text
              text="Showing {{from}}–{{to}} of {{count}} bundles"
              values={{
                from: filtered.length ? (currentPage - 1) * 20 + 1 : 0,
                to: Math.min(currentPage * 20, filtered.length),
                count: filtered.length,
              }}
            />
          </span>
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <Text text={"Previous"} />
            </button>
            <button
              type="button"
              className="secondary"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <Text text={"Next"} />
            </button>
          </div>
        </footer>
      </section>
      {target && (
        <ConfirmDialog
          title={`Delete “${target.name}”?`}
          busy={busy}
          onCancel={() => {
            setTarget(null);
            setError("");
          }}
          onConfirm={remove}
        >
          <p>
            <Text
              text={
                "This removes the bundle offer. Your Shopify products will be kept. This action cannot be undone."
              }
            />
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
