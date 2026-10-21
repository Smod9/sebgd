export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
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
      <PageIntro kicker="The boat" title="Bon Vivant.">
        <p>
          The boat, its systems, and the work along the way.
        </p>
      </PageIntro>
      <Image src="/projects/bon-vivant.jpg" alt="Bon Vivant sailing under full sail" width={1024} height={768} sizes="(max-width: 1184px) 100vw, 1072px" className="boat-photo" />
      <SectionRule
        left="Logbook"
        right={logs.length ? `${logs.length} entries` : "no entries yet"}
      />
      {logs.length > 0 ? (
        <PostList posts={logs} />
      ) : (
        <EmptyState
          title="Logbook entries are on the way."
          body="Refit notes and updates will appear here."
          ctaHref="/work/bon-vivant"
          ctaLabel="About the refit"
        />
      )}
    </>
  );
}
