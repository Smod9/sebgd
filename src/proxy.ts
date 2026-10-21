import { NextRequest, NextResponse } from "next/server";
import { hostedSiteName, hostname, validateSiteName } from "@/lib/static-sites/rules";
import { serveSite } from "@/lib/static-sites/serve";

export async function proxy(request: NextRequest) {
  const name = hostedSiteName(hostname(request));
  if (name !== null) {
    try { validateSiteName(name); } catch { return new NextResponse("Site not found", { status: 404 }); }
    // Every path on a hosted subdomain belongs to that site, including /api and
    // /admin. Never fall through to the personal site's application routes.
    if (!["GET", "HEAD"].includes(request.method)) return new NextResponse("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    return serveSite(request, name, request.nextUrl.pathname);
  }
  // Uploaded HTML must never execute on the main site's origin.
  if (request.nextUrl.pathname === "/hosted" || request.nextUrl.pathname.startsWith("/hosted/")) return new NextResponse("Site not found", { status: 404 });
  return NextResponse.next();
}
