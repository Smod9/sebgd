import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Local Markdown drafts only. No database, API, network, or publishing calls.
const root = process.cwd();
const starters = JSON.parse(await readFile(path.join(root, "content/thought-starters.json"), "utf8"));
const ideaDates = JSON.parse(await readFile(path.join(root, "content/thought-starter-dates.json"), "utf8"));
const directory = path.join(root, "content/posts");
await mkdir(directory, { recursive: true });
let created = 0;
for (const [index, body] of starters.entries()) {
  if (Array.from(body).length > 140) throw new Error(`Starter ${index + 1} exceeds 140 characters`);
  const slug = `thought-starter-${String(index + 1).padStart(2, "0")}`;
  const meta = { format: "thought", starter: true, created_at: new Date().toISOString(), idea_date: ideaDates[index], idea_date_approximate: true };
  const frontmatter = { id: slug, slug, title: Array.from(body).slice(0, 60).join(""), type: "note", status: "draft", published_at: null, meta };
  const source = "---\n" + Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n") + "\n---\n" + body + "\n";
  try {
    await writeFile(path.join(directory, slug + ".md"), source, { flag: "wx" });
    created++;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (process.argv.includes("--update-dates")) {
      const file = path.join(directory, slug + ".md");
      const existing = await readFile(file, "utf8");
      const match = existing.match(/^meta: (.+)$/m);
      const oldMeta = match ? JSON.parse(match[1]) : null;
      if (oldMeta?.starter === true) {
        const next = { ...oldMeta, idea_date: ideaDates[index], idea_date_approximate: true };
        const updated = existing.replace(/^meta: .+$/m, "meta: " + JSON.stringify(next));
        if (updated !== existing) await writeFile(file, updated);
      }
    }
  }
}
console.log(`Created ${created} local draft starters; preserved ${starters.length - created} existing texts.${process.argv.includes("--update-dates") ? " Updated approximate idea-date metadata." : ""} Nothing published.`);
