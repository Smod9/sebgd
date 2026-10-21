export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { projectFromPost } from "@/components/ProjectGrid";
import { listPosts } from "@/lib/posts";
import { isDesignPreview } from "@/lib/design-preview";
import { listProjectShowcase } from "@/lib/project-showcase";
import { orderProjectCards } from "@/lib/project-filters";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software, hardware, and experiments by Sebastien Gouin-Davis.",
};

export default async function WorkPage({ searchParams }: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const workPosts = await listPosts({ type: "work", status: "published" });
  const preview = isDesignPreview((await searchParams)?.preview);
  const published = orderProjectCards(workPosts.map(projectFromPost));
  const projects = preview ? await listProjectShowcase(published) : published;

  return (
    <>
      <PageIntro kicker="Projects" title="Things I’ve made.">
        <p>
          Projects and experiments, with a page for the details.
        </p>
      </PageIntro>
      <SectionRule
        left="Projects"
        right={preview ? `${projects.length} in preview` : `${workPosts.length} published`}
      />
      {preview ? <p className="preview-notice">Local design preview · proposed project selection, not published.</p> : null}
      {projects.length > 0 ? (
        <ProjectExplorer projects={projects} />
      ) : (
        <EmptyState
          title="No projects published yet."
          body="Projects will appear here when they are published."
        />
      )}
    </>
  );
}
