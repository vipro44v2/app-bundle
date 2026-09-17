import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { parseBundleInput } from "@/lib/bundle/validation";
import { deleteBundle, updateBundle } from "@/lib/shopify/bundles";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({
      bundle: await updateBundle(
        decodeURIComponent(id),
        parseBundleInput(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error, "Unable to update bundle");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json({
      deleted: await deleteBundle(decodeURIComponent(id)),
    });
  } catch (error) {
    return apiError(error, "Unable to delete bundle");
  }
}
