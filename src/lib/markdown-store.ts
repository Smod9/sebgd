import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { randomUUID } from "crypto";
import type { Post, PostInput, PostStatus, PostType } from "./types";
import { POST_TYPES } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "posts");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function coerceType(value: unknown): PostType {
  if (typeof value === "string" && POST_TYPES.includes(value as PostType)) {
    return value as PostType;
  }
  return "note";
}

function coerceStatus(value: unknown): PostStatus {
  return value === "draft" ? "draft" : "published";
}

function fromMatter(filePath: string, raw: string): Post {
  const { data, content } = matter(raw);
  const slug =
    (typeof data.slug === "string" && data.slug) ||
    path.basename(filePath, path.extname(filePath));

  return {
    id: typeof data.id === "string" ? data.id : slug,
    slug,
    type: coerceType(data.type),
    title: typeof data.title === "string" ? data.title : slug,
    body: content.trim(),
    status: coerceStatus(data.status),
    published_at:
      data.published_at instanceof Date
        ? data.published_at.toISOString()
        : typeof data.published_at === "string"
          ? data.published_at
          : null,
    number: typeof data.number === "number" ? data.number : null,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : [],
    cover_blob_url:
      typeof data.cover_blob_url === "string" ? data.cover_blob_url : null,
    meta:
      data.meta && typeof data.meta === "object" && !Array.isArray(data.meta)
        ? (data.meta as Record<string, unknown>)
        : {},
    deleted_at:
      data.deleted_at instanceof Date
        ? data.deleted_at.toISOString()
        : typeof data.deleted_at === "string"
          ? data.deleted_at
          : null,
  };
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
}

function fileForSlug(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.md`);
}

function serialize(post: Post): string {
  const front = {
    id: post.id,
    slug: post.slug,
    type: post.type,
    title: post.title,
    status: post.status,
    published_at: post.published_at,
    number: post.number,
    tags: post.tags,
    cover_blob_url: post.cover_blob_url,
    meta: post.meta,
    deleted_at: post.deleted_at,
  };
  return matter.stringify(post.body + "\n", front);
}

export async function listMarkdownPosts(): Promise<Post[]> {
  try {
    await ensureDir();
    const files = await fs.readdir(CONTENT_DIR);
    const posts: Post[] = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const raw = await fs.readFile(path.join(CONTENT_DIR, file), "utf8");
      posts.push(fromMatter(path.join(CONTENT_DIR, file), raw));
    }
    return posts;
  } catch {
    return [];
  }
}

export async function getMarkdownPost(slug: string): Promise<Post | null> {
  try {
    const raw = await fs.readFile(fileForSlug(slug), "utf8");
    return fromMatter(fileForSlug(slug), raw);
  } catch {
    return null;
  }
}

export async function createMarkdownPost(input: PostInput): Promise<Post> {
  await ensureDir();
  const slug = input.slug?.trim() || slugify(input.title);
  const existing = await getMarkdownPost(slug);
  if (existing) throw new Error(`Post already exists: ${slug}`);

  const post: Post = {
    id: randomUUID(),
    slug,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    status: input.status ?? "draft",
    published_at:
      input.published_at ??
      (input.status === "published" ? new Date().toISOString() : null),
    number: input.number ?? null,
    tags: input.tags ?? [],
    cover_blob_url: input.cover_blob_url ?? null,
    meta: input.meta ?? {},
    deleted_at: null,
  };

  await fs.writeFile(fileForSlug(slug), serialize(post), "utf8");
  return post;
}

export async function updateMarkdownPost(
  slug: string,
  patch: Partial<PostInput>,
): Promise<Post | null> {
  const current = await getMarkdownPost(slug);
  if (!current) return null;

  const nextSlug = patch.slug?.trim() || current.slug;
  const next: Post = {
    ...current,
    ...patch,
    slug: nextSlug,
    tags: patch.tags ?? current.tags,
    meta: patch.meta ?? current.meta,
    body: patch.body ?? current.body,
    title: patch.title ?? current.title,
    type: patch.type ?? current.type,
    status: patch.status ?? current.status,
    published_at:
      patch.published_at !== undefined
        ? patch.published_at
        : current.published_at,
    number: patch.number !== undefined ? patch.number : current.number,
    cover_blob_url:
      patch.cover_blob_url !== undefined
        ? patch.cover_blob_url
        : current.cover_blob_url,
  };

  if (nextSlug !== current.slug) {
    await fs.unlink(fileForSlug(current.slug)).catch(() => undefined);
  }
  await fs.writeFile(fileForSlug(next.slug), serialize(next), "utf8");
  return next;
}

export async function publishMarkdownPost(slug: string): Promise<Post | null> {
  return updateMarkdownPost(slug, {
    status: "published",
    published_at: new Date().toISOString(),
  });
}

export async function softDeleteMarkdownPost(
  slug: string,
  deletedAt = new Date().toISOString(),
): Promise<Post | null> {
  const current = await getMarkdownPost(slug);
  if (!current) return null;
  const next: Post = {
    ...current,
    status: "draft",
    deleted_at: deletedAt,
    meta: { ...current.meta, deleted_at: deletedAt },
  };
  await fs.writeFile(fileForSlug(slug), serialize(next), "utf8");
  return next;
}
