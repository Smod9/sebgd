import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import http from "node:http";
import { randomUUID } from "node:crypto";

let server, base, directory;
const token = randomUUID();
let output = "";
const file = (path, content) => ({ path, content_base64: Buffer.from(content).toString("base64") });
const name = "hosting-test";

async function api(method, slug = name, body, auth = true, extra = {}) {
  return fetch(`${base}/api/admin/sites${slug === null ? "" : `/${slug}`}`, {
    method, headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
// Node's fetch intentionally ignores an overridden Host header. Use HTTP here
// so these exercise the same Host routing as a real subdomain in a browser.
function hosted(url, slug = name, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(`${base}${url}`, { method, headers: { Host: `${slug}.sebgd.com`, ...headers } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(new Response(method === "HEAD" || [204, 304].includes(response.statusCode) ? null : Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
      response.on("error", reject);
    });
    request.on("error", reject); request.end();
  });
}

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "sebgd-static-test-"));
  const socket = net.createServer();
  await new Promise((resolve, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve); });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, VERCEL: "", DATABASE_URL: "", BLOB_READ_WRITE_TOKEN: "", SEBGD_ADMIN_TOKEN: token, SEBGD_STATIC_LOCAL_DIR: directory },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (data) => { output = (output + data).slice(-12000); });
  server.stderr.on("data", (data) => { output = (output + data).slice(-12000); });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/api/admin/sites`)).status === 401) return; } catch {}
    if (server.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Test server failed to start: ${output}`);
});

after(async () => {
  if (server && server.exitCode === null) { server.kill("SIGTERM"); await new Promise((resolve) => server.once("exit", resolve)); }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("hosting API requires the existing admin token for every operation", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) assert.equal((await api(method, name, method === "PUT" ? { files: [] } : undefined, false)).status, 401);
  assert.equal((await api("GET", null, undefined, false)).status, 401);
});

test("rejects reserved names, secrets, traversal, duplicates, oversized and incomplete sites", async () => {
  const good = [file("index.html", "hello")];
  for (const slug of ["www", "admin", "dojo", "cat", "schem", "sls", "bv", "bad.name", "-bad", "UPPER"]) {
    assert.equal((await api("PUT", slug, { revision: null, files: good })).status, 400, slug);
  }
  for (const files of [[file("app.js", "hi")], [...good, file(".env", "SECRET")], [...good, file("../secret.txt", "x")], [...good, file("%2e%2e/secret.txt", "x")], [...good, file("nested/.git/config.json", "x")], [...good, file("index.html", "again")], [...good, file("key.pem", "x")]]) {
    assert.equal((await api("PUT", name, { revision: null, files })).status, 400);
  }
  assert.equal((await api("PUT", name, { revision: null, files: [file("index.html", "x".repeat(3 * 1024 * 1024 + 1))] })).status, 413);
  assert.equal((await api("PUT", name, { files: good })).status, 400);
  assert.equal((await hosted("/")).status, 404);
});

let revision;
test("publishes HTML, scripts, nested indexes and exact binary assets on its subdomain", async () => {
  const response = await api("PUT", name, { revision: null, files: [
    file("index.html", '<!doctype html><link rel="stylesheet" href="/style.css"><h1>First version</h1><script src="/app.js"></script>'),
    file("style.css", "h1 { color: red }"), file("app.js", "document.body.dataset.ready='yes'"),
    file("docs/index.html", '<link rel="stylesheet" href="theme.css"><h1>Docs</h1>'),
    file("docs/theme.css", "body{color:blue}"), file("about.html", "About"),
    file("pixel.png", Buffer.from([137, 80, 78, 71, 0, 255, 1])),
  ] });
  assert.equal(response.status, 200, await response.clone().text());
  const { site } = await response.json(); revision = site.revision;
  assert.equal(site.url, "https://hosting-test.sebgd.com"); assert.equal(site.fileCount, 7);
  const page = await hosted("/"); assert.equal(page.status, 200); assert.match(page.headers.get("content-type"), /text\/html/); assert.match(await page.text(), /First version/);
  assert.equal((await hosted("/style.css")).headers.get("content-type"), "text/css; charset=utf-8");
  assert.deepEqual(Buffer.from(await (await hosted("/pixel.png")).arrayBuffer()), Buffer.from([137, 80, 78, 71, 0, 255, 1]));
  assert.equal((await hosted("/docs")).status, 308);
  assert.equal(new URL((await hosted("/docs")).headers.get("location")).pathname, "/docs/");
  assert.match(await (await hosted("/docs/")).text(), /Docs/);
  assert.equal(await (await hosted("/about")).text(), "About");
  assert.equal((await hosted("/missing.js")).status, 404);
  assert.equal((await hosted("/", "unpublished-site")).status, 404);
  assert.equal((await fetch(`${base}/hosted/${name}`)).status, 404);
  assert.equal((await hosted("/api/admin/posts")).status, 404);
  assert.equal((await hosted("/admin")).status, 404);
  assert.equal((await hosted("/", "admin")).status, 404);
  assert.equal((await hosted("/", "nested.hosting-test")).status, 404);
  assert.equal((await hosted("/.env")).status, 404);
  assert.equal((await hosted("/", name, {}, "POST")).status, 405);
  assert.equal((await hosted("/", name, { "If-None-Match": page.headers.get("etag") })).status, 304);
  assert.equal((await fetch(`${base}/`)).status, 200);
  const head = await hosted("/", name, {}, "HEAD");
  assert.equal(head.status, 200); assert.equal(await head.text(), "");
});

