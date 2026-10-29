import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const hostile = '</text><image href="http://127.0.0.1:9/card"/><style>*{fill:red}</style>';
let directory, server, base;
let output = "";

async function fixture(slug, type, body, extra = {}) {
  const front = { slug, type, title: `Speak: ${body}`, status: "published", tags: [body], meta: { summary: body }, ...extra };
  const fields = Object.entries(front).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  await writeFile(path.join(directory, "content/posts", `${slug}.md`), `---\n${fields}\n---\n${body}\n`);
}

before(async () => {
  // Run the built application against a temporary content root. No authored
  // files, database, Blob store, or real admin credentials are used.
  directory = await mkdtemp(path.join(tmpdir(), "sebgd-card-http-"));
  await mkdir(path.join(directory, "content/posts"), { recursive: true });
  for (const name of [".next", "node_modules", "public", "package.json", "next.config.ts"]) {
    await symlink(path.join(root, name), path.join(directory, name));
  }
  await symlink(path.join(root, "content/project-domains.json"), path.join(directory, "content/project-domains.json"));
  await fixture("valid-project", "work", "Quotes: \"double\", 'single', & <angle> — café.");
  await fixture("hostile-project", "work", hostile);
  await fixture("hostile-thought", "note", hostile);
  await fixture("valid-thought", "note", "Line one\nLine two with **Markdown** & <svg>literal markup</svg>.");
  await fixture("draft-project", "work", "Private project", { status: "draft", meta: { showcase_preview: true } });
  await fixture("draft-thought", "note", "Private thought", { status: "draft", meta: { starter: true } });
  await fixture("deleted-project", "work", "Deleted project", { deleted_at: "2026-10-29T00:00:00Z" });
  await fixture("deleted-thought", "note", "Deleted thought", { deleted_at: "2026-10-29T00:00:00Z" });
  const socket = net.createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: directory,
    env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", VERCEL: "", DATABASE_URL: "", BLOB_READ_WRITE_TOKEN: "", SEBGD_ADMIN_TOKEN: "", SEBGD_DESIGN_PREVIEW: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (data) => { output = (output + data).slice(-12000); });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/api/social-card/missing`)).status === 404) return; } catch {}
    if (server.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Production server did not start: ${output}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    await exited;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("production social-card routes render valid and hostile text and ignore request formatting", async () => {
  for (const [route, slugs] of [["social-card", ["valid-project", "hostile-project"]], ["thought-social-card", ["valid-thought", "hostile-thought"]]]) {
    for (const slug of slugs) {
      const url = `${base}/api/${route}/${slug}`;
      const response = await fetch(url);
      assert.equal(response.status, 200, output);
      assert.match(response.headers.get("content-type"), /image\/png/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const png = Buffer.from(await response.arrayBuffer());
      const { info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 1200);
      assert.equal(info.height, 630);
      const query = new URLSearchParams({ title: hostile, style: "fill:red", preview: "1" });
      const altered = await fetch(`${url}?${query}`);
      assert.equal(altered.status, 200);
      assert.deepEqual(Buffer.from(await altered.arrayBuffer()), png);
    }
  }
});

test("production card routes reject missing, wrong-type, draft, and deleted posts", async () => {
  for (const [route, slugs] of [["social-card", ["missing", "hostile-thought", "draft-project", "deleted-project"]], ["thought-social-card", ["missing", "hostile-project", "draft-thought", "deleted-thought"]]]) {
    for (const slug of slugs) assert.equal((await fetch(`${base}/api/${route}/${slug}?preview=1`)).status, 404);
  }
});

test("production image optimization still resizes public PNGs and rejects arbitrary remote sources", async () => {
  const query = new URLSearchParams({ url: "/seb-sailing.png", w: "256", q: "75" });
  const response = await fetch(`${base}/_next/image?${query}`, { headers: { Accept: "image/webp" } });
  assert.equal(response.status, 200, output);
  assert.match(response.headers.get("content-type"), /image\/webp/);
  const decoded = await sharp(Buffer.from(await response.arrayBuffer())).raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, 256);
  assert.ok(decoded.info.height > 0);
  query.set("url", "https://example.com/untrusted.svg");
  assert.equal((await fetch(`${base}/_next/image?${query}`)).status, 400);
});
