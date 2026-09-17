"use client";

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="content">
      <div className="empty-state">
        <h2>Something went wrong</h2>
        <p>{error.message || "Unable to load this page."}</p>
        <button className="primary" onClick={reset}>
          Retry
        </button>
      </div>
    </main>
  );
}
