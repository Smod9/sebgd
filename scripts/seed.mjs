#!/usr/bin/env node
/**
 * Seed Neon from content/posts/*.md (idempotent upsert by slug).
 * Usage: node --env-file=.env.local scripts/seed.mjs
 */
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const sql = neon(url);
const dir = path.join(process.cwd(), "content", "posts");

await sql`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    number INTEGER,
    tags TEXT[] NOT NULL DEFAULT '{}',
    cover_blob_url TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS posts_type_idx ON posts (type)`;
await sql`CREATE INDEX IF NOT EXISTS posts_status_published_idx ON posts (status, published_at DESC)`;

const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
for (const file of files) {
  const raw = await fs.readFile(path.join(dir, file), "utf8");
  const { data, content } = matter(raw);
  const slug = data.slug || path.basename(file, ".md");
  const id = data.id || randomUUID();
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const meta = JSON.stringify(data.meta || {});
  const published_at = data.published_at
    ? new Date(data.published_at).toISOString()
    : null;

  await sql`
    INSERT INTO posts (id, slug, type, title, body, status, published_at, number, tags, cover_blob_url, meta)
    VALUES (
      ${id},
      ${slug},
      ${data.type || "note"},
      ${data.title || slug},
      ${content.trim()},
      ${data.status || "published"},
      ${published_at},
      ${typeof data.number === "number" ? data.number : null},
      ${tags},
      ${data.cover_blob_url || null},
      ${meta}::jsonb
    )
    ON CONFLICT (slug) DO UPDATE SET
      type = EXCLUDED.type,
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      number = EXCLUDED.number,
      tags = EXCLUDED.tags,
      cover_blob_url = EXCLUDED.cover_blob_url,
      meta = EXCLUDED.meta,
      updated_at = NOW()
  `;
  console.log("upserted", slug);
}

const rows = await sql`SELECT slug, type, status FROM posts ORDER BY published_at DESC NULLS LAST`;
console.log("posts:", rows.length, rows);
