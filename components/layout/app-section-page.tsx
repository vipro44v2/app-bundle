import Link from "next/link";

export default function AppSectionPage({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-16 pt-8 sm:px-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-green-700">
        {eyebrow}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-[28px] font-bold tracking-[-.6px]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6d7175]">{description}</p>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-semibold text-white no-underline shadow-sm hover:bg-green-700"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      <section className="mt-7 rounded-xl border border-[#e3e3e3] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.08)]">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        <p className="mb-0 mt-2 text-sm text-[#6d7175]">
          This section is ready for configuration.
        </p>
      </section>
    </div>
  );
}
