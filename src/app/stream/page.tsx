export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { PostList } from "@/components/PostList";
import { ThoughtGrid } from "@/components/ThoughtGrid";
import { listPosts } from "@/lib/posts";
import { listThoughts } from "@/lib/thoughts";

export const metadata: Metadata = {
  title: "Thoughts",
  description: "Chronological notes, builds, and fragments.",
  alternates: { types: { "application/rss+xml": "/rss.xml?type=note" } },
};

export default async function StreamPage() {
  const [posts, essays] = await Promise.all([
    listThoughts(),
    listPosts({ type: "essay", status: "published" }),
  ]);

  return (
    <>
      <PageIntro kicker="Thoughts" title="A few things I’ve thunk.">
        <p>
          Things I’m building, learning, and thinking about. Usually in 140 characters.
        </p>
        <a href="/rss.xml?type=note" className="quiet-link">Subscribe to thoughts via RSS ↗</a>
      </PageIntro>
      <SectionRule
        left="Entries"
        right={
          posts.length
            ? `${posts.filter((post) => post.status === "published").length} published`
            : "waiting on the first real one"
        }
      />
      {posts.some((post) => post.status === "draft") ? <p className="preview-notice">Local preview · editable draft starters, adapted from recent conversations. These have not been published.</p> : null}
      {posts.length > 0 ? (
        <ThoughtGrid posts={posts} />
      ) : (
        <EmptyState
          title="Nothing published yet."
          body="This page stays quiet until there is something I am willing to put my name on."
          ctaHref="/about"
          ctaLabel="Meanwhile, about"
        />
      )}
      {essays.length > 0 ? <section className="longer-writing"><h2>Longer writing</h2><PostList posts={essays} /></section> : null}
    </>
  );
}
