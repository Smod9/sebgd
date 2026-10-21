import { randomUUID } from "node:crypto";
import { contentType, MAX_SITE_BYTES, MAX_SITE_FILES, SiteError, SITE_DOMAIN, validateFilePath, validateSiteName } from "./rules";
import { deleteObjects, listKeys, readObject, writeObject } from "./storage";

export type SiteFile = { path: string; body: Uint8Array };
type StoredFile = { path: string; key: string; size: number; contentType: string };
export type SiteManifest = { name: string; revision: string; updatedAt: string; spa: boolean; published: boolean; files: StoredFile[] };
export type SiteSummary = Omit<SiteManifest, "files"> & { url: string; fileCount: number; size: number };
const manifestKey = (name: string) => `static-sites/manifests/${name}.json`;

export function summarize(site: SiteManifest): SiteSummary {
  const { files, ...rest } = site;
  return { ...rest, url: `https://${site.name}.${SITE_DOMAIN}`, fileCount: files.length, size: files.reduce((total, file) => total + file.size, 0) };
}

export async function readSite(name: string) {
  validateSiteName(name);
  const object = await readObject(manifestKey(name), true);
  return object ? { site: JSON.parse(new TextDecoder().decode(object.body)) as SiteManifest, etag: object.etag } : null;
}

export async function listSites() {
  const keys = await listKeys("static-sites/manifests/");
  const sites = await Promise.all(keys.filter((key) => key.endsWith(".json")).map(async (key) => {
    const name = key.split("/").pop()!.slice(0, -5);
    const result = await readSite(name);
    return result ? summarize(result.site) : null;
  }));
  return sites.filter((site): site is SiteSummary => site !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function checkRevision(current: Awaited<ReturnType<typeof readSite>>, expected: unknown) {
  if (expected !== (current?.site.revision ?? null)) throw new SiteError("This site changed since you loaded it. Reload before publishing.", 409);
}

export async function publishSite(name: string, files: SiteFile[], revision: string | null, spa: boolean) {
  validateSiteName(name);
  if (!files.length || files.length > MAX_SITE_FILES) throw new SiteError(`Choose 1–${MAX_SITE_FILES} static files.`);
  const paths = files.map((file) => validateFilePath(file.path));
  if (new Set(paths).size !== paths.length) throw new SiteError("Duplicate file paths are not allowed.");
  if (!paths.includes("index.html")) throw new SiteError("The site needs an index.html at its root.");
  if (files.reduce((sum, file) => sum + file.body.byteLength, 0) > MAX_SITE_BYTES) throw new SiteError("Site is too large (maximum 3 MB).", 413);
  const current = await readSite(name);
  checkRevision(current, revision);
  const nextRevision = randomUUID();
  const stored: StoredFile[] = [];
  try {
    // Immutable files first; the conditional manifest write makes publication atomic.
    for (const file of files) {
      const key = `static-sites/files/${name}/${nextRevision}/${file.path}`;
      const type = contentType(file.path)!;
      await writeObject(key, file.body, type);
      stored.push({ path: file.path, key, size: file.body.byteLength, contentType: type });
    }
    const site: SiteManifest = { name, revision: nextRevision, updatedAt: new Date().toISOString(), spa, published: true, files: stored };
    await writeObject(manifestKey(name), JSON.stringify(site), "application/json", current?.etag);
    // Publication has succeeded. Cleanup must never turn it into a failed request.
    await deleteObjects(current?.site.files.map((file) => file.key) ?? []).catch((error) => console.error("Old static-site files could not be removed", error));
    return summarize(site);
  } catch (error) {
    // A transport error may have happened after the manifest was committed. Preserve
    // files if we cannot establish that publication failed.
    const latest = await readSite(name).catch(() => undefined);
    if (latest !== undefined && latest?.site.revision !== nextRevision) {
      await deleteObjects(stored.map((file) => file.key)).catch(() => {});
    }
    if (latest?.site.revision === nextRevision) return summarize(latest.site);
    throw error;
  }
}

export async function unpublishSite(name: string, revision: string) {
  const current = await readSite(name);
  if (!current) throw new SiteError("Site not found.", 404);
  checkRevision(current, revision);
  // Keep a tombstone so a stale publisher cannot recreate an unpublished site.
  const site: SiteManifest = { ...current.site, revision: randomUUID(), updatedAt: new Date().toISOString(), published: false, files: [] };
  await writeObject(manifestKey(name), JSON.stringify(site), "application/json", current.etag);
  await deleteObjects(current.site.files.map((file) => file.key)).catch((error) => console.error("Unpublished static-site files could not be removed", error));
  return summarize(site);
}
