export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { ProjectGrid, projectFromPost } from "@/components/ProjectGrid";
import { listPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software, hardware, and experiments by Sebastien Gouin-Davis.",
};

export default async function WorkPage() {
  const workPosts = await listPosts({ type: "work", status: "published" });

  return (
    <>
      <PageIntro kicker="Projects" title="Things I’ve made.">
        <p>
          Projects and experiments, with a page for the details.
        </p>
      </PageIntro>
      <SectionRule
        left="Projects"
        right={`${workPosts.length} published`}
      />
      {workPosts.length > 0 ? (
        <ProjectGrid projects={workPosts.map(projectFromPost)} />
      ) : (
        <EmptyState
          title="No projects published yet."
          body="Projects will appear here when they are published."
        />
      )}
    </>
  );
}
