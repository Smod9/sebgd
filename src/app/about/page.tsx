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
          I build software, hardware, and the systems that connect them.
        </p>
      </PageIntro>

      <div className="prose-page" style={{ maxWidth: "62ch" }}>
        <p>
          I’m based in the Gulf Islands, BC, and spend most of my attention on
          hardware-software edges — power over data, field tooling, and the
          messy middle between a lab bench and a boat that is already in the
          water.
        </p>
        <p>
          This is a collection of personal builds, ongoing projects, and
          experiments. I also write occasional notes about what I’m working on
          and thinking about.
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
            <li style={{ marginBottom: 8 }}>Building Luum</li>
            <li style={{ marginBottom: 8 }}>
              Working on Bon Vivant
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
