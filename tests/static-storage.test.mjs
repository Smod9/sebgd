import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

class SiteError extends Error { constructor(message, status) { super(message); this.status = status; } }
class BlobNotFoundError extends Error {}
class BlobPreconditionFailedError extends Error {}

function loadStorage(sdk) {
  const filename = fileURLToPath(new URL("../src/lib/static-sites/storage.ts", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const loaded = new Module(filename);
  const nativeRequire = createRequire(filename);
  loaded.filename = filename;
  loaded.require = (id) => id === "@vercel/blob" ? { BlobNotFoundError, BlobPreconditionFailedError, ...sdk } : id === "./rules" ? { SiteError } : nativeRequire(id);
  loaded._compile(compiled, filename);
  return loaded.exports;
}

async function inBlobMode(run) {
  const previous = { VERCEL: process.env.VERCEL, SEBGD_STATIC_LOCAL_DIR: process.env.SEBGD_STATIC_LOCAL_DIR };
  process.env.VERCEL = "1"; delete process.env.SEBGD_STATIC_LOCAL_DIR;
  try { await run(); }
  finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
const result = (revision) => ({ statusCode: 200, blob: { etag: revision }, stream: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify({ revision }))); controller.close(); } }) });

test("legacy JSON manifests must match their metadata ETag", async () => inBlobMode(async () => {
  const calls = [];
  const store = loadStorage({ head: async (key) => { assert.equal(key, "manifest.json"); return { etag: '"version-2"', contentType: "application/json", url: "https://test.public.blob.vercel-storage.com/manifest.json" }; }, get: async (url) => { calls.push(url); assert.equal(new URL(url).searchParams.get("v"), '"version-2"'); return result('"version-2"'); } });
  const object = await store.readObject("manifest.json", true);
  assert.equal(JSON.parse(new TextDecoder().decode(object.body)).revision, '"version-2"');
  assert.equal(calls.length, 1);
}));

test("a manifest write racing its metadata read causes a fresh read instead of stale publication state", async () => inBlobMode(async () => {
  let reads = 0;
  const store = loadStorage({ head: async () => ({ etag: ++reads === 1 ? "new" : "newer", contentType: "application/json", url: "https://test.public.blob.vercel-storage.com/manifest.json" }), get: async () => result(reads === 1 ? "old" : "newer") });
  assert.equal((await store.readObject("manifest.json", true)).etag, "newer");
  assert.equal(reads, 2);
}));

test("Blob's conflicting-operation response is a conflict without automatic write retries", async () => inBlobMode(async () => {
  let writes = 0;
  const store = loadStorage({ put: async () => { writes++; throw new Error("Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource."); } });
  await assert.rejects(store.writeObject("manifest.json", "{}", "application/json", "current"), (error) => error.status === 409);
  assert.equal(writes, 1);
}));

test("a missing manifest is established through metadata without caching a public 404", async () => inBlobMode(async () => {
  const store = loadStorage({ head: async () => { throw new BlobNotFoundError(); }, get: async () => { throw new Error("Unexpected cached read"); } });
  assert.equal(await store.readObject("missing.json", true), null);
}));

test("active revisions come from control-plane metadata and only immutable manifests are fetched", async () => inBlobMode(async () => {
  const revision = "ec71511e-d1c7-43fc-9283-e37c4c5806ab";
  const store = loadStorage({ head: async () => ({ etag: "pointer-etag", contentType: `application/vnd.sebgd.site.${revision}+json` }), get: async (key) => { assert.equal(key, `static-sites/revisions/hello/${revision}.json`); return result("immutable-manifest-etag"); } });
  const object = await store.readObject("static-sites/manifests/hello.json", true);
  assert.equal(object.etag, "pointer-etag");
  assert.equal(JSON.parse(new TextDecoder().decode(object.body)).revision, "immutable-manifest-etag");
}));
