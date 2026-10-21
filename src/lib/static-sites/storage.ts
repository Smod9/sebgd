import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, BlobPreconditionFailedError, del, get, head, list, put } from "@vercel/blob";
import { SiteError } from "./rules";

// A separate local store lets development/tests run without touching production Blob.
const localRoot = () => process.env.SEBGD_STATIC_LOCAL_DIR || (!process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN ? path.join(process.cwd(), ".local/static-sites") : null);
const etag = (body: Uint8Array) => `"${createHash("sha256").update(body).digest("hex")}"`;
const revisionPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const immutableManifest = (key: string, revision: string) => key.replace("/manifests/", "/revisions/").replace(/\.json$/, `/${revision}.json`);

export async function readObject(key: string, fresh = false): Promise<{ body: Uint8Array; etag: string } | null> {
  const root = localRoot();
  if (root) {
    try {
      const pointer = await readFile(path.join(root, key));
      const revision = pointer.toString();
      const body = fresh && new RegExp(`^${revisionPattern}$`).test(revision) ? await readFile(path.join(root, immutableManifest(key, revision))) : pointer;
      return { body, etag: etag(pointer) };
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  for (let attempt = 0; attempt < (fresh ? 3 : 1); attempt++) {
    let target = key;
    let expected: string | undefined;
    if (fresh) {
      // Public get() has no consistent-read option. Read the control-plane
      // metadata to choose an immutable revision instead of a mutable CDN URL.
      let metadata;
      try { metadata = await head(key); }
      catch (error) { if (error instanceof BlobNotFoundError) return null; throw error; }
      expected = metadata.etag;
      const revision = metadata.contentType.match(new RegExp(`^application/vnd\\.sebgd\\.site\\.(${revisionPattern})\\+json$`))?.[1];
      if (revision) {
        // The control-plane metadata is authoritative. The manifest itself has
        // a never-overwritten pathname, so public CDN invalidation is irrelevant.
        const object = await readObject(immutableManifest(key, revision));
        if (!object) continue; // A newer publish may have removed this revision.
        return { body: object.body, etag: expected };
      }
      // Compatibility with the first release's JSON pointer. Only accept a body
      // whose ETag matches metadata. Its next publish migrates to immutable data.
      const url = new URL(metadata.url);
      url.searchParams.set("v", expected);
      target = url.toString();
    }
    const result = await get(target, { access: "public" });
    if (!result || result.statusCode !== 200) { if (fresh) continue; return null; }
    // If a writer raced the metadata read, resolve the latest version again.
    if (expected && result.blob.etag !== expected) { await result.stream.cancel(); continue; }
    return { body: new Uint8Array(await new Response(result.stream).arrayBuffer()), etag: result.blob.etag };
  }
  throw new SiteError("Site publication is changing. Reload before trying again.", 503);
}

export async function writeObject(key: string, body: Uint8Array | string, type: string, expected?: string) {
  const root = localRoot();
  if (root) {
    const target = path.join(root, key);
    await mkdir(path.dirname(target), { recursive: true });
    const lock = `${target}.lock`;
    try { await mkdir(lock); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new SiteError("Site changed during publishing. Reload before trying again.", 409); throw error; }
    const temp = `${target}.${randomUUID()}.tmp`;
    try {
      const current = await readObject(key);
      if (expected ? current?.etag !== expected : current !== null) throw new SiteError("Site changed. Reload before trying again.", 409);
      await writeFile(temp, body);
      await rename(temp, target);
    } finally { await rm(temp, { force: true }); await rm(lock, { recursive: true, force: true }); }
    return;
  }
  try {
    await put(key, typeof body === "string" ? body : Buffer.from(body), { access: "public", addRandomSuffix: false, contentType: type, cacheControlMaxAge: 60, ...(expected ? { ifMatch: expected } : { allowOverwrite: false }) });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || (error instanceof Error && /already exists|conditional request.*conflicting operation/i.test(error.message))) {
      throw new SiteError("Site changed. Reload before trying again.", 409);
    }
    throw error;
  }
}

export async function listKeys(prefix: string): Promise<string[]> {
  const root = localRoot();
  if (root) {
    try {
      const entries = await readdir(path.join(root, prefix), { recursive: true, withFileTypes: true });
      return entries.filter((entry) => entry.isFile() && !entry.name.endsWith(".tmp")).map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, limit: 1000 });
    keys.push(...result.blobs.map((blob) => blob.pathname)); cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  const root = localRoot();
  if (root) { await Promise.all(keys.map((key) => rm(path.join(root, key), { force: true }))); return; }
  await del(keys);
}
