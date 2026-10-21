"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type Masonry from "masonry-layout";

export function ThoughtMasonry({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    let cancelled = false;
    let masonry: Masonry | undefined;
    let observer: ResizeObserver | undefined;

    void import("masonry-layout").then(({ default: MasonryLayout }) => {
      if (cancelled) return;
      element.dataset.masonry = "true";
      masonry = new MasonryLayout(element, {
        itemSelector: ".thought-card",
        columnWidth: ".thought-grid-sizer",
        gutter: parseFloat(getComputedStyle(element).getPropertyValue("--thought-gap")),
        percentPosition: true,
        horizontalOrder: false,
        transitionDuration: 0,
      });
      // Text edits and responsive widths can change card heights. Hover cannot:
      // its permanently reserved controls only change opacity.
      observer = new ResizeObserver(() => {
        masonry?.option?.({ gutter: parseFloat(getComputedStyle(element).getPropertyValue("--thought-gap")) });
        masonry?.layout?.();
      });
      element.querySelectorAll(".thought-card").forEach((card) => observer?.observe(card));
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      masonry?.destroy?.();
      delete element.dataset.masonry;
    };
  }, [children]);

  return <div ref={grid} className="thought-grid"><div className="thought-grid-sizer" aria-hidden="true" />{children}</div>;
}
