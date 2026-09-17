import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/bundle/validation";

export function apiError(error: unknown, fallback = "Unexpected server error") {
  if (error instanceof ValidationError)
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.fields },
      { status: 400 },
    );
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
      code: "SERVER_ERROR",
    },
    { status: 500 },
  );
}
