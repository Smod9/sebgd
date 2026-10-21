export function ThoughtSource({ meta, className = "thought-source" }: { meta: Record<string, unknown>; className?: string }) {
  if (typeof meta.source_title !== "string") return null;
  return <p className={className}>
    {meta.source_title}
    {typeof meta.source_published_date === "string" ? <> · Episode published <time dateTime={meta.source_published_date}>{meta.source_published_date}</time></> : null}
    {typeof meta.source_timestamp === "string" ? <> · {meta.source_timestamp}</> : null}
    {meta.source_kind === "edited_transcript_excerpt" ? <> · Edited excerpt; bracketed context added.</> : null}
  </p>;
}
