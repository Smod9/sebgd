export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PageIntro } from "@/components/PageChrome";
import { getNowItems } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Sebastien Gouin-Davis — engineer, boats, systems.",
};

export default async function AboutPage() {
  const now = await getNowItems();

  return (
    <>
      <PageIntro kicker="About" title={SITE.fullName}>
        <p>
          Engineer. Boats. Systems that have to work when the weather does not
          care about your roadmap.
        </p>
      </PageIntro>

      <div className="prose-page" style={{ maxWidth: "62ch" }}>
        <p>
          I live on Salt Spring Island and spend most of my attention on
          hardware-software edges — power over data, field tooling, and the
          messy middle between a lab bench and a boat that is already in the
          water.
        </p>
        <p>
          This site is intentionally unfinished. The stream is for things I can
          stand behind. Work pages stay as stubs until there is a real story,
          not a metrics costume.
        </p>
        <p>
          If you are looking for a polished personal brand kit, you are early —
          or late, depending on how you feel about sanding.
        </p>

        <h2
          style={{
            marginTop: 36,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Now
        </h2>
        {now.length > 0 ? (
          <ul style={{ paddingLeft: "1.1em", marginTop: 12 }}>
            {now.map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <ul style={{ paddingLeft: "1.1em", marginTop: 12 }}>
            <li style={{ marginBottom: 8 }}>Building Luum — X-PoE in pilot</li>
            <li style={{ marginBottom: 8 }}>
              Refitting Bon Vivant — electrical
            </li>
            <li style={{ marginBottom: 8 }}>
              Writing this site so agents can backfill the rest
            </li>
          </ul>
        )}

        <p className="mono tiny muted" style={{ marginTop: 28 }}>
          {SITE.location}
        </p>
      </div>
    </>
  );
}
