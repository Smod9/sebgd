import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sql: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Lazy Neon client — safe to import at build time without DATABASE_URL. */
export function getDb(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`
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
          deleted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
      await db`CREATE INDEX IF NOT EXISTS posts_type_idx ON posts (type)`;
      await db`CREATE INDEX IF NOT EXISTS posts_status_published_idx ON posts (status, published_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS posts_deleted_at_idx ON posts (deleted_at)`;
    })();
  }
  await schemaReady;
  return true;
}
