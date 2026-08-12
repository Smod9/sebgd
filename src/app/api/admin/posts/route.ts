import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { createPost, listPosts } from "@/lib/posts";
import { POST_TYPES, type PostType } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as PostType | null;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "draft" || statusParam === "published" || statusParam === "all"
      ? statusParam
      : "all";

  const posts = await listPosts({
    type: type && POST_TYPES.includes(type) ? type : undefined,
    status,
    includeNow: true,
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, title } = body as { type?: string; title?: string };
  if (!type || !POST_TYPES.includes(type as PostType) || !title?.trim()) {
    return NextResponse.json(
      { error: "type and title are required" },
      { status: 400 },
    );
  }

  try {
    const post = await createPost({
      type: type as PostType,
      title: title.trim(),
      slug: typeof body.slug === "string" ? body.slug : undefined,
      body: typeof body.body === "string" ? body.body : "",
      status: body.status === "published" ? "published" : "draft",
      published_at:
        typeof body.published_at === "string" ? body.published_at : undefined,
      number: typeof body.number === "number" ? body.number : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t: unknown): t is string => typeof t === "string")
        : undefined,
      cover_blob_url:
        typeof body.cover_blob_url === "string" ? body.cover_blob_url : undefined,
      meta:
        body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
          ? body.meta
          : undefined,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 400 },
    );
  }
}
