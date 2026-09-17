import Link from "next/link";
export default function NotFound() {
  return (
    <main className="content">
      <div className="empty-state">
        <h2>Bundle not found</h2>
        <p>The requested bundle no longer exists.</p>
        <Link className="primary" href="/bundles">
          Back to bundles
        </Link>
      </div>
    </main>
  );
}
