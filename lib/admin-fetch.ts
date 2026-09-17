"use client";
import { isApiError } from "@/types/api";
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!path.startsWith("/api/"))
    throw new Error("Admin requests must use a local API path");
  const headers = new Headers(options.headers);
  const bridge = (
    window as Window & { shopify?: { idToken: () => Promise<string> } }
  ).shopify;
  if (bridge?.idToken && window.top !== window.self) {
    const token = await Promise.race([
      bridge.idToken(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Shopify authentication timed out. Reopen the app from Shopify admin.",
              ),
            ),
          10000,
        ),
      ),
    ]);
    headers.set("Authorization", "Bearer " + token);
  }
  const response = await fetch(path, {
    ...options,
    headers,
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || isApiError(payload))
    throw new RequestError(
      isApiError(payload)
        ? payload.error
        : "Unable to complete the request. Please retry.",
      response.status,
      isApiError(payload)
        ? (payload.details as Record<string, string>)
        : undefined,
    );
  return payload as T;
}
