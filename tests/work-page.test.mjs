import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { execFileSync } from "node:child_process";
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
    if (id === "next/navigation") return { ...nativeRequire(id), useRouter: () => ({ push() {} }) };
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
  assert.match(html, /href="\/thoughts\/a-thought"/);
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

test("local preview survives navigation to Projects and stays disabled in production", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.SEBGD_DESIGN_PREVIEW;
  try {
    process.env.NODE_ENV = "development";
    process.env.SEBGD_DESIGN_PREVIEW = "1";
    for (const page of ["page.tsx", "work/page.tsx"]) {
      const html = await renderPage([], page);
      assert.match(html, /Local design preview/);
      assert.match(html, /Letters &amp; Marbles/);
      const publishedOnly = await renderPage([], page, { preview: "0" });
      assert.doesNotMatch(publishedOnly, /Local design preview|Letters &amp; Marbles/);
    }
    process.env.NODE_ENV = "production";
    for (const page of ["page.tsx", "work/page.tsx"]) {
      const html = await renderPage([], page, { preview: "1" });
      assert.doesNotMatch(html, /Local design preview|Letters &amp; Marbles/);
    }
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.SEBGD_DESIGN_PREVIEW;
    else process.env.SEBGD_DESIGN_PREVIEW = previousFlag;
  }
});

async function withLocalStore(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "sebgd-publishing-test-"));
  const previousCwd = process.cwd();
  const previousDatabase = process.env.DATABASE_URL;
  try {
    process.chdir(directory);
    process.env.DATABASE_URL = "";
    const cache = new Map();
    const source = (file) => loadSource(path.join(root, "src", file), cache);
    await run(source);
  } finally {
    process.chdir(previousCwd);
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
    rmSync(directory, { recursive: true, force: true });
  }
}

test("short thoughts enforce 140 Unicode characters, save drafts, and publish edited text", async () => {
  await withLocalStore(async (source) => {
    const store = source("lib/posts.ts");
    const input = { type: "note", title: "", body: "🙂".repeat(140), meta: { format: "thought" }, status: "draft" };
    const draft = await store.createPost(input);
    assert.match(draft.slug, /^thought-/);
    assert.equal(draft.published_at, null);
    assert.equal((await store.listPosts({ status: "published" })).length, 0);
    await assert.rejects(() => store.createPost({ ...input, body: "🙂".repeat(141) }), /140 characters/);
    await assert.rejects(() => store.updatePost({ id: draft.id }, { body: "x".repeat(141) }), /140 characters/);
    const published = await store.updatePost({ id: draft.id }, { body: "The edited thought.", status: "published" });
    assert.equal(published.body, "The edited thought.");
    assert.equal(published.title, "The edited thought.");
    assert.ok(published.published_at);
    assert.equal((await store.listPosts({ status: "published" })).length, 1);
    await store.createPost({ type: "note", title: "Older long note", body: "x".repeat(400), status: "published" });
    assert.equal((await store.listPosts({ status: "published" })).length, 2);
  });
});

test("project pipeline keeps metadata, uses the automatic card, and hides drafts from detail pages", async () => {
  await withLocalStore(async (source) => {
    const store = source("lib/posts.ts");
    const draft = await store.createPost({ type: "work", slug: "new-tool", title: "New Tool", body: "Implementation details.", status: "draft", meta: { summary: "What the tool solves.", demo_url: "https://example.com/demo", repo_url: "https://github.com/example/tool" } });
    const { default: Detail } = source("app/work/[slug]/page.tsx");
    await assert.rejects(() => Detail({ params: Promise.resolve({ slug: draft.slug }) }), (error) => error.digest?.includes("404"));
    const social = source("app/api/social-card/[slug]/route.tsx");
    assert.equal((await social.GET(new Request("http://localhost/api/social-card/new-tool"), { params: Promise.resolve({ slug: draft.slug }) })).status, 404);
    await store.publishPost(draft.slug);
    const post = await store.getPost(draft.slug);
    const { projectFromPost } = source("components/ProjectGrid.tsx");
    assert.equal(projectFromPost(post).cover, "/api/social-card/new-tool");
    assert.equal(projectFromPost(post).description, "What the tool solves.");
    const html = renderToStaticMarkup(await Detail({ params: Promise.resolve({ slug: draft.slug }) }));
    assert.match(html, /href="https:\/\/example.com\/demo"/);
    assert.match(html, /Source code/);
    await assert.rejects(() => store.updatePost({ id: post.id }, { meta: { demo_url: "javascript:alert(1)" } }), /http or https/);
  });
});

