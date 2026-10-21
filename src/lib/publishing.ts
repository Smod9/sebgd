import type { PostInput } from "@/lib/types";

export const THOUGHT_LIMIT = 140;
export const characterCount = (text: string) => Array.from(text).length;
export const isExtendedExcerpt = (meta?: Record<string, unknown>) => meta?.extended_excerpt === true && meta.source_kind === "edited_transcript_excerpt";

export function thoughtTitle(body: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  return Array.from(text).slice(0, 60).join("") + (characterCount(text) > 60 ? "…" : "");
}

export function projectUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function validatePostContent(input: Pick<PostInput, "type" | "body" | "meta">): void {
  if (input.type === "note" && input.meta?.format === "thought") {
    if (!input.body?.trim()) throw new Error("Write a thought first.");
    if (!isExtendedExcerpt(input.meta) && characterCount(input.body.trim()) > THOUGHT_LIMIT) throw new Error("Thoughts are limited to 140 characters.");
  }
  if (input.type === "work") {
    for (const key of ["demo_url", "repo_url", "instagram_url"]) {
      if (input.meta?.[key] && !projectUrl(input.meta[key])) throw new Error("Project links must be valid http or https URLs.");
    }
  }
}
