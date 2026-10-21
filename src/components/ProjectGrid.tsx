import { projectGroup, type ProjectGroup } from "@/lib/project-filters";
import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/types";

export type ProjectCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  cover?: string | null;
  tags: string[];
  group?: ProjectGroup;
};

export function projectFromPost(post: Post): ProjectCard {
  return {
    id: post.id,
    title: post.title,
    description: typeof post.meta.summary === "string" && post.meta.summary ? post.meta.summary : post.body.split("\n\n")[0],
    href: `/work/${post.slug}`,
    cover: post.cover_blob_url || `/api/social-card/${encodeURIComponent(post.slug)}`,
    tags: post.tags,
    group: projectGroup(post.tags, post.meta.group),
  };
}

export function ProjectGrid({ projects }: { projects: ProjectCard[] }) {
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <article key={project.id} className="work-item project-card">
          <Link
            href={project.href}
            className="project-link"
            target={project.href.startsWith("https://") ? "_blank" : undefined}
            rel={project.href.startsWith("https://") ? "noopener noreferrer" : undefined}
          >
            <div className={`project-cover${project.cover ? " has-image" : ""}`}>
              {project.cover ? (
                <Image
                  src={project.cover}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
                />
              ) : (
                <span className="project-cover-title" aria-hidden="true">{project.title}</span>
              )}
              <span className="project-arrow" aria-hidden="true">↗</span>
            </div>
            <div className="project-copy">
              {project.tags.length > 0 ? (
                <p className="project-category">{project.tags.slice(0, 2).join(" / ")}</p>
              ) : null}
              <h2>{project.title}</h2>
              {project.description ? <p className="project-description">{project.description}</p> : null}
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
