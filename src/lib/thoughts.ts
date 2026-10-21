import { listPosts } from "@/lib/posts";
import { isDesignPreview } from "@/lib/design-preview";

export async function listThoughts(preview = isDesignPreview()) {
  const posts = await listPosts({ type: "note", status: preview ? "all" : "published" });
  const published = posts.filter((post) => post.status === "published");
  return preview
    ? [...posts.filter((post) => post.status === "draft" && post.meta.starter === true), ...published]
    : published;
}
