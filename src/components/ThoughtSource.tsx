export function ThoughtSource({ meta, className = "thought-source" }: { meta: Record<string, unknown>; className?: string }) {
  if (typeof meta.source_title !== "string") return null;
  const url = typeof meta.source_url === "string" && /^https:\/\/(?:podcasts\.apple\.com\/|finaldraftpod\.com\/episodes\/)/.test(meta.source_url)
    ? meta.source_url : null;
  const title = url ? <a href={url}>{meta.source_title}</a> : meta.source_title;
  const context = <>
    {typeof meta.source_published_date === "string" ? <> · Episode published <time dateTime={meta.source_published_date}>{meta.source_published_date}</time></> : null}
    {typeof meta.source_timestamp === "string" ? <> · {meta.source_timestamp}</> : null}
    {meta.source_kind === "edited_transcript_excerpt" ? <> · Edited excerpt{meta.context_editorial !== false ? "; bracketed context added" : ""}.</> : null}
    {meta.source_kind === "paraphrase" ? <> · Paraphrase.</> : null}
  </>;
  return <>
    <p className={`${className} thought-source-desktop`}>{title}{context}</p>
    <div className={`${className} thought-source-mobile`}>
      {url ? <a href={url}>{url.startsWith("https://podcasts.apple.com/") ? "Apple Podcasts" : "Episode"} ↗</a> : null}
      <details><summary>Source details</summary><p>{meta.source_title}{context}</p></details>
    </div>
  </>;
}
