import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/bundle/validation";
import { AppError } from "@/lib/errors";
export function apiError(
  error: unknown,
  fallback = "Unable to complete this request. Please try again.",
) {
  const headers = { "Cache-Control": "no-store" };
  if (error instanceof ValidationError)
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.fields },
      { status: 400, headers },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Invalid JSON request body", code: "INVALID_JSON" },
      { status: 400, headers },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers },
    );
  console.error("Request failed", {
    type: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json(
    { error: fallback, code: "SERVER_ERROR" },
    { status: 500, headers },
  );
}
