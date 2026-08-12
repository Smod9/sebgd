export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, SectionRule } from "@/components/PageChrome";
import { listPosts } from "@/lib/posts";
import { WORK_STUBS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Work",
  description: "Projects under construction — titles and status, no fake numbers.",
};

export default async function WorkPage() {
  const workPosts = await listPosts({ type: "work", status: "published" });
  const bySlug = new Map(workPosts.map((p) => [p.slug, p]));

  return (
    <>
      <PageIntro kicker="Work" title="Projects, unfinished on purpose.">
        <p>
          Status lines only. When a project deserves a longer write-up, it gets
          a page — not a vanity metric strip.
        </p>
      </PageIntro>
      <SectionRule left="Active" right={`${WORK_STUBS.length} stubs`} />
      <div className="work-list">
        {WORK_STUBS.map((item) => {
          const post = bySlug.get(item.slug);
          return (
            <article key={item.slug} className="work-item">
              <p className="work-status mono tiny muted">{item.status}</p>
              <h2>
                <Link href={`/work/${item.slug}`}>{item.title}</Link>
              </h2>
              <p>{post?.body.split("\n\n")[0] || item.blurb}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
