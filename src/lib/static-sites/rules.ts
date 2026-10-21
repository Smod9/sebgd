import projectDomains from "../../../content/project-domains.json";

export const MAX_SITE_BYTES = 3 * 1024 * 1024;
export const MAX_SITE_FILES = 100;
export const SITE_DOMAIN = "sebgd.com";
const RESERVED = new Set([
  "www", "admin", "api", "mail", "email", "smtp", "ftp", "ns1", "ns2",
  "autodiscover", "autoconfig", "localhost", "schem", "sls", "bv",
  ...projectDomains.map((domain) => domain.hostname.split(".")[0]),
]);

export class SiteError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validateSiteName(value: string): string {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) {
    throw new SiteError("Use 1–63 lowercase letters, numbers, or hyphens; start and end with a letter or number.");
  }
  if (RESERVED.has(value) || value.startsWith("xn--")) throw new SiteError("That subdomain is reserved.");
  return value;
}

export function hostname(request: Request): string {
  // Use Host, never client-supplied forwarded-host headers.
  return (request.headers.get("host") || new URL(request.url).host).toLowerCase().replace(/:\d+$/, "");
}

export function hostedSiteName(host: string): string | null {
  const suffix = host.endsWith(`.${SITE_DOMAIN}`) ? `.${SITE_DOMAIN}` : host.endsWith(".localhost") ? ".localhost" : null;
  if (!suffix) return null;
  const name = host.slice(0, -suffix.length);
  if (name === "www" && suffix === `.${SITE_DOMAIN}`) return null;
  // Redirects and native aliases are handled by their existing projects/config.
  if (projectDomains.some((domain) => domain.hostname === host) || ["schem", "sls", "bv"].includes(name)) return null;
  return name;
}

export function validateRequestPath(path: string): string {
  if (!path || path.length > 240 || /[\\\x00-\x1f\x7f%?#:]/.test(path)) throw new SiteError(`Invalid file path: ${path}`);
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment.startsWith(".") || segment === "node_modules")) {
    throw new SiteError(`Hidden files and unsafe paths cannot be published: ${path}`);
  }
  if (/\.(?:pem|key|p12|pfx|sqlite|db|map)$/i.test(path)) throw new SiteError(`Do not publish private files or source maps: ${path}`);
  return path;
}

export function validateFilePath(path: string): string {
  validateRequestPath(path);
  if (!contentType(path)) throw new SiteError(`Unsupported static file: ${path}`);
  return path;
}

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8", xml: "application/xml", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", ico: "image/x-icon",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", pdf: "application/pdf",
  webmanifest: "application/manifest+json", wasm: "application/wasm", mp3: "audio/mpeg", mp4: "video/mp4", webm: "video/webm",
};

export function contentType(path: string): string | undefined { return TYPES[path.split(".").pop()?.toLowerCase() || ""]; }

export function resolveSitePath(paths: string[], requestPath: string, spa: boolean, acceptsHtml: boolean): string | null {
  const path = requestPath.replace(/^\/+|\/+$/g, "");
  const candidates = path ? [path, `${path}/index.html`, `${path}.html`] : ["index.html"];
  const match = candidates.find((candidate) => paths.includes(candidate));
  if (match) return match;
  // SPA routing never turns missing assets into HTML responses.
  return spa && acceptsHtml && !path.split("/").pop()?.includes(".") ? "index.html" : null;
}
