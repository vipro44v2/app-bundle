import EditorPage from "@/components/bundle-editor/editor-page";
import { validateBundleId } from "@/lib/bundle/validation";
export default async function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EditorPage id={validateBundleId((await params).id)} />;
}
