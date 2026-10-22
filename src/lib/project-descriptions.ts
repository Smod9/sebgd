export const PROJECT_SUMMARY_LIMIT = 160;

/** Bound overview copy, including older posts without a dedicated summary. */
export function projectSummary(value: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  const characters = Array.from(text);
  if (characters.length <= PROJECT_SUMMARY_LIMIT) return text;
  const clipped = characters.slice(0, PROJECT_SUMMARY_LIMIT - 1).join("");
  const boundary = clipped.lastIndexOf(" ");
  const end = boundary >= clipped.length * 0.8 ? boundary : clipped.length;
  return clipped.slice(0, end).trimEnd() + "…";
}
