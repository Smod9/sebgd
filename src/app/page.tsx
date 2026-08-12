export const dynamic = "force-dynamic";

import Link from "next/link";
import { CtaGroup, SectionRule } from "@/components/PageChrome";
import { EmptyState } from "@/components/EmptyState";
import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";
import { SITE } from "@/lib/site";

export default async function HomePage() {
  const posts = await listPosts({ status: "published" });
  const preview = posts.slice(0, 4);

  return (
    <>
      <section className="hero" aria-label="Introduction">
        <p className="hero-brand" aria-label="SEB">
          SEB
        </p>
        <h1 className="hero-headline">Things under construction.</h1>
        <p className="hero-support">
          Notes, builds, essays, boats, and useful distractions.
        </p>
        <p className="hero-meta mono tiny muted">{SITE.location}</p>
        <CtaGroup />
      </section>

      <section className="home-stream" aria-label="Recent stream">
        <SectionRule
          left="Stream"
          right={
            posts.length
              ? `${posts.length} ${posts.length === 1 ? "entry" : "entries"}`
              : "quiet for now"
          }
        />
        {preview.length > 0 ? (
          <>
            <PostList posts={preview} />
            {posts.length > preview.length ? (
              <p style={{ marginTop: 8 }}>
                <Link href="/stream" className="text-link">
                  Full stream
                </Link>
              </p>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="The stream is empty on purpose."
            body="When something is worth writing down, it will show up here — no filler, no fake metrics."
            ctaHref="/about"
            ctaLabel="About Seb"
          />
        )}
      </section>
    </>
  );
}