test("terminal publisher uploads a finished site folder", async () => {
  const command = spawn(process.execPath, ["scripts/publish-site.mjs", "--name", "cli-test", "examples/static-site"], { env: { ...process.env, SEBGD_ADMIN_TOKEN: token, SEBGD_SITE_URL: base }, stdio: ["ignore", "pipe", "pipe"] });
  let text = "";
  command.stdout.on("data", (data) => { text += data; });
  command.stderr.on("data", (data) => { text += data; });
  assert.equal(await new Promise((resolve) => command.once("exit", resolve)), 0, text);
  assert.match(text, /Published https:\/\/cli-test.sebgd.com/);
  assert.match(await (await hosted("/", "cli-test")).text(), /Its own address/);
  assert.match(await (await hosted("/about/", "cli-test")).text(), /Just files/);
});

test("rejects stale updates and switches a complete revision with SPA routing", async () => {
  const files = [file("index.html", "Second version"), file("new.css", "body{color:green}")];
  assert.equal((await api("PUT", name, { revision: null, files })).status, 409);
  const response = await api("PUT", name, { revision, files, spa: true });
  assert.equal(response.status, 200); const next = (await response.json()).site; const oldRevision = revision; revision = next.revision;
  assert.notEqual(revision, oldRevision);
  assert.equal(await (await hosted("/")).text(), "Second version");
  assert.equal((await hosted("/style.css")).status, 404);
  assert.equal(await (await hosted("/client/route", name, { Accept: "text/html" })).text(), "Second version");
  assert.equal((await hosted("/missing.js", name, { Accept: "text/html" })).status, 404);
  assert.equal((await hosted("/client/route", name, { Accept: "application/json" })).status, 404);
  assert.equal((await api("PUT", name, { revision: oldRevision, files })).status, 409);
  assert.equal((await api("DELETE", name, undefined, true, { "If-Match": oldRevision })).status, 409);
});

test("concurrent publishers cannot overwrite each other", async () => {
  const responses = await Promise.all(["A", "B"].map((version) => api("PUT", name, { revision, files: [file("index.html", `Concurrent ${version}`)] })));
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  const winner = await responses.find((response) => response.status === 200).json();
  revision = winner.site.revision;
  assert.equal((await hosted("/")).status, 200);
});

test("unpublishing removes the site and stale uploads cannot resurrect it", async () => {
  const response = await api("DELETE", name, undefined, true, { "If-Match": revision });
  assert.equal(response.status, 200);
  const offline = (await response.json()).site;
  assert.equal(offline.published, false);
  assert.equal((await hosted("/")).status, 404);
  assert.equal((await api("PUT", name, { revision, files: [file("index.html", "stale")] })).status, 409);
  const list = await (await api("GET", null)).json();
  assert.equal(list.sites[0].published, false);
  const form = new FormData(); form.set("revision", offline.revision); form.set("spa", "false");
  form.append("files", new File(["Multipart republish"], "index.html"));
  form.append("files", new File(["Nested multipart page"], "index.html"), "docs/index.html");
  form.append("files", new File(["body{color:navy}"], "theme.css"), "docs/theme.css");
  const republish = await fetch(`${base}/api/admin/sites/${name}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form });
  assert.equal(republish.status, 200, await republish.clone().text());
  assert.equal(await (await hosted("/")).text(), "Multipart republish");
  assert.equal(await (await hosted("/docs/")).text(), "Nested multipart page");
});
