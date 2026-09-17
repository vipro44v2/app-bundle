import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") forwarded.set(key, value);
  }
  redirect(`/dashboard${forwarded.size ? `?${forwarded.toString()}` : ""}`);
}
