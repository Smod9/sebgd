import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import {
  getPost,
  getPostById,
  publishPost,
  softDeletePost,
  updatePost,
} from "@/lib/posts";
import { POST_TYPES, type PostType } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const post = (await getPostById(id)) ?? (await getPost(id));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = (body as { action?: string }).action;
  if (action === "publish") {
    const existing = (await getPostById(id)) ?? (await getPost(id));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const post = await publishPost(existing.slug);
    return NextResponse.json({ post });
  }

  const patch: Record<string, unknown> = {};
  for (const key of [
    "slug",
    "title",
    "body",
    "status",
    "published_at",
    "number",
    "tags",
    "cover_blob_url",
    "meta",
  ] as const) {
    if (key in body) patch[key] = (body as Record<string, unknown>)[key];
  }
  if ("type" in body) {
    const t = (body as { type?: string }).type;
    if (!t || !POST_TYPES.includes(t as PostType)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    patch.type = t;
  }

  const byId = await getPostById(id);
  const post = byId
    ? await updatePost({ id }, patch)
    : await updatePost({ slug: id }, patch);

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  const byId = await getPostById(id);
  const post = byId
    ? await softDeletePost({ id: byId.id })
    : await softDeletePost({ slug: id });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post, deleted: true });
}
