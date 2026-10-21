import type { ProjectCard } from "@/components/ProjectGrid";

export type ProjectGroup = "software" | "big-projects" | "other";

export function projectGroup(tags: string[], group?: unknown): ProjectGroup {
  if (group === "software" || group === "big-projects" || group === "other") return group;
  const categories = tags.map((tag) => tag.toLowerCase());
  if (categories.some((tag) => ["ongoing", "big projects"].includes(tag))) return "big-projects";
  if (categories.some((tag) => ["software", "web", "ai"].includes(tag))) return "software";
  return "other";
}

const searchable = (value: string) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function filterProjects(projects: ProjectCard[], query: string, group: ProjectGroup | "all") {
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
  return projects.filter((project) => {
    if (group !== "all" && projectGroup(project.tags, project.group) !== group) return false;
    const text = searchable([project.title, project.description, ...project.tags].join(" "));
    return terms.every((term) => text.includes(term));
  });
}
