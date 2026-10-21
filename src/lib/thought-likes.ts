import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db";

export type ThoughtReaction = { count: number; liked: boolean };
let schema: Promise<unknown> | null = null;

async function database() {
  const db = getDb();
  if (db) {
    schema ??= db`CREATE TABLE IF NOT EXISTS thought_likes (post_id TEXT NOT NULL, visitor_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (post_id, visitor_id))`;
    await schema;
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Persistent likes require DATABASE_URL in production.");
  }
  return db;
}

function directory(id: string) {
  return path.join(process.cwd(), ".local", "thought-likes", createHash("sha256").update(id).digest("hex"));
}

export async function readThoughtLikes(ids: string[], visitor: string): Promise<Record<string, ThoughtReaction>> {
  const result = Object.fromEntries(ids.map((id) => [id, { count: 0, liked: false }]));
  const db = await database();
  if (db && ids.length) {
    const rows = await db`SELECT post_id, COUNT(*)::int AS count, BOOL_OR(visitor_id = ${visitor}::uuid) AS liked FROM thought_likes WHERE post_id = ANY(${ids}::text[]) GROUP BY post_id`;
    for (const row of rows) result[String(row.post_id)] = { count: Number(row.count), liked: Boolean(row.liked) };
  } else {
    await Promise.all(ids.map(async (id) => {
      const files: string[] = await readdir(directory(id)).catch((error) => {
        if (error.code === "ENOENT") return [] as string[];
        throw error;
      });
      result[id] = { count: files.filter((file) => file.endsWith(".like")).length, liked: files.includes(visitor + ".like") };
    }));
  }
  return result;
}

export async function setThoughtLike(id: string, visitor: string, liked: boolean): Promise<ThoughtReaction> {
  if (!/^[0-9a-f-]{36}$/i.test(visitor)) throw new Error("Invalid visitor");
  const db = await database();
  if (db) {
    if (liked) await db`INSERT INTO thought_likes (post_id, visitor_id) VALUES (${id}, ${visitor}::uuid) ON CONFLICT DO NOTHING`;
    else await db`DELETE FROM thought_likes WHERE post_id = ${id} AND visitor_id = ${visitor}::uuid`;
  } else {
    const folder = directory(id);
    await mkdir(folder, { recursive: true });
    const file = path.join(folder, visitor + ".like");
    if (liked) await writeFile(file, "1", { flag: "wx" }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    else await rm(file, { force: true });
  }
  return (await readThoughtLikes([id], visitor))[id];
}
