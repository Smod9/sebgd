"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

export function ThoughtShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const href = `/thoughts/${encodeURIComponent(slug)}`;
  async function copy(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { router.push(href); }
  }
  return <a href={href} className="thought-share" onClick={(event) => void copy(event)} aria-label={copied ? "Thought link copied" : "Share thought"}><span aria-live="polite">{copied ? "Copied" : "Share"}</span><span aria-hidden="true">↗</span></a>;
}
