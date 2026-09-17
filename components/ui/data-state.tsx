"use client";
import Text from "@/components/localization/text";
import { RequestError } from "@/lib/admin-fetch";
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="page-content" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton skeleton-title" />
      <div className="surface skeleton-rows">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const auth =
    error instanceof RequestError &&
    (error.status === 401 || error.status === 503);
  return (
    <div className="page-content">
      <section className="surface empty-state" role="alert">
        <h1>{auth ? "Connect to your store" : "Unable to load this page"}</h1>
        <p>{error.message}</p>
        <div className="button-row">
          {auth && (
            <a className="primary" href="/api/auth" target="_top">
              <Text text={"Open Shopify admin"} />
            </a>
          )}
          <button type="button" className="secondary" onClick={retry}>
            <Text text={"Retry"} />
          </button>
        </div>
      </section>
    </div>
  );
}
