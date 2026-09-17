"use client";

import Link from "next/link";
import { Clock3, Gift, Package, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BundleRecord, BundleStatus } from "@/types/bundle";
import { isApiError } from "@/types/api";

const primary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-green-700 bg-green-600 px-3.5 text-[13px] font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd4ce] bg-white px-3.5 text-[13px] font-semibold text-[#26332c] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function BundleList({
  initialBundles,
}: {
  initialBundles: BundleRecord[];
}) {
  const router = useRouter();
  const [bundles, setBundles] = useState(initialBundles);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"All" | BundleStatus>("All");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(() => new Set());
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bundles.filter(
      (bundle) =>
        (tab === "All" || bundle.status === tab) &&
        (!normalized || bundle.name.toLowerCase().includes(normalized)),
    );
  }, [bundles, query, tab]);
  const remove = async (bundle: BundleRecord) => {
    if (
      !window.confirm(`Delete “${bundle.name}”? This cannot be undone.`) ||
      deleting.has(bundle.id)
    )
      return;
    setDeleting((current) => new Set(current).add(bundle.id));
    setError("");
    try {
      const response = await fetch(
        `/api/bundles/${encodeURIComponent(bundle.id)}`,
        { method: "DELETE" },
      );
      const payload: unknown = await response.json();
      if (!response.ok || isApiError(payload))
        throw new Error(
          isApiError(payload) ? payload.error : "Unable to delete bundle",
        );
      setBundles((current) => current.filter((item) => item.id !== bundle.id));
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete bundle",
      );
    } finally {
      setDeleting((current) => {
        const next = new Set(current);
        next.delete(bundle.id);
        return next;
      });
    }
  };
  return (
    <div className="mx-auto w-full max-w-[1220px] px-4 pb-[70px] pt-6 sm:px-[34px] sm:pt-8">
      <div className="mb-[26px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1.5 text-[10px] font-bold tracking-[1.5px] text-green-700">
            SHOPIFY CATALOG
          </p>
          <h1 className="m-0 text-[28px] font-bold leading-tight tracking-[-.7px]">
            Bundles
          </h1>
          <p className="mt-1.5 text-[#6d7175]">
            Create and manage offers stored directly in your Shopify admin.
          </p>
        </div>
        <Link className={primary} href="/bundles/new">
          <Plus className="block" size={18} />
          Create bundle
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-sm">
        <div className="flex gap-1 border-b border-[#e1e3e5] px-4 pt-2">
          {(["All", "Active", "Draft"] as const).map((item) => (
            <button
              key={item}
              className={`flex min-h-10 items-center gap-1.5 border-b-2 px-3 text-[13px] font-semibold ${tab === item ? "border-green-600 text-green-700" : "border-transparent text-[#6d7175] hover:text-[#202223]"}`}
              onClick={() => setTab(item)}
            >
              {item}
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">
                {item === "All"
                  ? bundles.length
                  : bundles.filter((bundle) => bundle.status === item).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-b border-[#e1e3e5] p-3 sm:flex-row">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#cbd4ce] px-3 text-[#6d7175]">
            <Search className="block shrink-0" size={17} />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bundles"
            />
          </div>
          <button className={secondary} onClick={() => router.refresh()}>
            <Clock3 className="block" size={17} />
            Refresh
          </button>
        </div>
        {error && (
          <div className="m-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button
              className="font-semibold underline"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-[#6d7175]">
                <tr>
                  {[
                    "Bundle",
                    "Type",
                    "Products",
                    "Discount",
                    "Updated",
                    "Status",
                    "",
                  ].map((heading) => (
                    <th
                      className="border-b border-[#e1e3e5] px-4 py-3 font-semibold"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((bundle) => (
                  <tr
                    className="border-b border-[#edf0ee] last:border-0 hover:bg-gray-50"
                    key={bundle.id}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-green-50 text-green-600">
                          <Gift className="block" size={19} />
                        </span>
                        <strong className="truncate">{bundle.name}</strong>
                      </div>
                    </td>
                    <td className="px-4 py-3">{bundle.type}</td>
                    <td className="px-4 py-3">{bundle.products}</td>
                    <td className="px-4 py-3 font-semibold">
                      {bundle.discount}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(bundle.updatedAt))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${bundle.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}
                      >
                        {bundle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          className={secondary}
                          href={`/bundles/${encodeURIComponent(bundle.id)}/edit`}
                        >
                          Edit
                        </Link>
                        <button
                          className="grid size-10 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={deleting.has(bundle.id)}
                          aria-label={`Delete ${bundle.name}`}
                          onClick={() => remove(bundle)}
                        >
                          <Trash2 className="block" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <Package className="mx-auto mb-3 text-[#6d7175]" size={28} />
              <strong className="block text-base">No bundles found</strong>
              <span className="mb-4 mt-1 block text-sm text-[#6d7175]">
                Create a bundle to save it directly in Shopify.
              </span>
              <Link className={primary} href="/bundles/new">
                <Plus className="block" size={17} />
                Create bundle
              </Link>
            </div>
          </div>
        )}
        <div className="border-t border-[#e1e3e5] px-4 py-3 text-xs text-[#6d7175]">
          Showing {filtered.length} of {bundles.length} bundles
        </div>
      </div>
    </div>
  );
}
