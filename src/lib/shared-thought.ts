import { getPost } from "@/lib/posts";
import { isDesignPreview } from "@/lib/design-preview";

export async function getSharedThought(slug: string) {
  const post = await getPost(slug);
  if (!post || post.type !== "note" || post.deleted_at) return null;
  return post.status === "published" || (isDesignPreview() && post.meta.starter === true) ? post : null;
}
