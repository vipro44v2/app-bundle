import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getDashboardData } from "@/lib/shopify/dashboard";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return apiError(error, "Unable to load dashboard");
  }
}
