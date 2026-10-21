import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="footer-brand">Sebastien Gouin-Davis</p>
          <p className="muted tiny">Salt Spring Island, BC</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/stream">Thoughts</Link>
          <a href="https://github.com/Smod9">GitHub</a>
          <a href={`mailto:${SITE.email}`}>Say hello ↗</a>
          <Link href="/rss.xml">RSS</Link>
        </nav>
      </div>
    </footer>
  );
}
