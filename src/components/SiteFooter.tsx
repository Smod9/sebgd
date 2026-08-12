import Link from "next/link";
import { NAV, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="footer-brand">{SITE.name}</p>
          <p className="muted mono tiny">{SITE.location}</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/rss.xml">RSS</Link>
        </nav>
      </div>
    </footer>
  );
}
