import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export function getAdminToken(): string | null {
  return process.env.SEBGD_ADMIN_TOKEN?.trim() || null;
}

export function assertAdmin(request: Request): NextResponse | null {
  const expected = getAdminToken();
  if (!expected) {
    return NextResponse.json(
      { error: "Admin token not configured" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const alt = request.headers.get("x-sebgd-admin-token")?.trim() ?? "";
  const provided = bearer || alt;

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
