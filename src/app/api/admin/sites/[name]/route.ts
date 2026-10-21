import { assertAdmin } from "@/lib/auth";
import { readPublishRequest, siteError } from "@/lib/static-sites/http";
import { publishSite, readSite, summarize, unpublishSite } from "@/lib/static-sites/store";
import { SiteError, validateSiteName } from "@/lib/static-sites/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ name: string }> };

export async function GET(request: Request, { params }: Context) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  try {
    const { name } = await params;
    const result = await readSite(name);
    return Response.json({ site: result ? summarize(result.site) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return siteError(error); }
}

export async function PUT(request: Request, { params }: Context) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  try {
    const { name } = await params;
    validateSiteName(name);
    const { files, revision, spa } = await readPublishRequest(request);
    return Response.json({ site: await publishSite(name, files, revision, spa) });
  } catch (error) { return siteError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  try {
    const { name } = await params;
    validateSiteName(name);
    const revision = request.headers.get("x-sebgd-site-revision");
    if (!revision) throw new SiteError("Send the current revision in the X-Sebgd-Site-Revision header.");
    return Response.json({ site: await unpublishSite(name, revision) });
  } catch (error) { return siteError(error); }
}
