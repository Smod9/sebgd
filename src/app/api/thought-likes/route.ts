import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { listThoughts } from "@/lib/thoughts";
import { readThoughtLikes, setThoughtLike } from "@/lib/thought-likes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = "sebgd_thought_visitor";

function visitor(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(cookie + "="))?.slice(cookie.length + 1);
  return value && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) ? value : randomUUID();
}

function response(request: Request, id: string, body: unknown) {
  const result = NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  result.cookies.set(cookie, id, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return result;
}

export async function GET(request: Request) {
  const ids = [...new Set(new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [])];
  if (!ids.length || ids.length > 100 || ids.some((id) => id.length > 128)) return NextResponse.json({ error: "Invalid thought IDs" }, { status: 400 });
  const allowed = new Set((await listThoughts()).map((post) => post.id));
  if (ids.some((id) => !allowed.has(id))) return NextResponse.json({ error: "Thought not found" }, { status: 404 });
  try {
    const id = visitor(request);
    return response(request, id, { reactions: await readThoughtLikes(ids, id) });
  } catch { return NextResponse.json({ error: "Likes are unavailable right now." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Next may normalize the request URL to localhost in development. Compare the
  // browser origin with the actual incoming host, including its port.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (origin && new URL(origin).host !== host) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || typeof body.liked !== "boolean") return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  const allowed = (await listThoughts()).some((post) => post.id === body.id);
  if (!allowed) return NextResponse.json({ error: "Thought not found" }, { status: 404 });
  try {
    const id = visitor(request);
    return response(request, id, { reaction: await setThoughtLike(body.id, id, body.liked) });
  } catch { return NextResponse.json({ error: "Could not save that thumbs up." }, { status: 503 }); }
}
