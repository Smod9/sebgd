"use client";

import { useState } from "react";
import { ProjectGrid, type ProjectCard } from "@/components/ProjectGrid";
import { filterProjects, type ProjectGroup } from "@/lib/project-filters";

const groups: { value: ProjectGroup | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "software", label: "Software" },
  { value: "big-projects", label: "Big projects" },
  { value: "other", label: "Other stuff" },
];

export function ProjectExplorer({ projects }: { projects: ProjectCard[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ProjectGroup | "all">("all");
  const visible = filterProjects(projects, query, group);
  return <>
    <div className="project-tools">
      <div className="project-filters" role="group" aria-label="Filter projects">
        {groups.map((item) => <button key={item.value} type="button" aria-pressed={group === item.value} onClick={() => setGroup(item.value)}>{item.label}</button>)}
      </div>
      <label className="project-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input type="search" aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
    </div>
    <p className="sr-only" role="status">{visible.length} {visible.length === 1 ? "project" : "projects"} shown</p>
    {visible.length ? <ProjectGrid projects={visible} /> : <div className="project-no-results"><p>No projects match that search.</p><button type="button" className="quiet-link" onClick={() => { setQuery(""); setGroup("all"); }}>Clear filters</button></div>}
  </>;
}
