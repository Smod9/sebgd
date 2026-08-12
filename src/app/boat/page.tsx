export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { PostList } from "@/components/PostList";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Bon Vivant",
  description: "Boat log for Bon Vivant — electrical, rig, tanks, and whatever fails next.",
};

export default async function BoatPage() {
  const logs = await listPosts({ type: "boat_log", status: "published" });

  return (
    <>
      <PageIntro kicker="Bon Vivant" title="A boat that keeps rewriting the plan.">
        <p>
          Logbook for the refit: electrical first, then whatever the boat
          decides is urgent. Expect unfinished sentences and honest status.
        </p>
      </PageIntro>
      <SectionRule
        left="Logbook"
        right={logs.length ? `${logs.length} entries` : "no entries yet"}
      />
      {logs.length > 0 ? (
        <PostList posts={logs} />
      ) : (
        <EmptyState
          title="Logbook is still dry."
          body="When the next tank, mast, or charging-path note is ready, it lands here — not a staged photo gallery."
          ctaHref="/work/bon-vivant"
          ctaLabel="Work stub"
        />
      )}
    </>
  );
}