test("thought grids omit subject lines and expose draft starters only in the local preview", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.SEBGD_DESIGN_PREVIEW;
  try {
    const posts = [
      project("public-thought", { type: "note", title: "A SUBJECT THAT SHOULD NOT RENDER", body: "The thought itself.", meta: { format: "thought" } }),
      project("starter", { type: "note", status: "draft", published_at: null, body: "An editable starter.", meta: { starter: true, format: "thought" } }),
    ];
    process.env.NODE_ENV = "development";
    process.env.SEBGD_DESIGN_PREVIEW = "1";
    const preview = await renderPage(posts, "stream/page.tsx");
    assert.match(preview, /href="\/admin\/posts\/starter"/);
    assert.match(preview, /An editable starter\./);
    assert.doesNotMatch(preview, /A SUBJECT THAT SHOULD NOT RENDER/);
    process.env.NODE_ENV = "production";
    const live = await renderPage(posts, "stream/page.tsx");
    assert.match(live, /The thought itself\./);
    assert.doesNotMatch(live, /An editable starter|Draft starter|A SUBJECT THAT SHOULD NOT RENDER/);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.SEBGD_DESIGN_PREVIEW;
    else process.env.SEBGD_DESIGN_PREVIEW = previousFlag;
  }
});

test("starter seeding creates 15 undated drafts and preserves subsequent user edits", () => {
  const starters = JSON.parse(readFileSync(path.join(root, "content/thought-starters.json"), "utf8"));
  assert.equal(starters.length, 15);
  assert.equal(new Set(starters).size, 15);
  const directory = mkdtempSync(path.join(tmpdir(), "sebgd-seeder-test-"));
  mkdirSync(path.join(directory, "content"));
  for (const file of ["thought-starters.json", "thought-starter-dates.json"]) writeFileSync(path.join(directory, "content", file), readFileSync(path.join(root, "content", file)));
  try {
  execFileSync(process.execPath, [path.join(root, "scripts/seed-thoughts.mjs")], { cwd: directory });
  for (const [index, body] of starters.entries()) {
    assert.ok(Array.from(body).length <= 140);
    const file = path.join(directory, "content/posts", `thought-starter-${String(index + 1).padStart(2, "0")}.md`);
    const text = readFileSync(file, "utf8");
    assert.match(text, /status: "draft"/);
    assert.match(text, /published_at: null/);
    assert.equal(text.split("---\n").at(-1).trim(), body);
  }
  const first = path.join(directory, "content/posts/thought-starter-01.md");
  const edited = readFileSync(first, "utf8").replace(starters[0], "The user’s edited thought.");
  writeFileSync(first, edited);
  execFileSync(process.execPath, [path.join(root, "scripts/seed-thoughts.mjs"), "--update-dates"], { cwd: directory });
  assert.equal(readFileSync(first, "utf8"), edited);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("thoughts-only RSS excludes projects and all drafts, including preview starters", async () => {
  await withLocalStore(async (source) => {
    const store = source("lib/posts.ts");
    await store.createPost({ type: "note", slug: "published-thought", title: "A thought", body: "Text with ]]> and & symbols.", status: "published" });
    await store.createPost({ type: "work", slug: "published-project", title: "A project", body: "Project notes", status: "published" });
    await store.createPost({ type: "note", slug: "private-starter", title: "Secret draft starter", body: "Draft only", status: "draft", meta: { format: "thought", starter: true } });
    const { GET } = source("app/rss.xml/route.ts");
    const thoughts = await GET(new Request("http://localhost/rss.xml?type=note"));
    assert.match(thoughts.headers.get("content-type"), /application\/rss\+xml/);
    const xml = await thoughts.text();
    assert.match(xml, /published-thought/);
    assert.doesNotMatch(xml, /published-project|private-starter|Secret draft/);
    assert.match(xml, /\]\]\]\]><!\[CDATA\[>/);
    const all = await (await GET(new Request("http://localhost/rss.xml"))).text();
    assert.match(all, /published-project/);
    assert.doesNotMatch(all, /private-starter/);
  });
});

test("thumbs up persist, stay idempotent per visitor, and can be undone", async () => {
  await withLocalStore(async (source) => {
    const likes = source("lib/thought-likes.ts");
    const visitor = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    assert.deepEqual(await likes.setThoughtLike("note-one", visitor, true), { count: 1, liked: true });
    assert.deepEqual(await likes.setThoughtLike("note-one", visitor, true), { count: 1, liked: true });
    assert.deepEqual(await likes.setThoughtLike("note-one", other, true), { count: 2, liked: true });
    assert.deepEqual(await likes.setThoughtLike("note-one", visitor, false), { count: 1, liked: false });
    const reloaded = loadSource(path.join(root, "src/lib/thought-likes.ts"));
    assert.deepEqual((await reloaded.readThoughtLikes(["note-one"], other))["note-one"], { count: 1, liked: true });
  });
});

test("public reaction API rejects drafts and cross-site writes", async () => {
  await withLocalStore(async (source) => {
    const store = source("lib/posts.ts");
    const note = await store.createPost({ type: "note", title: "Hello", body: "A public thought", status: "published" });
    const draft = await store.createPost({ type: "note", title: "Draft", body: "Not public", status: "draft" });
    const api = source("app/api/thought-likes/route.ts");
    const initial = await api.GET(new Request(`http://localhost/api/thought-likes?ids=${note.id}`));
    const cookie = initial.headers.get("set-cookie").split(";")[0];
    assert.match(cookie, /^sebgd_thought_visitor=/);
    const request = (id, origin = "http://localhost") => new Request("http://localhost/api/thought-likes", { method: "POST", headers: { "Content-Type": "application/json", cookie, origin }, body: JSON.stringify({ id, liked: true }) });
    assert.equal((await api.POST(request(draft.id))).status, 404);
    assert.equal((await api.POST(request(note.id, "https://other.example"))).status, 403);
    assert.deepEqual((await (await api.POST(request(note.id))).json()).reaction, { count: 1, liked: true });
    assert.deepEqual((await (await api.POST(request(note.id))).json()).reaction, { count: 1, liked: true });
  });
});

test("shared thoughts supply quote metadata and a real 1200x630 PNG while keeping drafts private", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.SEBGD_DESIGN_PREVIEW;
  try {
    process.env.NODE_ENV = "production";
    process.env.SEBGD_DESIGN_PREVIEW = "1";
    await withLocalStore(async (source) => {
      const store = source("lib/posts.ts");
      const quote = "Loved Diaspora by Greg Egan. A book that rewires how I think.";
      await store.createPost({ type: "note", slug: "greg-egan", title: "Internal title", body: quote, status: "published", meta: { format: "thought" } });
      await store.createPost({ type: "note", slug: "private-quote", title: "Private", body: "Still a draft", status: "draft", meta: { format: "thought", starter: true } });
      await store.createPost({ type: "work", slug: "not-a-thought", title: "Project", body: "Project", status: "published" });
      const page = source("app/thoughts/[slug]/page.tsx");
      const image = source("app/api/thought-social-card/[slug]/route.tsx");
      const props = (slug) => ({ params: Promise.resolve({ slug }) });
      const metadata = await page.generateMetadata(props("greg-egan"));
      assert.equal(metadata.openGraph.url, "/thoughts/greg-egan");
      assert.equal(metadata.openGraph.description, quote);
      assert.equal(metadata.openGraph.images[0].url, "/api/thought-social-card/greg-egan");
      assert.equal(metadata.twitter.card, "summary_large_image");
      const html = renderToStaticMarkup(await page.default(props("greg-egan")));
      assert.match(html, /Diaspora by Greg Egan/);
      const response = await image.GET(new Request("http://localhost/api/thought-social-card/greg-egan"), props("greg-egan"));
      assert.match(response.headers.get("content-type"), /image\/png/);
      const png = Buffer.from(await response.arrayBuffer());
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 630);
      for (const slug of ["private-quote", "not-a-thought", "missing"]) {
        assert.equal((await image.GET(new Request(`http://localhost/api/thought-social-card/${slug}`), props(slug))).status, 404);
        await assert.rejects(() => page.default(props(slug)), (error) => error.digest?.includes("404"));
      }
      await store.softDeletePost({ slug: "greg-egan" });
      assert.equal((await image.GET(new Request("http://localhost/api/thought-social-card/greg-egan"), props("greg-egan"))).status, 404);
    });
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.SEBGD_DESIGN_PREVIEW; else process.env.SEBGD_DESIGN_PREVIEW = previousFlag;
  }
});

