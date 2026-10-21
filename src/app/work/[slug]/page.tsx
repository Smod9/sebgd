import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/PageChrome";
import { renderMarkdown } from "@/lib/markdown";
import { getPost } from "@/lib/posts";
import { WORK_STUBS } from "@/lib/site";
import { projectUrl } from "@/lib/publishing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function publishedWork(slug: string) {
  const post = await getPost(slug);
  return post?.type === "work" && post.status === "published" && !post.deleted_at ? post : null;
}

export async function generateStaticParams() {
  return WORK_STUBS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await publishedWork(slug);
  return {
    title: post?.title || stub?.title || "Work",
    description: stub?.blurb,
    ...(post ? {
      description: typeof post.meta.summary === "string" ? post.meta.summary : post.body.split("\n\n")[0],
      openGraph: { images: [{ url: post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}`, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image" as const, images: [post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}`] },
    } : {}),
  };
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await publishedWork(slug);

  if (!stub && !post) notFound();

  const title = post?.title || stub!.title;
  const status = stub?.status ?? "Work";
  const body =
    post?.body ||
    stub?.blurb ||
    "More soon — this page is a stub until there is something worth keeping.";
  const html = await renderMarkdown(body);

  return (
    <article className="article-page">
      <PageIntro kicker={`Work · ${status}`} title={title}>
        <p>
          <Link href="/work" className="text-link">
            All work
          </Link>
        </p>
      </PageIntro>
      {post ? <div className="cta-group project-detail-links">
        {projectUrl(post.meta.demo_url) ? <a href={projectUrl(post.meta.demo_url)!} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Open project ↗</a> : null}
        {projectUrl(post.meta.instagram_url) ? <a href={projectUrl(post.meta.instagram_url)!} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Instagram ↗</a> : null}
        {projectUrl(post.meta.repo_url) ? <a href={projectUrl(post.meta.repo_url)!} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Source code ↗</a> : null}
      </div> : null}
      <div className="body-html" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
