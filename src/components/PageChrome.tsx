import Link from "next/link";
import type { ReactNode } from "react";

export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1>{title}</h1>
      {children ? <div className="page-intro-copy">{children}</div> : null}
    </header>
  );
}

export function SectionRule({
  left,
  right,
}: {
  left: string;
  right?: string;
}) {
  return (
    <div className="section-rule">
      <span>{left}</span>
      {right ? <span className="muted">{right}</span> : null}
    </div>
  );
}

export function CtaGroup() {
  return (
    <div className="cta-group">
      <Link href="/stream" className="btn btn-primary">
        Read the stream
      </Link>
      <Link href="/work" className="btn btn-secondary">
        See the work
      </Link>
    </div>
  );
}
