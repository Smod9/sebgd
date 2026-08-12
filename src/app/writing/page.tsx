export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Essays and longer notes.",
};

export default async function WritingPage() {
  const essays = await listPosts({ type: "essay", status: "published" });

  return (
    <>
      <PageIntro kicker="Writing" title="Longer when it needs to be.">
        <p>
          Essays live here. Notes stay in the stream. If this page is empty, I
          am either thinking or sanding something on the boat.
        </p>
      </PageIntro>
      <SectionRule
        left="Essays"
        right={essays.length ? `${essays.length} published` : "none yet"}
      />
      {essays.length > 0 ? (
        <PostList posts={essays} />
      ) : (
        <EmptyState
          title="No essays published."
          body="I would rather leave this blank than invent a reading list. The stream may still have shorter notes."
          ctaHref="/stream"
          ctaLabel="Check the stream"
        />
      )}
    </>
  );
}
