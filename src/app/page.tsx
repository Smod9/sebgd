export const dynamic = "force-dynamic";

import Link from "next/link";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { EmptyState } from "@/components/EmptyState";
import { ThoughtQuote } from "@/components/ThoughtQuote";
import { projectFromPost } from "@/components/ProjectGrid";
import { listPosts } from "@/lib/posts";
import { listProjectShowcase } from "@/lib/project-showcase";
import { isDesignPreview } from "@/lib/design-preview";
import { listThoughts } from "@/lib/thoughts";
import { orderProjectCards } from "@/lib/project-filters";
import { SITE } from "@/lib/site";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const preview = isDesignPreview((await searchParams).preview);
  const [work, thoughts] = await Promise.all([
    listPosts({ type: "work", status: "published" }),
    listThoughts(false),
  ]);
  const published = orderProjectCards(work.map(projectFromPost));
  const projects = preview ? await listProjectShowcase(published) : published;

  return (
    <>
      <section className="hero" aria-labelledby="intro-title">
        <h1 className="hero-headline" id="intro-title">I can’t not make things.</h1>
        <p className="hero-support">
          Dad of 3. Sailor. Pilot. Builder of things.
        </p>
        <p className="hero-location">{SITE.location}</p>
      </section>

      <section className="home-projects" id="projects" aria-labelledby="projects-title">
        <div className="section-heading">
          <h2 id="projects-title">Projects & experiments</h2>
          <span className="section-caption">30 days of builds</span>
        </div>
        {preview ? <p className="preview-notice">Local design preview · proposed project selection, not published.</p> : null}
        {projects.length > 0 ? (
          <ProjectExplorer projects={projects} />
        ) : (
          <EmptyState
            title="Projects are on the way."
            body="This is where the builds will live, with a closer look at each one."
          />
        )}
      </section>

      <section className="home-thoughts" aria-labelledby="thoughts-title">
        <div className="section-heading">
          <h2 id="thoughts-title">Latest thought</h2>
          <Link href="/stream" className="quiet-link">More thoughts <span aria-hidden="true">↗</span></Link>
        </div>
        {thoughts.length > 0 ? (
          <ThoughtQuote post={thoughts[0]} />
        ) : (
          <p className="thoughts-empty">An occasional note on what I’m thinking about.</p>
        )}
        <p className="personal-note">
          Also on a personal vendetta to make SaaS companies pay for what they’ve
          done to the world. Mostly by building the thing myself.
        </p>
      </section>
    </>
  );
}
