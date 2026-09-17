import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { parseBundleInput } from "@/lib/bundle/validation";
import {
  deleteBundle,
  updateBundle,
  getBundleById,
} from "@/lib/shopify/bundles";
import { getProductsByIds } from "@/lib/shopify/products";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    requireAdmin(request);
    const bundle = await getBundleById((await context.params).id);
    if (!bundle) throw new AppError("Bundle not found", 404, "NOT_FOUND");
    return NextResponse.json(
      { bundle, products: await getProductsByIds(bundle.productIds) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireAdmin(request);
    return NextResponse.json({
      bundle: await updateBundle(
        (await context.params).id,
        parseBundleInput(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error, "Unable to update bundle");
  }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireAdmin(request);
    return NextResponse.json({
      deleted: await deleteBundle((await context.params).id),
    });
  } catch (error) {
    return apiError(error, "Unable to delete bundle");
  }
}
