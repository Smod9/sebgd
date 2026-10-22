"use client";

import { PROJECT_SUMMARY_LIMIT } from "@/lib/project-descriptions";

export type ProjectFieldsValue = { summary: string; demoUrl: string; repoUrl: string; tags: string; group: string; instagramUrl: string; learnings: string };

export function ProjectFields({ value, onChange }: { value: ProjectFieldsValue; onChange: (value: ProjectFieldsValue) => void }) {
  const field = (key: keyof ProjectFieldsValue, text: string) => onChange({ ...value, [key]: text });
  const summaryLength = Array.from(value.summary.trim()).length;
  return (
    <div className="admin-grid project-fields">
      <label className="admin-label admin-span-2">Short description
        <textarea className="admin-input" rows={2} value={value.summary} onChange={(e) => field("summary", e.target.value)} aria-invalid={summaryLength > PROJECT_SUMMARY_LIMIT} placeholder="What does this do, and who is it for?" />
        <span className={summaryLength > PROJECT_SUMMARY_LIMIT ? "admin-error tiny" : "muted tiny"}>{summaryLength} / {PROJECT_SUMMARY_LIMIT} characters · Shown on project cards. Use the long description for the full story.</span>
      </label>
      <label className="admin-label">Demo or website URL
        <input className="admin-input" type="url" value={value.demoUrl} onChange={(e) => field("demoUrl", e.target.value)} placeholder="https://…" />
      </label>
      <label className="admin-label">Repository URL (optional)
        <input className="admin-input" type="url" value={value.repoUrl} onChange={(e) => field("repoUrl", e.target.value)} placeholder="https://github.com/…" />
      </label>
      <label className="admin-label admin-span-2">Instagram URL (optional)
        <input className="admin-input" type="url" value={value.instagramUrl} onChange={(e) => field("instagramUrl", e.target.value)} placeholder="https://www.instagram.com/…" />
      </label>
      <label className="admin-label admin-span-2">Categories (comma-separated)
        <input className="admin-input" value={value.tags} onChange={(e) => field("tags", e.target.value)} placeholder="Software, Hardware, Learning…" />
      </label>
      <label className="admin-label admin-span-2">Project group
        <select className="admin-input" value={value.group} onChange={(e) => field("group", e.target.value)}>
          <option value="">Auto from categories</option>
          <option value="software">Software</option>
          <option value="big-projects">Big projects</option>
          <option value="other">Other stuff</option>
        </select>
      </label>
      <label className="admin-label admin-span-2">What I learned (optional)
        <textarea className="admin-input" rows={5} value={value.learnings} onChange={(e) => field("learnings", e.target.value)} placeholder="What surprised you? What worked? What would you do differently?" />
        <span className="muted tiny">Supports Markdown. Appears on the project page when filled in.</span>
      </label>
      <p className="muted tiny admin-span-2">Use the project website’s official social-card image as its cover when available. Otherwise upload a 1200 × 630 image, or leave it blank for an automatic card.</p>
    </div>
  );
}
