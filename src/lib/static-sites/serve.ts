import { resolveSitePath, validateRequestPath } from "@/lib/static-sites/rules";
import { readSite } from "@/lib/static-sites/store";
import { readObject } from "@/lib/static-sites/storage";

const missing = () => new Response("Site or file not found", { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });

export async function serveSite(request: Request, name: string, pathname: string) {
  let path: string[];
  try {
    path = pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
    if (path.length) validateRequestPath(path.join("/"));
  } catch { return missing(); }
  try {
    const result = await readSite(name);
    if (!result?.site.published) return missing();
    const site = result.site;
    const resolved = resolveSitePath(site.files.map((file) => file.path), path.join("/"), site.spa, (request.headers.get("accept") || "").includes("text/html"));
    const file = site.files.find((entry) => entry.path === resolved);
    if (!file) return missing();
    // A directory needs its trailing slash for relative CSS/images to resolve.
    if (path.length && file.path === `${path.join("/")}/index.html` && !pathname.endsWith("/")) {
      const url = new URL(request.url);
      url.host = request.headers.get("host") || url.host;
      url.pathname = `/${path.join("/")}/`;
      return Response.redirect(url, 308);
    }
    const object = await readObject(file.key);
    if (!object) return missing();
    const headers = {
      "Content-Type": file.contentType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Origin-Agent-Cluster": "?1",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "ETag": `"${site.revision}-${encodeURIComponent(file.path)}"`,
      "Content-Security-Policy": "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
      "X-Sebgd-Site-Revision": site.revision,
    };
    if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
    return new Response(request.method === "HEAD" ? null : Buffer.from(object.body), { headers });
  } catch (error) {
    console.error("Static site could not be served", error);
    return new Response("Site temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
