export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Side Quests",
  description: "Small builds and useful distractions.",
};

export default async function QuestsPage() {
  const quests = await listPosts({ type: "quest", status: "published" });

  return (
    <>
      <PageIntro kicker="Side Quests" title="Useful distractions.">
        <p>
          Prints, clips, bags, light pipes — the small things that keep the
          hands honest while the big projects argue with physics.
        </p>
      </PageIntro>
      <SectionRule
        left="Quests"
        right={quests.length ? `${quests.length} logged` : "queue empty"}
      />
      {quests.length > 0 ? (
        <PostList posts={quests} />
      ) : (
        <EmptyState
          title="No side quests filed."
          body="When a four-gram clip or a boom bag earns a write-up, it will show up here."
          ctaHref="/stream"
          ctaLabel="Back to stream"
        />
      )}
    </>
  );
}
