import Link from "next/link";
import type { Post } from "@/lib/types";
import { formatDate, formatNumber, typeLabel } from "@/lib/posts";

function hrefFor(post: Post): string {
  if (post.type === "essay") return `/writing/${post.slug}`;
  if (post.type === "work") return `/work/${post.slug}`;
  if (post.type === "boat_log") return `/boat#${post.slug}`;
  if (post.type === "quest") return `/quests#${post.slug}`;
  return `/stream#${post.slug}`;
}

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="post-list">
      {posts.map((post) => (
        <article key={post.id} id={post.slug} className="post-row">
          <div className="post-meta">
            <span className="type-chip">{typeLabel(post.type)}</span>
            <span className="mono muted tiny">{formatDate(post.published_at)}</span>
            {formatNumber(post.number) ? (
              <span className="mono muted tiny">{formatNumber(post.number)}</span>
            ) : null}
          </div>
          <div className="post-body">
            <h2>
              <Link href={hrefFor(post)}>{post.title}</Link>
            </h2>
            {post.body ? (
              <p className="post-excerpt">
                {post.body.split("\n\n")[0]?.slice(0, 220)}
                {post.body.split("\n\n")[0] &&
                post.body.split("\n\n")[0].length > 220
                  ? "…"
                  : ""}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
