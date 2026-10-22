"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminToken } from "@/components/admin/AdminGate";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ProjectFields, type ProjectFieldsValue } from "@/components/admin/ProjectFields";
import { ThoughtSource } from "@/components/ThoughtSource";
import { characterCount, THOUGHT_LIMIT, thoughtTitle, isExtendedExcerpt } from "@/lib/publishing";
import {
  deleteAdminPost,
  getAdminPost,
  updateAdminPost,
} from "@/lib/admin-client";
import {
  POST_TYPES,
  type Post,
  type PostStatus,
  type PostType,
} from "@/lib/types";

function insertMarkdownImage(body: string, url: string, alt: string) {
  const md = `![${alt}](${url})`;
  if (!body.trim()) return md;
  return `${body.replace(/\s*$/, "")}\n\n${md}\n`;
}

export function AdminPostEditor({ id }: { id: string }) {
  const token = useAdminToken();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [type, setType] = useState<PostType>("note");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<PostStatus>("draft");
  const [tags, setTags] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [ideaDate, setIdeaDate] = useState("");
  const [project, setProject] = useState<ProjectFieldsValue>({ summary: "", demoUrl: "", repoUrl: "", tags: "", group: "", instagramUrl: "", learnings: "" });

  useEffect(() => {
    let active = true;
    getAdminPost(token, id).then(({ post: next }) => {
      if (!active) return;
      setError(null);
      setPost(next);
      setType(next.type);
      setTitle(next.title);
      setSlug(next.slug);
      setBody(next.body);
      setStatus(next.status);
      setTags(next.tags.join(", "));
      setCoverUrl(next.cover_blob_url ?? "");
      setIdeaDate(typeof next.meta.idea_date === "string" ? next.meta.idea_date : "");
      setProject({ summary: String(next.meta.summary ?? ""), demoUrl: String(next.meta.demo_url ?? ""), repoUrl: String(next.meta.repo_url ?? ""), tags: next.tags.join(", "), group: String(next.meta.group ?? ""), instagramUrl: String(next.meta.instagram_url ?? ""), learnings: String(next.meta.learnings ?? "") });
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load post");
      setPost(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  async function save(patch?: { status?: PostStatus; action?: "publish" }) {
    if (!post) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
              type,
              title: type === "note" && post.meta.format === "thought" ? thoughtTitle(body) : title.trim(),
              slug: slug.trim(),
              body,
              status: patch?.action === "publish" ? "published" as const : patch?.status ?? status,
              meta: type === "work" ? { ...post.meta, summary: project.summary.trim(), demo_url: project.demoUrl.trim(), repo_url: project.repoUrl.trim(), group: project.group, instagram_url: project.instagramUrl.trim(), learnings: project.learnings.trim() } : type === "note" && post.meta.format === "thought" ? { ...post.meta, idea_date: ideaDate || null, idea_date_approximate: Boolean(ideaDate) } : post.meta,
              tags: (type === "work" ? project.tags : tags)
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              cover_blob_url: coverUrl.trim() || null,
            };
      const { post: next } = await updateAdminPost(token, post.id, payload);
      setPost(next);
      setType(next.type);
      setTitle(next.title);
      setSlug(next.slug);
      setBody(next.body);
      setStatus(next.status);
      setTags(next.tags.join(", "));
      setCoverUrl(next.cover_blob_url ?? "");
      setMessage(
        patch?.action === "publish"
          ? "Published."
          : patch?.status === "draft"
            ? "Unpublished (draft)."
            : "Saved.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!post) return;
    if (!window.confirm(`Delete “${post.title}”? (soft-delete)`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminPost(token, post.id);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <p className="kicker">Admin</p>
        <p className="muted">Loading post…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="admin-panel">
        <p className="kicker">Admin</p>
        <h1>Not found</h1>
        {error ? <p className="admin-error">{error}</p> : null}
        <Link href="/admin" className="btn btn-secondary">
          Back to write
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div>
          <p className="kicker">Edit</p>
          <h1>{post.meta.format === "thought" ? "Edit thought" : post.title}</h1>
        </div>
        <p className="muted mono tiny">
          {post.id} · {post.status}
        </p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-ok">{message}</p> : null}
      {type === "work" && typeof post.meta.review_notes === "string" ? <p className="preview-notice">Local preparation notes: {post.meta.review_notes}</p> : null}

      <form className="admin-form admin-grid" onSubmit={onSubmit}>
        <div className="admin-span-2"><ThoughtSource meta={post.meta} className="muted tiny" /></div>
        <label className="admin-label">
          Type
          <select
            className="admin-input"
            value={type}
            onChange={(e) => setType(e.target.value as PostType)}
          >
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-label">
          Status
          <select
            className="admin-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        {!(type === "note" && post.meta.format === "thought") ? <label className="admin-label admin-span-2">
          Title
          <input
            className="admin-input admin-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label> : null}
        {type === "work" ? <div className="admin-span-2"><ProjectFields value={project} onChange={setProject} /></div> : null}
        {type === "note" && post.meta.format === "thought" ? <label className="admin-label admin-span-2">Approximate idea date (optional)<input type="date" className="admin-input" value={ideaDate} onChange={(e) => setIdeaDate(e.target.value)} /><span className="muted tiny">An idea/discussion date. The posting date is set separately when you publish.</span></label> : null}
        {type === "work" ? <label className="admin-label admin-span-2">Cover image URL (optional)<input type="url" className="admin-input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Paste an existing social-card URL, or upload below" /></label> : null}
        <label className="admin-label admin-span-2">
          Slug
          <input
            className="admin-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </label>
        {type !== "work" ? <label className="admin-label admin-span-2">
          Tags <span className="muted">(comma-separated)</span>
          <input
            className="admin-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </label> : null}
        <label className="admin-label admin-span-2">
          {type === "note" && post.meta.format === "thought" ? isExtendedExcerpt(post.meta) ? "Podcast excerpt" : "Thought · 140 characters" : type === "work" ? "Long description (markdown)" : "Body (markdown)"}
          <textarea
            className="admin-input admin-textarea admin-textarea-lg"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
          />
        </label>
        {type === "note" && post.meta.format === "thought" ? <p className="muted tiny">{characterCount(body)}{isExtendedExcerpt(post.meta) ? " characters" : ` / ${THOUGHT_LIMIT}`}</p> : null}

        <div className="admin-span-2">
          <ImageUploadField
            token={token}
            disabled={busy}
            onUploaded={(url, alt) => {
              if (type === "work") { setCoverUrl(url); setMessage("Project cover uploaded — save to persist."); return; }
              setBody((prev) => insertMarkdownImage(prev, url, alt));
              setMessage("Image uploaded and inserted into the body.");
            }}
            onSetCover={(url) => {
              setCoverUrl(url);
              setMessage("Cover image set — save to persist.");
            }}
          />
          {coverUrl ? (
            <p className="muted tiny">
              Cover:{" "}
              <a href={coverUrl} target="_blank" rel="noreferrer">
                {coverUrl}
              </a>{" "}
              <button
                type="button"
                className="admin-inline-clear"
                onClick={() => setCoverUrl("")}
              >
                clear
              </button>
            </p>
          ) : null}
        </div>

        <div className="admin-actions admin-span-2 admin-actions-wrap">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || post.status === "published"}
            onClick={() => void save({ action: "publish" })}
          >
            Publish
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || post.status === "draft"}
            onClick={() => void save({ status: "draft" })}
          >
            Unpublish
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void onDelete()}
          >
            Delete
          </button>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
