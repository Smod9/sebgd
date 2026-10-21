import { listPosts } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const thoughtsOnly = new URL(request.url).searchParams.get("type") === "note";
  const posts = await listPosts({ status: "published", type: thoughtsOnly ? "note" : undefined });
  const cdata = (value: string) => value.replaceAll("]]>", "]]]]><![CDATA[>");
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const items = posts
    .map((post) => {
      const link =
        post.type === "essay"
          ? `${SITE.url}/writing/${post.slug}`
          : post.type === "work"
            ? `${SITE.url}/work/${post.slug}`
            : post.type === "boat_log" ? `${SITE.url}/boat#${post.slug}`
            : post.type === "quest" ? `${SITE.url}/quests#${post.slug}`
            : `${SITE.url}/thoughts/${post.slug}`;
      const date = post.published_at
        ? new Date(post.published_at).toUTCString()
        : null;
      return `
    <item>
      <title><![CDATA[${cdata(post.title)}]]></title>
      <link>${escape(link)}</link>
      <guid isPermaLink="true">${escape(link)}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ""}
      <description><![CDATA[${cdata(post.body.slice(0, 500))}]]></description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${thoughtsOnly ? "Sebastien Gouin-Davis — Thoughts" : SITE.name}</title>
    <link>${SITE.url}</link>
    <description>${escape(thoughtsOnly ? "Short thoughts from Sebastien Gouin-Davis." : SITE.description)}</description>
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
