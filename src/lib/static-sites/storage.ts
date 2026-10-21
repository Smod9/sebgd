import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, BlobPreconditionFailedError, del, get, head, list, put } from "@vercel/blob";
import { SiteError } from "./rules";

// A separate local store lets development/tests run without touching production Blob.
const localRoot = () => process.env.SEBGD_STATIC_LOCAL_DIR || (!process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN ? path.join(process.cwd(), ".local/static-sites") : null);
const etag = (body: Uint8Array) => `"${createHash("sha256").update(body).digest("hex")}"`;

export async function readObject(key: string, fresh = false): Promise<{ body: Uint8Array; etag: string } | null> {
  const root = localRoot();
  if (root) {
    try { const body = await readFile(path.join(root, key)); return { body, etag: etag(body) }; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  for (let attempt = 0; attempt < (fresh ? 3 : 1); attempt++) {
    let target = key;
    let expected: string | undefined;
    if (fresh) {
      // useCache:false bypasses the CDN only for PRIVATE stores in this SDK.
      // The metadata API reads the latest ETag; versioning the public URL keeps
      // mutable manifests out of stale CDN entries, including cached 404s.
      let metadata;
      try { metadata = await head(key); }
      catch (error) { if (error instanceof BlobNotFoundError) return null; throw error; }
      expected = metadata.etag;
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
