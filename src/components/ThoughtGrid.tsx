import { ThoughtMasonry } from "@/components/ThoughtMasonry";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { ThoughtLikes, ThoughtLikeButton } from "@/components/ThoughtLikes";
import { ThoughtShareButton } from "@/components/ThoughtShareButton";

export function ThoughtGrid({ posts }: { posts: Post[] }) {
  const date = (value: string) => new Date(value).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Vancouver" });
  const ideaDate = (value: string) => {
    const [year, month, day] = value.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
  };
  return (
    <ThoughtLikes ids={posts.map((post) => post.id)}><ThoughtMasonry>
      {posts.map((post) => (
        <article key={post.id} id={post.slug} className="thought-card">
          <p className="thought-date">
            {post.status === "draft" && typeof post.meta.idea_date === "string" ? <><span>Approx. </span><time dateTime={post.meta.idea_date}>{ideaDate(post.meta.idea_date)}</time></> : post.status === "draft" && typeof post.meta.created_at === "string" ? <><span>Drafted </span><time dateTime={post.meta.created_at}>{date(post.meta.created_at)}</time></> : post.published_at ? <time dateTime={post.published_at}>{date(post.published_at)}</time> : "Undated thought"}
          </p>
          <p className="thought-text">{post.body || post.title}</p>
          <div className="thought-actions"><ThoughtLikeButton id={post.id} />
            {post.status === "draft" ? <Link href={`/admin/posts/${encodeURIComponent(post.id)}`} className="thought-permalink" aria-label={`Edit draft thought: ${(post.body || post.title).slice(0, 60)}`}>Edit draft</Link> : null}
            <ThoughtShareButton slug={post.slug} />
          </div>
        </article>
      ))}
    </ThoughtMasonry></ThoughtLikes>
  );
}
