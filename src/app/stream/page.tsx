export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Stream",
  description: "Chronological notes, builds, and fragments.",
};

export default async function StreamPage() {
  const posts = await listPosts({ status: "published" });

  return (
    <>
      <PageIntro kicker="Stream" title="Chronological, when it exists.">
        <p>
          Short notes and longer scraps in the order they landed. No dashboard
          chrome — just the next thing written down.
        </p>
      </PageIntro>
      <SectionRule
        left="Entries"
        right={
          posts.length
            ? `${posts.length} published`
            : "waiting on the first real one"
        }
      />
      {posts.length > 0 ? (
        <PostList posts={posts} />
      ) : (
        <EmptyState
          title="Nothing published yet."
          body="This page stays quiet until there is something I am willing to put my name on."
          ctaHref="/about"
          ctaLabel="Meanwhile, about"
        />
      )}
    </>
  );
}
