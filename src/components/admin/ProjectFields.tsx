"use client";

export type ProjectFieldsValue = { summary: string; demoUrl: string; repoUrl: string; tags: string; group: string };

export function ProjectFields({ value, onChange }: { value: ProjectFieldsValue; onChange: (value: ProjectFieldsValue) => void }) {
  const field = (key: keyof ProjectFieldsValue, text: string) => onChange({ ...value, [key]: text });
  return (
    <div className="admin-grid project-fields">
      <label className="admin-label admin-span-2">Short description
        <textarea className="admin-input" rows={2} maxLength={220} value={value.summary} onChange={(e) => field("summary", e.target.value)} placeholder="What does this do, and who is it for?" />
      </label>
      <label className="admin-label">Demo or website URL
        <input className="admin-input" type="url" value={value.demoUrl} onChange={(e) => field("demoUrl", e.target.value)} placeholder="https://…" />
      </label>
      <label className="admin-label">Repository URL (optional)
        <input className="admin-input" type="url" value={value.repoUrl} onChange={(e) => field("repoUrl", e.target.value)} placeholder="https://github.com/…" />
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
      <p className="muted tiny admin-span-2">Upload a 1200 × 630 cover, or leave it blank for an automatic social card. Other photos crop to fit.</p>
    </div>
  );
}
