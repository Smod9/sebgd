import { NextResponse } from "next/server";
import { SiteError } from "./rules";
import type { SiteFile } from "./store";

const MAX_REQUEST_BYTES = 4.25 * 1024 * 1024;

export function siteError(error: unknown) {
  if (error instanceof SiteError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Static hosting request failed", error);
  return NextResponse.json({ error: "Static hosting is temporarily unavailable. Reload to check the site's status before retrying." }, { status: 503 });
}

export async function readPublishRequest(request: Request): Promise<{ files: SiteFile[]; revision: string | null; spa: boolean }> {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) throw new SiteError("Site is too large (maximum 3 MB).", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new SiteError("Upload files first.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new SiteError("Site is too large (maximum 3 MB).", 413); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  let files: SiteFile[];
  let revision: unknown;
  let spa: unknown;
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    let form: FormData;
    try { form = await new Response(bytes, { headers: { "content-type": type } }).formData(); }
    catch { throw new SiteError("Invalid file upload."); }
    const rawRevision = form.get("revision");
    revision = rawRevision === "null" ? null : rawRevision;
    if (rawRevision === null) revision = undefined;
    spa = form.get("spa") === "true";
    files = [];
    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File)) throw new SiteError("Expected files in the files field.");
      files.push({ path: entry.name, body: new Uint8Array(await entry.arrayBuffer()) });
    }
  } else if (type.includes("application/json")) {
    let body;
    try { body = JSON.parse(bytes.toString("utf8")); } catch { throw new SiteError("Invalid JSON."); }
    if (!body || !Array.isArray(body.files) || body.files.length > 100) throw new SiteError("Provide an array of up to 100 files.");
    revision = body.revision;
    spa = body.spa ?? false;
    files = body.files.map((file: { path?: unknown; content_base64?: unknown }) => {
      if (!file || typeof file.path !== "string" || typeof file.content_base64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content_base64)) throw new SiteError("Each file needs a path and valid content_base64.");
      return { path: file.path, body: Buffer.from(file.content_base64, "base64") };
    });
  } else throw new SiteError("Use a multipart file upload or application/json.", 415);
  if (revision !== null && (typeof revision !== "string" || !/^[a-f0-9-]{36}$/.test(revision))) throw new SiteError("Provide revision: null for a new site, or the current revision when replacing it.");
  if (typeof spa !== "boolean") throw new SiteError("spa must be a boolean.");
  return { files, revision, spa };
}
