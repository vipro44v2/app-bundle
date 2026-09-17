import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { parseBundleInput } from "@/lib/bundle/validation";
import { createBundle, getBundles } from "@/lib/shopify/bundles";

export async function GET() {
  try {
    return NextResponse.json({ bundles: await getBundles() });
  } catch (error) {
    return apiError(error, "Unable to load bundles");
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { bundle: await createBundle(parseBundleInput(await request.json())) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "Unable to create bundle");
  }
}
