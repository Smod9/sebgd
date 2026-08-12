"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/components/admin/AdminGate";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  createAdminPost,
  deleteAdminPost,
  getAdminNow,
  listAdminPosts,
  setAdminNow,
  updateAdminPost,
} from "@/lib/admin-client";
import { POST_TYPES, type Post, type PostStatus, type PostType } from "@/lib/types";

const COMPOSE_TYPES = POST_TYPES.filter((t) => t !== "now") as PostType[];

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function insertMarkdownImage(body: string, url: string, alt: string) {
  const md = `![${alt}](${url})`;
  if (!body.trim()) return md;
  return `${body.replace(/\s*$/, "")}\n\n${md}\n`;
}

export function AdminDashboard() {
  const token = useAdminToken();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nowText, setNowText] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | PostStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<PostType>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, nowRes] = await Promise.all([
        listAdminPosts(token, { status: "all" }),
        getAdminNow(token),
      ]);
      setPosts(postsRes.posts.filter((p) => !p.deleted_at));
      setNowText(nowRes.items.join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    return posts
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .filter((p) => (typeFilter === "all" ? true : p.type === typeFilter))
      .sort((a, b) => {
        const aDate = a.published_at ?? "";
        const bDate = b.published_at ?? "";
        return bDate.localeCompare(aDate) || a.title.localeCompare(b.title);
      });
  }, [posts, statusFilter, typeFilter]);

  async function publishCompose(as: PostStatus) {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { post } = await createAdminPost(token, {
        type,
        title: title.trim(),
        body,
        status: as,
        cover_blob_url: coverUrl.trim() || undefined,
      });
      setTitle("");
      setBody("");
      setCoverUrl("");
      setType("note");
      setMessage(
        as === "published"
          ? `Published “${post.title}”.`
          : `Saved draft “${post.title}”.`,
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save post");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveNow(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const items = nowText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await setAdminNow(token, items);
      setMessage(`Saved ${items.length} Now bullet${items.length === 1 ? "" : "s"}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Now");
    } finally {
      setBusy(false);
    }
  }

  async function quickPublish(post: Post) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminPost(token, post.id, { action: "publish" });
      setMessage(`Published “${post.title}”.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickUnpublish(post: Post) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminPost(token, post.id, { status: "draft" });
      setMessage(`Unpublished “${post.title}”.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unpublish failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickDelete(post: Post) {
    if (!window.confirm(`Delete “${post.title}”? (soft-delete)`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminPost(token, post.id);
      setMessage(`Deleted “${post.title}”.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div>
          <p className="kicker">Write</p>
          <h1>Compose</h1>
        </div>
        <p className="muted admin-header-copy">
          Drop a thought, attach a pic, publish. Unlinked from public nav.
        </p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-ok">{message}</p> : null}

      <section className="admin-section admin-compose">
        <div className="admin-form">
          <div className="admin-compose-meta">
            <label className="admin-label">
              Type
              <select
                className="admin-input"
                value={type}
                onChange={(e) => setType(e.target.value as PostType)}
              >
                {COMPOSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-label">
            Title
            <input
              className="admin-input admin-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What’s this about?"
              autoFocus
            />
          </label>

          <label className="admin-label">
            Body
            <textarea
              className="admin-input admin-textarea admin-textarea-compose"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write in markdown…"
            />
          </label>

          <ImageUploadField
            token={token}
            disabled={busy}
            onUploaded={(url, alt) => {
              setBody((prev) => insertMarkdownImage(prev, url, alt));
              setMessage("Image uploaded and inserted into the body.");
            }}
            onSetCover={(url) => {
              setCoverUrl(url);
              setMessage("Cover image set.");
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

          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void publishCompose("published")}
            >
              {busy ? "Working…" : "Publish now"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void publishCompose("draft")}
            >
              Save draft
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-rule">
          <span>Posts</span>
          <span className="muted">{loading ? "…" : `${visible.length}`}</span>
        </div>

        <div className="admin-filters">
          {(["all", "draft", "published"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`admin-chip ${statusFilter === value ? "is-active" : ""}`}
              onClick={() => setStatusFilter(value)}
            >
              {value}
            </button>
          ))}
          <select
            className="admin-input admin-filter-select"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | PostType)
            }
            aria-label="Filter by type"
          >
            <option value="all">all types</option>
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void reload()}
            disabled={loading || busy}
          >
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No posts match this filter.
                  </td>
                </tr>
              ) : (
                visible.map((post) => (
                  <tr key={post.id}>
                    <td className="mono tiny">{post.type}</td>
                    <td>
                      <div className="admin-title-cell">
                        <span>{post.title}</span>
                        <span className="muted mono tiny">{post.slug}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-status admin-status-${post.status}`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="muted tiny">
                      {formatDate(post.published_at)}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link
                          href={`/admin/posts/${encodeURIComponent(post.id)}`}
                          className="text-link"
                        >
                          Edit
                        </Link>
                        {post.status === "draft" ? (
                          <button
                            type="button"
                            className="admin-text-btn"
                            disabled={busy}
                            onClick={() => void quickPublish(post)}
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-text-btn"
                            disabled={busy}
                            onClick={() => void quickUnpublish(post)}
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-text-btn admin-text-btn-danger"
                          disabled={busy}
                          onClick={() => void quickDelete(post)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-rule">
          <span>Now</span>
          <span className="muted">one bullet per line</span>
        </div>
        <form className="admin-form" onSubmit={onSaveNow}>
          <textarea
            className="admin-input admin-textarea"
            value={nowText}
            onChange={(e) => setNowText(e.target.value)}
            rows={5}
            placeholder={"Building X\nSailing Y"}
          />
          <div className="admin-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save Now
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
