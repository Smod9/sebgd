import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/PageChrome";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, getPost, listPosts, typeLabel } from "@/lib/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const essays = await listPosts({ type: "essay", status: "published" });
  return essays.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.type !== "essay") return { title: "Writing" };
  return {
    title: post.title,
    description: post.body.slice(0, 160),
  };
}

export default async function WritingDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.type !== "essay" || post.status !== "published") {
    notFound();
  }

  const html = await renderMarkdown(post.body);

  return (
    <article className="article-page">
      <PageIntro kicker={typeLabel(post.type)} title={post.title}>
        <p className="mono tiny muted">
          {formatDate(post.published_at)}
          {" · "}
          <Link href="/writing" className="text-link">
            All writing
          </Link>
        </p>
      </PageIntro>
      <div className="body-html" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