test("homepage features only the newest published thought as a pull quote, even during design preview", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.SEBGD_DESIGN_PREVIEW;
  try {
    process.env.NODE_ENV = "development";
    process.env.SEBGD_DESIGN_PREVIEW = "1";
    const html = await renderPage([
      project("older", { type: "note", body: "An older published thought.", published_at: "2026-10-19T12:00:00Z" }),
      project("latest", { type: "note", body: "The latest published thought.", published_at: "2026-10-20T12:00:00Z" }),
      project("unpublished", { type: "note", body: "A private new draft.", status: "draft", meta: { starter: true } }),
    ], "page.tsx");
    assert.match(html, /<blockquote class="thought-pullquote">/);
    assert.match(html, /The latest published thought\./);
    assert.match(html, /href="\/thoughts\/latest"/);
    assert.match(html, /href="\/stream"/);
    assert.doesNotMatch(html, /An older published thought|A private new draft|A few things I’ve thunk/);
    const stream = await renderPage([], "stream/page.tsx");
    assert.match(stream, /A few things I’ve thunk\./);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.SEBGD_DESIGN_PREVIEW; else process.env.SEBGD_DESIGN_PREVIEW = previousFlag;
  }
});

test("project filters combine groups and case-insensitive search across titles, descriptions, and categories", () => {
  const { filterProjects } = loadSource(path.join(root, "src/lib/project-filters.ts"));
  const cards = [
    { id: "app", title: "Articulation Dojo", description: "Practice speaking clearly.", tags: ["Software", "AI"] },
    { id: "boat", title: "Bon Vivant", description: "Electrical refit", tags: ["Ongoing"] },
    { id: "podcast", title: "Final Draft", description: "A podcast about AI and humanity", tags: ["Podcast"], group: "other" },
    { id: "print", title: "Éléments", description: "Printed marble tracks", tags: ["Learning"] },
  ];
  assert.deepEqual(filterProjects(cards, "", "software").map((card) => card.id), ["app"]);
  assert.deepEqual(filterProjects(cards, "electrical", "big-projects").map((card) => card.id), ["boat"]);
  assert.deepEqual(filterProjects(cards, "  FINAL   humanity ", "other").map((card) => card.id), ["podcast"]);
  assert.deepEqual(filterProjects(cards, "elements", "all").map((card) => card.id), ["print"]);
  assert.equal(filterProjects(cards, "no match", "all").length, 0);
});
