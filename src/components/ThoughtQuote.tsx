import Link from "next/link";
import type { Post } from "@/lib/types";
import { ThoughtSource } from "@/components/ThoughtSource";

export function ThoughtQuote({ post }: { post: Post }) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-CA", {
      month: "long", day: "numeric", year: "numeric", timeZone: "America/Vancouver",
    })
    : null;

  return (
    <blockquote className="thought-pullquote">
      <span className="thought-quote-mark" aria-hidden="true">“</span>
      <p>{post.body || post.title}</p>
      <div><ThoughtSource meta={post.meta} /></div>
      <footer>
        <span>Sebastien Gouin-Davis</span>
        <Link href={`/thoughts/${encodeURIComponent(post.slug)}`} aria-label={`Read latest thought${date ? ` from ${date}` : ""}`}>
          {date ? <time dateTime={post.published_at!}>{date}</time> : "Read thought"}
          <span aria-hidden="true"> ↗</span>
        </Link>
      </footer>
    </blockquote>
  );
}
