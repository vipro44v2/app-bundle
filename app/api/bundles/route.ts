import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { parseBundleInput } from "@/lib/bundle/validation";
import { createBundle, getBundles } from "@/lib/shopify/bundles";
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json(
      { bundles: await getBundles() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, "Unable to load bundles");
  }
}
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json(
      { bundle: await createBundle(parseBundleInput(await request.json())) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "Unable to create bundle");
  }
}
