"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-mark" aria-label="Sebastien Gouin-Davis home">
          <span className="profile-avatar">
            <Image
              src="/seb-sailing.png"
              alt=""
              width={1024}
              height={1536}
              sizes="(max-width: 640px) 52px, 160px"
              className="profile-image"
            />
          </span>
          <span className="brand-name">Sebastien Gouin-Davis</span>
        </Link>

        <nav className="nav-desktop" aria-label="Primary">
          {NAV.map((item) => {
            const current =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
