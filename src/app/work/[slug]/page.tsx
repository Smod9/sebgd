import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/PageChrome";
import { renderMarkdown } from "@/lib/markdown";
import { getPost } from "@/lib/posts";
import { WORK_STUBS } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return WORK_STUBS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await getPost(slug);
  return {
    title: post?.title || stub?.title || "Work",
    description: stub?.blurb,
  };
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const stub = WORK_STUBS.find((w) => w.slug === slug);
  const post = await getPost(slug);

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
      <div className="body-html" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
