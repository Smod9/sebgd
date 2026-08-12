import { listPosts } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function GET() {
  const posts = await listPosts({ status: "published" });
  const items = posts
    .map((post) => {
      const link =
        post.type === "essay"
          ? `${SITE.url}/writing/${post.slug}`
          : post.type === "work"
            ? `${SITE.url}/work/${post.slug}`
            : `${SITE.url}/stream#${post.slug}`;
      const date = post.published_at
        ? new Date(post.published_at).toUTCString()
        : new Date().toUTCString();
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${date}</pubDate>
      <description><![CDATA[${post.body.slice(0, 500)}]]></description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE.name}</title>
    <link>${SITE.url}</link>
    <description>${SITE.description}</description>
    <language>en-ca</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate",
    },
  });
}
