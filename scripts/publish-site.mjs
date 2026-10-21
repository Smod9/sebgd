#!/usr/bin/env node
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const nameIndex = args.indexOf("--name");
  const name = nameIndex >= 0 ? args[nameIndex + 1] : undefined;
  if (nameIndex >= 0) args.splice(nameIndex, 2);
  const spa = args.includes("--spa");
  const source = args.filter((arg) => arg !== "--spa");
  if (!name || source.length !== 1 || source[0].startsWith("--")) {
    throw new Error("Usage: npm run publish:site -- --name my-build ./dist [--spa]\nYou can also supply a single HTML file. Set SEBGD_ADMIN_TOKEN in your environment.");
  }
  if (!process.env.SEBGD_ADMIN_TOKEN) throw new Error("Set SEBGD_ADMIN_TOKEN in your environment first.");
  const base = new URL(process.env.SEBGD_SITE_URL || "https://sebgd.com");
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) throw new Error("Use HTTPS, or HTTP on localhost for local testing.");
  const files = [];
  let total = 0;
  async function addFile(filename, relative) {
    const stat = await lstat(filename);
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
    if (stat.isDirectory()) {
      for (const entry of await readdir(filename)) {
        if (entry === ".DS_Store") continue;
        if (entry.startsWith(".") || entry === "node_modules") throw new Error(`Refusing private/build-source entry: ${path.join(relative, entry)}. Choose the finished static output folder.`);
        await addFile(path.join(filename, entry), relative ? `${relative}/${entry}` : entry);
      }
    } else if (stat.isFile()) {
      total += stat.size;
      if (total > 3 * 1024 * 1024 || files.length >= 100) throw new Error("Site exceeds 100 files or 3 MB.");
      files.push({ path: relative, content_base64: (await readFile(filename)).toString("base64") });
    } else throw new Error(`Unsupported entry: ${relative}`);
  }
  const target = path.resolve(source[0]);
  const stat = await lstat(target);
  if (stat.isFile() && !/\.html?$/i.test(target)) throw new Error("Supply an HTML file or a finished site folder.");
  await addFile(target, stat.isFile() ? "index.html" : "");
  if (!files.some((file) => file.path === "index.html")) throw new Error("The site needs index.html at its root.");
  const url = new URL(`/api/admin/sites/${encodeURIComponent(name)}`, base);
  const headers = { Authorization: `Bearer ${process.env.SEBGD_ADMIN_TOKEN}`, "Content-Type": "application/json" };
  const currentResponse = await fetch(url, { headers });
  const current = await currentResponse.json();
  if (!currentResponse.ok) throw new Error(current.error || "Could not read site status.");
  console.log(`Publishing ${files.length} files to ${name}.sebgd.com…`);
  const response = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ files, spa, revision: current.site?.revision ?? null }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Publish failed. Reload the site status before retrying.");
  console.log(`Published ${result.site.url}\nRevision: ${result.site.revision}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
