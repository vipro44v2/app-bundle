export type ApiError = { error: string; code?: string; details?: unknown };
export type ApiResult<T> = T | ApiError;

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  );
}
