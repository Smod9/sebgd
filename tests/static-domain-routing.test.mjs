import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function loadSource(relative, mocks = {}) {
  const filename = fileURLToPath(new URL(`../${relative}`, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const loaded = new Module(filename); loaded.filename = filename;
  const nativeRequire = createRequire(filename);
  loaded.require = (id) => id in mocks ? mocks[id] : nativeRequire(id);
  loaded._compile(source, filename);
  return loaded.exports;
}

const rules = loadSource("src/lib/static-sites/rules.ts");

test("migrated static domains use the publisher while existing app aliases remain reserved", () => {
  assert.equal(rules.validateSiteName("shift"), "shift");
  assert.equal(rules.hostedSiteName("shift.sebgd.com"), "shift");
  assert.equal(rules.validateSiteName("maze"), "maze");
  assert.equal(rules.hostedSiteName("maze.sebgd.com"), "maze");
  for (const name of ["cat", "dojo", "marbles", "bv", "sls", "schem", "www", "admin"]) assert.throws(() => rules.validateSiteName(name), /reserved/);
  for (const name of ["cat", "dojo", "marbles", "bv", "sls", "schem", "www"]) assert.equal(rules.hostedSiteName(`${name}.sebgd.com`), null);
  const config = loadSource("next.config.ts").default;
  const redirects = config.redirects();
  assert.ok(!redirects.some((redirect) => redirect.has.some((condition) => condition.value === "shift.sebgd.com")));
  assert.ok(redirects.some((redirect) => redirect.has.some((condition) => condition.value === "cat.sebgd.com")));
});

test("unknown subdomains redirect to the homepage without carrying paths or query data", async () => {
  const { serveSite } = loadSource("src/lib/static-sites/serve.ts", {
    "@/lib/static-sites/rules": rules,
    "@/lib/static-sites/store": { readSite: async () => null },
    "@/lib/static-sites/storage": { readObject: async () => { throw new Error("No assets should be read for an unknown site"); } },
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await serveSite(new Request("https://typo.sebgd.com/api/admin/posts?next=https://example.com", { method, headers: { "x-forwarded-host": "example.com" } }), "typo", "/api/admin/posts");
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://sebgd.com/");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("unpublished sites and missing assets on real sites keep returning 404", async () => {
  for (const site of [{ published: false }, { published: true, files: [], spa: false }]) {
    const { serveSite } = loadSource("src/lib/static-sites/serve.ts", {
      "@/lib/static-sites/rules": rules,
      "@/lib/static-sites/store": { readSite: async () => ({ site }) },
      "@/lib/static-sites/storage": { readObject: async () => null },
    });
    const response = await serveSite(new Request("https://maze.sebgd.com/missing.js"), "maze", "/missing.js");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("location"), null);
  }
});

test("hosted project pages can appear in the portfolio preview without allowing arbitrary framing", async () => {
  const { serveSite } = loadSource("src/lib/static-sites/serve.ts", {
    "@/lib/static-sites/rules": rules,
    "@/lib/static-sites/store": { readSite: async () => ({ site: { published: true, revision: "checked", spa: false, files: [{ path: "index.html", key: "revision/index.html", contentType: "text/html" }] } }) },
    "@/lib/static-sites/storage": { readObject: async () => ({ body: Buffer.from("<h1>Read the Shift</h1>") }) },
  });
  const response = await serveSite(new Request("https://shift.sebgd.com/"), "shift", "/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /^frame-ancestors 'self' https:\/\/sebgd\.com https:\/\/www\.sebgd\.com;/);
  assert.ok(!response.headers.get("content-security-policy").includes("*"));
});
