import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/PageChrome";
import { renderMarkdown } from "@/lib/markdown";
import { getShowcaseWork } from "@/lib/project-showcase";
import { WORK_STUBS } from "@/lib/site";
import { projectUrl } from "@/lib/publishing";
import { ProjectPreview } from "@/components/ProjectPreview";
import { projectEmbedUrl } from "@/lib/project-embed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return WORK_STUBS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await getShowcaseWork(slug);
  return {
    title: post?.title || stub?.title || "Work",
    description: stub?.blurb,
    ...(post ? {
      ...(post.status === "draft" ? { robots: { index: false, follow: false } } : {}),
      description: typeof post.meta.summary === "string" ? post.meta.summary : post.body.split("\n\n")[0],
      openGraph: { images: [{ url: post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}`, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image" as const, images: [post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}`] },
    } : {}),
  };
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await getShowcaseWork(slug);

  if (!stub && !post) notFound();

  const title = post?.title || stub!.title;
  const status = stub?.status ?? "Work";
  const body =
    post?.body ||
    stub?.blurb ||
    "More soon — this page is a stub until there is something worth keeping.";
  const html = await renderMarkdown(body);
  const website = projectUrl(post?.meta.demo_url);
  const repository = projectUrl(post?.meta.repo_url);
  const instagram = projectUrl(post?.meta.instagram_url);
  const summary = typeof post?.meta.summary === "string" ? post.meta.summary : "";
  const lessons = typeof post?.meta.learnings === "string" ? post.meta.learnings.trim() : "";
  const lessonsHtml = lessons ? await renderMarkdown(lessons) : "";
  const cover = post ? post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}` : null;
  const renderImage = typeof post?.meta.render_image === "string" && (post.meta.render_image.startsWith("/projects/") || projectUrl(post.meta.render_image)) ? post.meta.render_image : null;
  const renderCaption = typeof post?.meta.render_caption === "string" ? post.meta.render_caption : "CAD model views.";

  return (
    <article className="article-page project-page">
      {post?.status === "draft" ? <p className="preview-notice">Local project draft · not published. <Link href={`/admin/posts/${encodeURIComponent(post.id)}`}>Edit project ↗</Link></p> : null}
      <Link href="/work" className="quiet-link project-back">← All projects</Link>
      <div className={`project-overview${cover ? " has-preview" : ""}`}>
        <div className="project-introduction">
          <PageIntro kicker={post?.tags.length ? post.tags.join(" / ") : status} title={title}>
            {summary ? <p>{summary}</p> : null}
          </PageIntro>
          {post ? <div className="cta-group project-detail-links">
            {website ? <a href={website} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Open project ↗</a> : null}
            {instagram ? <a href={instagram} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Instagram ↗</a> : null}
            {repository ? <a href={repository} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">Source code ↗</a> : null}
          </div> : null}
        </div>
        {cover ? <ProjectPreview key={slug} title={title} cover={cover} website={website} embedUrl={projectEmbedUrl(website, post?.meta.embed_preview)} coverPosition={typeof post?.meta.cover_position === "string" ? post.meta.cover_position : undefined} /> : null}
      </div>
      {renderImage ? <figure className="project-model-views">
        <a href={renderImage} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size ${title} model views`}>
          <Image src={renderImage} alt={`${title}: multi-angle renders of the actual model`} width={3600} height={2400} unoptimized sizes="(max-width: 800px) 100vw, 1200px" />
        </a>
        <figcaption>{renderCaption}</figcaption>
      </figure> : null}
      <div className={`project-story${lessons ? " has-lessons" : ""}`}>
        <section className="project-details" aria-label="Project details"><div className="body-html" dangerouslySetInnerHTML={{ __html: html }} /></section>
        {lessons ? <section className="project-lessons" aria-labelledby="lessons-title"><h2 id="lessons-title">What I learned</h2><div className="body-html" dangerouslySetInnerHTML={{ __html: lessonsHtml }} /></section> : null}
      </div>
    </article>
  );
}
