import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getNowItems, setNow } from "@/lib/posts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const items = await getNowItems();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items)
    ? body.items.filter((x: unknown): x is string => typeof x === "string")
    : null;
  if (!items) {
    return NextResponse.json({ error: "items[] required" }, { status: 400 });
  }
  const post = await setNow(items);
  return NextResponse.json({ post, items });
}
