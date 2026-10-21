import { projectFromPost, type ProjectCard } from "@/components/ProjectGrid";
import { listPosts, getPost } from "@/lib/posts";
import { isDesignPreview } from "@/lib/design-preview";
import { withProjectPreview } from "@/lib/project-preview";

export async function listProjectShowcase(published: ProjectCard[]) {
  if (!isDesignPreview("1")) return published;
  const projects = withProjectPreview(published);
  const drafts = (await listPosts({ type: "work", status: "draft" }))
    .filter((post) => post.meta.showcase_preview === true)
    .sort((a, b) => Number(a.meta.showcase_order ?? 999) - Number(b.meta.showcase_order ?? 999));
  for (const post of drafts) {
    if (projects.some((project) => project.id === post.id || project.title.toLowerCase() === post.title.toLowerCase())) continue;
    const card = { ...projectFromPost(post), previewEditId: post.id, needsAsset: post.meta.asset_needed === true };
    const position = typeof post.meta.showcase_position === "number" ? Math.max(0, Math.min(projects.length, post.meta.showcase_position)) : projects.length;
    projects.splice(position, 0, card);
  }
  return projects;
}

export async function getShowcaseWork(slug: string) {
  const post = await getPost(slug);
  if (!post || post.type !== "work" || post.deleted_at) return null;
  return post.status === "published" || (isDesignPreview() && post.meta.showcase_preview === true) ? post : null;
}
