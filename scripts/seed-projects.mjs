import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

// Local Markdown drafts only. Never contacts the database, a deployment, or an API.
const root = process.cwd();
const items = JSON.parse(await readFile(path.join(root, "content/project-starters.json"), "utf8"));
const directory = path.join(root, "content/posts");
await mkdir(directory, { recursive: true });
const existing = await Promise.all((await readdir(directory)).filter((name) => name.endsWith(".md")).map(async (name) => matter(await readFile(path.join(directory, name), "utf8")).data));
let created = 0;
for (const [index, item] of items.entries()) {
  if (existing.some((post) => post.slug === item.slug || (post.type === "work" && String(post.title).toLowerCase() === item.title.toLowerCase()))) continue;
  const meta = {
    summary: item.summary, learnings: item.learnings || "", group: item.group, demo_url: item.demo_url || "",
    showcase_preview: true, showcase_order: index, showcase_position: item.position,
    asset_needed: Boolean(item.asset_needed), review_notes: item.review_notes,
    cover_position: item.cover_position,
    embed_preview: item.embed_preview,
  };
  const front = { id: `project-${item.slug}`, slug: item.slug, title: item.title, type: "work", status: "draft", published_at: null, tags: item.tags, cover_blob_url: item.cover || null, meta };
  const source = "---\n" + Object.entries(front).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n") + "\n---\n" + item.body + "\n";
  try { await writeFile(path.join(directory, `${item.slug}.md`), source, { flag: "wx" }); created++; }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
console.log(`Created ${created} local project drafts; preserved existing entries. Nothing published.`);
