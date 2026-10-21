import { ImageResponse } from "next/og";
import { ProjectSocialCard } from "@/components/ProjectSocialCard";
import { getPost } from "@/lib/posts";
import { isDesignPreview } from "@/lib/design-preview";
import { PROJECT_PREVIEW } from "@/lib/project-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const preview = isDesignPreview() ? PROJECT_PREVIEW.find((project) => project.id === slug) : undefined;
  if ((!post || post.type !== "work" || post.status !== "published" || post.deleted_at) && !preview) {
    return new Response("Not found", { status: 404 });
  }
  const title = preview?.title ?? post!.title;
  const description = preview?.description ?? (typeof post!.meta.summary === "string" ? post!.meta.summary : post!.body.split("\n\n")[0]);
  return new ImageResponse(<ProjectSocialCard title={title} description={description} tags={preview?.tags ?? post!.tags} />, {
    width: 1200, height: 630,
    headers: { "Cache-Control": "no-store" },
  });
}
