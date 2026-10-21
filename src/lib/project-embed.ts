import { projectUrl } from "@/lib/publishing";

// These public pages were checked before enabling live previews. The podcast
// and Dojo deny framing; Schematic Maker opens directly into a sign-in screen.
const separateTabHosts = new Set([
  "pod.sebgd.com", "finaldraftpod.com", "www.finaldraftpod.com", "final-draft-podcast.vercel.app",
  "dojo.sebgd.com", "articulation-dojo.vercel.app",
  "wires.sebgd.com", "schematic-maker-gamma.vercel.app",
]);

export function projectEmbedUrl(website: unknown, enabled: unknown = true): string | null {
  const url = projectUrl(website);
  if (!url || enabled === false) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || separateTabHosts.has(parsed.hostname)) return null;
  return url;
}
