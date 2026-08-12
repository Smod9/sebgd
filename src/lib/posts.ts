import { randomUUID } from "crypto";
import { ensureSchema, getDb, hasDatabaseUrl } from "./db";
import {
  createMarkdownPost,
  getMarkdownPost,
  listMarkdownPosts,
  publishMarkdownPost,
  updateMarkdownPost,
} from "./markdown-store";
import type { Post, PostInput, PostType } from "./types";

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: String(row.id),
    slug: String(row.slug),
    type: row.type as PostType,
    title: String(row.title),
    body: String(row.body ?? ""),
    status: row.status === "draft" ? "draft" : "published",
    published_at: row.published_at
      ? new Date(String(row.published_at)).toISOString()
      : null,
    number: typeof row.number === "number" ? row.number : null,
    tags: Array.isArray(row.tags)
      ? row.tags.map(String)
      : typeof row.tags === "string"
        ? JSON.parse(row.tags)
        : [],
    cover_blob_url: row.cover_blob_url ? String(row.cover_blob_url) : null,
    meta:
      row.meta && typeof row.meta === "object"
        ? (row.meta as Record<string, unknown>)
        : {},
  };
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const aTime = a.published_at ? Date.parse(a.published_at) : 0;
    const bTime = b.published_at ? Date.parse(b.published_at) : 0;
    return bTime - aTime;
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function listPosts(options?: {
  type?: PostType | PostType[];
  status?: "draft" | "published" | "all";
  includeNow?: boolean;
}): Promise<Post[]> {
  const status = options?.status ?? "published";
  const types = options?.type
    ? Array.isArray(options.type)
      ? options.type
      : [options.type]
    : null;

  if (hasDatabaseUrl()) {
    await ensureSchema();
    const db = getDb();
    if (db) {
      const rows = await db`SELECT * FROM posts ORDER BY published_at DESC NULLS LAST, created_at DESC`;
      let posts = (rows as Record<string, unknown>[]).map(rowToPost);
      if (status !== "all") posts = posts.filter((p) => p.status === status);
      if (types) posts = posts.filter((p) => types.includes(p.type));
      if (!options?.includeNow) posts = posts.filter((p) => p.type !== "now");
      return sortPosts(posts);
    }
  }

  let posts = await listMarkdownPosts();
  if (status !== "all") posts = posts.filter((p) => p.status === status);
  if (types) posts = posts.filter((p) => types.includes(p.type));
  if (!options?.includeNow) posts = posts.filter((p) => p.type !== "now");
  return sortPosts(posts);
}

export async function getPost(slug: string): Promise<Post | null> {
  if (hasDatabaseUrl()) {
    await ensureSchema();
    const db = getDb();
    if (db) {
      const rows = await db`SELECT * FROM posts WHERE slug = ${slug} LIMIT 1`;
      if (rows[0]) return rowToPost(rows[0] as Record<string, unknown>);
      return null;
    }
  }
  return getMarkdownPost(slug);
}

export async function getPostById(id: string): Promise<Post | null> {
  if (hasDatabaseUrl()) {
    await ensureSchema();
    const db = getDb();
    if (db) {
      const rows = await db`SELECT * FROM posts WHERE id = ${id} LIMIT 1`;
      if (rows[0]) return rowToPost(rows[0] as Record<string, unknown>);
      return null;
    }
  }
  const all = await listMarkdownPosts();
  return all.find((p) => p.id === id) ?? null;
}

export async function createPost(input: PostInput): Promise<Post> {
  if (hasDatabaseUrl()) {
    await ensureSchema();
    const db = getDb();
    if (db) {
      const id = randomUUID();
      const slug = input.slug?.trim() || slugify(input.title);
      const status = input.status ?? "draft";
      const published_at =
        input.published_at ??
        (status === "published" ? new Date().toISOString() : null);
      const tags = input.tags ?? [];
      const meta = JSON.stringify(input.meta ?? {});
      await db`
        INSERT INTO posts (id, slug, type, title, body, status, published_at, number, tags, cover_blob_url, meta)
        VALUES (
          ${id},
          ${slug},
          ${input.type},
          ${input.title},
          ${input.body ?? ""},
          ${status},
          ${published_at},
          ${input.number ?? null},
          ${tags},
          ${input.cover_blob_url ?? null},
          ${meta}::jsonb
        )
      `;
      const created = await getPost(slug);
      if (!created) throw new Error("Failed to create post");
      return created;
    }
  }
  return createMarkdownPost(input);
}

export async function updatePost(
  identifier: { id?: string; slug?: string },
  patch: Partial<PostInput>,
): Promise<Post | null> {
  const current = identifier.id
    ? await getPostById(identifier.id)
    : identifier.slug
      ? await getPost(identifier.slug)
      : null;
  if (!current) return null;

  if (hasDatabaseUrl()) {
    await ensureSchema();
    const db = getDb();
    if (db) {
      const next = {
        slug: patch.slug?.trim() || current.slug,
        type: patch.type ?? current.type,
        title: patch.title ?? current.title,
        body: patch.body ?? current.body,
        status: patch.status ?? current.status,
        published_at:
          patch.published_at !== undefined
            ? patch.published_at
            : current.published_at,
        number: patch.number !== undefined ? patch.number : current.number,
        tags: patch.tags ?? current.tags,
        cover_blob_url:
          patch.cover_blob_url !== undefined
            ? patch.cover_blob_url
            : current.cover_blob_url,
        meta: patch.meta ?? current.meta,
      };
      await db`
        UPDATE posts SET
          slug = ${next.slug},
          type = ${next.type},
          title = ${next.title},
          body = ${next.body},
          status = ${next.status},
          published_at = ${next.published_at},
          number = ${next.number},
          tags = ${next.tags},
          cover_blob_url = ${next.cover_blob_url},
          meta = ${JSON.stringify(next.meta)}::jsonb,
          updated_at = NOW()
        WHERE id = ${current.id}
      `;
      return getPost(next.slug);
    }
  }

  return updateMarkdownPost(current.slug, patch);
}

export async function publishPost(slug: string): Promise<Post | null> {
  if (hasDatabaseUrl()) {
    return updatePost(
      { slug },
      { status: "published", published_at: new Date().toISOString() },
    );
  }
  return publishMarkdownPost(slug);
}

export async function setNow(items: string[]): Promise<Post> {
  const body = items.map((item) => `- ${item}`).join("\n");
  const existing = await getPost("now");
  if (existing) {
    const updated = await updatePost(
      { slug: "now" },
      {
        type: "now",
        title: "Now",
        body,
        status: "published",
        published_at: new Date().toISOString(),
        meta: { items },
      },
    );
    if (!updated) throw new Error("Failed to update now");
    return updated;
  }
  return createPost({
    slug: "now",
    type: "now",
    title: "Now",
    body,
    status: "published",
    published_at: new Date().toISOString(),
    meta: { items },
  });
}

export async function getNowItems(): Promise<string[]> {
  const now = await getPost("now");
  if (!now) return [];
  if (Array.isArray(now.meta.items)) {
    return now.meta.items.filter((x): x is string => typeof x === "string");
  }
  return now.body
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

export function typeLabel(type: PostType): string {
  switch (type) {
    case "note":
      return "Note";
    case "essay":
      return "Essay";
    case "work":
      return "Work";
    case "boat_log":
      return "Bon Vivant";
    case "quest":
      return "Side Quest";
    case "now":
      return "Now";
  }
}

export function formatNumber(n: number | null): string | null {
  if (n == null) return null;
  return `№ ${String(n).padStart(4, "0")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(iso));
}
