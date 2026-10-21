import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

// Load the actual page and content store without a running Next server or live DB.
// TypeScript is already a project dependency; no test framework is added.
function loadSource(filename, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = new Module(filename);
  loaded.filename = filename;
  cache.set(filename, loaded);
  const nativeRequire = createRequire(filename);
  loaded.require = (id) => {
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/")
        ? path.join(root, "src", id.slice(2))
        : path.resolve(path.dirname(filename), id);
      const local = [base + ".ts", base + ".tsx"].find(existsSync);
      if (local) return loadSource(local, cache);
    }
    return nativeRequire(id);
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}

async function renderPage(posts, page = "work/page.tsx", query = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "sebgd-work-test-"));
  const previousCwd = process.cwd();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  try {
    const content = path.join(directory, "content", "posts");
    mkdirSync(content, { recursive: true });
    for (const post of posts) {
      const { body = "Project details.", ...frontmatter } = post;
      // JSON is valid YAML and safely encodes fixture strings.
      const fields = Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n");
      writeFileSync(path.join(content, `${post.slug}.md`), `---\n${fields}\n---\n${body}\n`);
    }
    process.chdir(directory);
    process.env.DATABASE_URL = "";
    const { default: Page } = loadSource(path.join(root, "src/app", page));
    return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(query) }));
  } finally {
    process.chdir(previousCwd);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    rmSync(directory, { recursive: true, force: true });
  }
}

const renderWork = (posts) => renderPage(posts);

function project(slug, overrides = {}) {
  return {
    id: slug,
    slug,
    title: `Project ${slug}`,
    type: "work",
    status: "published",
    published_at: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

test("lists real published work with correct links and newest first, without placeholders", async () => {
  const html = await renderWork([
    project("older-build", { body: "First paragraph.\n\nMore details." }),
    project("new-build", { published_at: "2026-10-02T12:00:00.000Z" }),
  ]);
  assert.match(html, /href="\/work\/new-build"/);
  assert.match(html, /href="\/work\/older-build"/);
  assert.ok(html.indexOf("Project new-build") < html.indexOf("Project older-build"));
  assert.match(html, /2 published/);
  assert.match(html, /First paragraph\./);
  assert.doesNotMatch(html, /More details\.|href="\/work\/(luum|x-poe|bon-vivant)"/);
});

test("excludes draft, deleted, and non-work posts using the real content-store filters", async () => {
  const html = await renderWork([
    project("visible"),
    project("draft-secret", { status: "draft" }),
    project("deleted-secret", { deleted_at: "2026-10-03T12:00:00.000Z" }),
    project("random-thought", { type: "note" }),
    project("essay", { type: "essay" }),
  ]);
  assert.match(html, /Project visible/);
  assert.match(html, /1 published/);
  assert.doesNotMatch(html, /draft-secret|deleted-secret|random-thought|Project essay/);
});

test("shows an honest empty state when there are no published projects", async () => {
  const html = await renderWork([project("draft-only", { status: "draft" })]);
  assert.match(html, /0 published/);
  assert.match(html, /No projects published yet\./);
  assert.doesNotMatch(html, /class="work-item"|href="\/work\//);
});

test("uses published titles for legacy slugs and handles an empty body", async () => {
  const html = await renderWork([project("luum", { title: "Actual project title", body: "" })]);
  assert.match(html, /href="\/work\/luum">[\s\S]*?<h2>Actual project title<\/h2>[\s\S]*?<\/a>/);
  assert.doesNotMatch(html, /Company home for X-PoE|<p><\/p>/);
});

test("renders published project covers and tags in the grid", async () => {
  const html = await renderWork([project("pictured", { cover_blob_url: "https://example.com/project.png", tags: ["Hardware", "Software"] })]);
  assert.match(html, /class="project-grid"/);
  assert.match(html, /src="https:\/\/example.com\/project.png"/);
  assert.match(html, /Hardware \/ Software/);
});

test("homepage shows published projects and thoughts without proposed projects by default", async () => {
  const html = await renderPage([
    project("real-build"),
    project("unpublished-build", { status: "draft" }),
    project("a-thought", { type: "note" }),
  ], "page.tsx");
  assert.match(html, /href="\/work\/real-build"/);
  assert.match(html, /href="\/stream#a-thought"/);
  assert.doesNotMatch(html, /unpublished-build|Letters &amp; Marbles|Local design preview/);
});

test("proposed project selection is available only in development with explicit preview query", async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    const html = await renderPage([], "page.tsx", { preview: "1" });
    assert.match(html, /Local design preview/);
    assert.match(html, /Letters &amp; Marbles/);
    assert.match(html, /The boat/);
    assert.match(html, /href="https:\/\/luum.io"/);
    process.env.NODE_ENV = "production";
    const production = await renderPage([], "page.tsx", { preview: "1" });
    assert.doesNotMatch(production, /Local design preview|Letters &amp; Marbles|href="https:\/\/luum.io"/);
    assert.match(production, /Projects are on the way/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
