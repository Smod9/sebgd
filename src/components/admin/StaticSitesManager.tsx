"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAdminToken } from "@/components/admin/AdminGate";
import { adminFetch } from "@/lib/admin-client";
import { MAX_SITE_BYTES, MAX_SITE_FILES, validateSiteName } from "@/lib/static-sites/rules";
import type { SiteSummary } from "@/lib/static-sites/store";

type Upload = { file: File; path: string };
const sizeLabel = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export function StaticSitesManager() {
  const token = useAdminToken();
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [name, setName] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [spa, setSpa] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<SiteSummary | null>(null);
  const current = sites.find((site) => site.name === name);
  const totalSize = uploads.reduce((size, upload) => size + upload.file.size, 0);

  const reload = useCallback(async () => {
    const response = await adminFetch<{ sites: SiteSummary[] }>("/api/admin/sites", { token });
    setSites(response.sites);
    setLoaded(true);
  }, [token]);

  useEffect(() => {
    let active = true;
    adminFetch<{ sites: SiteSummary[] }>("/api/admin/sites", { token })
      .then((response) => { if (active) { setSites(response.sites); setLoaded(true); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load sites."); });
    return () => { active = false; };
  }, [token]);

  function chooseFiles(files: FileList | null, folder: boolean) {
    if (!files?.length) return;
    setError(null); setPublished(null);
    const selected = Array.from(files);
    const next = selected.map((file) => ({ file, path: folder ? file.webkitRelativePath.split("/").slice(1).join("/") : selected.length === 1 && /\.html?$/i.test(file.name) ? "index.html" : file.name }));
    setUploads(next);
  }

  async function publish(event: FormEvent) {
    event.preventDefault(); setError(null); setPublished(null);
    try {
      validateSiteName(name);
      if (!uploads.length) throw new Error("Choose an HTML file or a site folder first.");
      if (uploads.length > MAX_SITE_FILES || totalSize > MAX_SITE_BYTES) throw new Error("Choose up to 100 files, with a maximum total size of 3 MB.");
      if (!uploads.some((upload) => upload.path === "index.html")) throw new Error("The folder needs an index.html at its root.");
      setBusy(true);
      const form = new FormData();
      form.set("revision", current?.revision ?? "null");
      form.set("spa", String(spa));
      for (const upload of uploads) form.append("files", upload.file, upload.path);
      const response = await adminFetch<{ site: SiteSummary }>(`/api/admin/sites/${encodeURIComponent(name)}`, { token, method: "PUT", formData: form });
      setPublished(response.site); setUploads([]);
      setSites((previous) => [response.site, ...previous.filter((site) => site.name !== response.site.name)]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not publish site."); }
    finally { setBusy(false); }
  }

  async function unpublish(site: SiteSummary) {
    if (!window.confirm(`Take ${site.name}.sebgd.com offline? You can publish it again later.`)) return;
    setBusy(true); setError(null); setPublished(null);
    try {
      const response = await fetch(`/api/admin/sites/${encodeURIComponent(site.name)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "If-Match": site.revision } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not unpublish site.");
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not unpublish site."); }
    finally { setBusy(false); }
  }

  return <div className="admin-panel static-sites-panel">
    <header className="admin-header">
      <div><p className="kicker">Static hosting</p><h1>A little home for your next build.</h1><p className="muted admin-header-copy">Pick a name, upload your site, and it’s online.</p></div>
      <Link href="/admin" className="btn btn-secondary">Back to writing</Link>
    </header>
    {error ? <p className="admin-error" role="alert">{error}</p> : null}
    {published ? <div className="static-publish-result" role="status"><span>Published</span><a href={published.url} target="_blank" rel="noopener noreferrer">{published.name}.sebgd.com ↗</a><button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(published.url).catch(() => setError("Could not copy the link. Select the address above to copy it."))}>Copy link</button></div> : null}
    <form className="admin-section admin-form" onSubmit={publish}>
      <label className="admin-label" htmlFor="site-name">Your subdomain</label>
      <div className="static-domain-input"><input id="site-name" className="admin-input" required value={name} maxLength={63} autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="my-next-build" disabled={busy} onChange={(event) => { setName(event.target.value.toLowerCase()); setPublished(null); }} /><span>.sebgd.com</span></div>
      {current?.published ? <p className="muted tiny">Publishing replaces all files at {name}.sebgd.com.</p> : null}
      <div className="static-upload-options">
        <label className="static-upload-choice"><strong>One HTML file</strong><span className="muted tiny">A self-contained page or tool</span><input type="file" accept=".html,.htm" disabled={busy} onChange={(event) => { chooseFiles(event.target.files, false); event.target.value = ""; }} /></label>
        <label className="static-upload-choice"><strong>A site folder</strong><span className="muted tiny">index.html, styles, scripts, and images</span><input type="file" multiple {...{ webkitdirectory: "" }} disabled={busy} onChange={(event) => { chooseFiles(event.target.files, true); event.target.value = ""; }} /></label>
      </div>
      <p className="muted tiny">Up to 100 files and 3 MB total. Upload the finished static site, without private files or source maps.</p>
      {uploads.length ? <details className="static-file-list"><summary>{uploads.length} file{uploads.length === 1 ? "" : "s"} selected · {sizeLabel(totalSize)}</summary><ul>{uploads.map((upload) => <li key={upload.path}><code>{upload.path}</code><span>{sizeLabel(upload.file.size)}</span></li>)}</ul></details> : null}
      <label className="static-spa-option"><input type="checkbox" checked={spa} disabled={busy} onChange={(event) => setSpa(event.target.checked)} />Use index.html for app routes <span className="muted tiny">For single-page apps with client-side routing</span></label>
      <div className="admin-actions"><button className="btn btn-primary" type="submit" disabled={busy || !loaded || !uploads.length}>{busy ? "Publishing…" : current?.published ? "Replace site" : "Publish site"}</button></div>
    </form>
    <section className="admin-section"><div className="static-list-heading"><h2>Your sites</h2><button className="btn btn-secondary" disabled={busy} onClick={() => { setError(null); void reload().catch((err) => setError(err.message)); }}>Reload sites</button></div>
      {!loaded ? <p className="muted">Loading sites…</p> : !sites.length ? <p className="muted">Your first site starts above.</p> : <ul className="static-site-list">{sites.map((site) => <li key={site.name}><div>{site.published ? <a href={site.url} target="_blank" rel="noopener noreferrer">{site.name}.sebgd.com ↗</a> : <strong>{site.name}.sebgd.com</strong>}<p className="muted tiny">{site.published ? `${site.fileCount} files · ${sizeLabel(site.size)}` : "Offline"} · {new Date(site.updatedAt).toLocaleDateString()}</p></div><div className="admin-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => { setName(site.name); setSpa(site.spa); setPublished(null); document.getElementById("site-name")?.focus(); }}>Update</button>{site.published ? <button className="btn btn-secondary" disabled={busy} onClick={() => void unpublish(site)}>Unpublish</button> : null}</div></li>)}</ul>}
    </section>
  </div>;
}
