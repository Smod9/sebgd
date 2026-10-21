import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThoughtGrid } from "@/components/ThoughtGrid";
import { getSharedThought } from "@/lib/shared-thought";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getSharedThought(slug);
  if (!post) return {};
  const url = `/thoughts/${encodeURIComponent(slug)}`;
  const image = `/api/thought-social-card/${encodeURIComponent(slug)}`;
  return {
    title: "A thought from Seb",
    description: post.body.slice(0, 280),
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: "A thought from Sebastien Gouin-Davis", description: post.body.slice(0, 280), images: [{ url: image, width: 1200, height: 630, alt: post.body }] },
    twitter: { card: "summary_large_image", title: "A thought from Sebastien Gouin-Davis", description: post.body.slice(0, 280), images: [image] },
    ...(post.status === "draft" ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function SharedThoughtPage({ params }: Props) {
  const { slug } = await params;
  const post = await getSharedThought(slug);
  if (!post) notFound();
  return <section className="shared-thought-page">
    <h1 className="sr-only">A thought from Sebastien Gouin-Davis</h1>
    {post.status === "draft" ? <p className="preview-notice">Local draft preview · not published.</p> : null}
    <ThoughtGrid posts={[post]} />
    <Link href="/stream" className="text-link">More thoughts ↗</Link>
  </section>;
}
