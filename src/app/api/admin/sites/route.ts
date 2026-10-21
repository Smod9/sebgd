import { assertAdmin } from "@/lib/auth";
import { listSites } from "@/lib/static-sites/store";
import { siteError } from "@/lib/static-sites/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  try { return Response.json({ sites: await listSites() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return siteError(error); }
}
