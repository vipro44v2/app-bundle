import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/shopify/dashboard";
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json(await getDashboardData(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error, "Unable to load dashboard");
  }
}
