export const dynamic = "force-dynamic";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PostList } from "@/components/PostList";
import { ProjectGrid, projectFromPost } from "@/components/ProjectGrid";
import { listPosts } from "@/lib/posts";
import { PROJECT_PREVIEW } from "@/lib/project-preview";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const [work, thoughts] = await Promise.all([
    listPosts({ type: "work", status: "published" }),
    listPosts({ type: ["note", "essay"], status: "published" }),
  ]);
  const preview = process.env.NODE_ENV === "development" && (await searchParams).preview === "1";
  const projects = preview ? PROJECT_PREVIEW : work.map(projectFromPost);

  return (
    <>
      <section className="hero" aria-labelledby="intro-title">
        <p className="hero-eyebrow">Software. Hardware. Whatever’s next.</p>
        <h1 className="hero-headline" id="intro-title">I like making things.</h1>
        <p className="hero-support">
          I’m Seb. These are my projects, experiments, and the things
          I wanted to exist. Built on Salt Spring Island, BC.
        </p>
        <a href="#projects" className="hero-project-link">Explore the projects <span aria-hidden="true">↓</span></a>
      </section>

      <section className="home-projects" id="projects" aria-labelledby="projects-title">
        <div className="section-heading">
          <h2 id="projects-title">Projects & experiments</h2>
          <span className="section-caption">30 days of builds</span>
        </div>
        {preview ? <p className="preview-notice">Local design preview · proposed project selection, not published.</p> : null}
        {projects.length > 0 ? (
          <ProjectGrid projects={projects} />
        ) : (
          <EmptyState
            title="Projects are on the way."
            body="This is where the builds will live, with a closer look at each one."
          />
        )}
      </section>

      <section className="home-thoughts" aria-labelledby="thoughts-title">
        <div className="section-heading">
          <h2 id="thoughts-title">A few thoughts</h2>
          <Link href="/stream" className="quiet-link">All thoughts <span aria-hidden="true">↗</span></Link>
        </div>
        {thoughts.length > 0 ? (
          <PostList posts={thoughts.slice(0, 2)} />
        ) : (
          <p className="thoughts-empty">An occasional note on what I’m thinking about.</p>
        )}
      </section>
    </>
  );
}
