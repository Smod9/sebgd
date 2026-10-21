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
    let previousSize = "";
    const cards = Array.from(element.querySelectorAll<HTMLElement>(".thought-card"));

    const layout = () => {
      if (!masonry) return;
      const gap = parseFloat(getComputedStyle(element).getPropertyValue("--thought-gap"));
      const size = [element.getBoundingClientRect().width, gap, ...cards.flatMap((card) => {
        const bounds = card.getBoundingClientRect();
        return [bounds.width, bounds.height];
      })].join(",");
      // Masonry writes the container height. Ignore that observer notification,
      // along with hover/focus changes that leave all card dimensions intact.
      if (size === previousSize) return;
      previousSize = size;
      masonry.option?.({ gutter: gap });
      masonry.layout?.();
    };

    void import("masonry-layout").then(({ default: MasonryLayout }) => {
      if (cancelled) return;
      // data-masonry is reserved by the library and would auto-create a second instance.
      element.dataset.thoughtLayout = "true";
      const options: Masonry.Options & { layoutInstant: boolean } = {
        itemSelector: ".thought-card",
        columnWidth: ".thought-grid-sizer",
        // Percentage offsets scale immediately with CSS widths while old top
        // positions remain. Keep both axes in pixels and update before paint.
        percentPosition: false,
        horizontalOrder: false,
        transitionDuration: 0,
        // Skip Outlayer's translate3d move path entirely, even at duration 0,
        // so resized cards do not leave temporary composited border layers.
        layoutInstant: true,
        resize: false,
        initLayout: false,
      };
      masonry = new MasonryLayout(element, options);
      layout();
      observer = new ResizeObserver(layout);
      observer.observe(element);
      cards.forEach((card) => observer?.observe(card));
      window.addEventListener("resize", layout);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", layout);
      observer?.disconnect();
      masonry?.destroy?.();
      delete element.dataset.thoughtLayout;
    };
  }, [children]);

  return <div ref={grid} className="thought-grid"><div className="thought-grid-sizer" aria-hidden="true" />{children}</div>;
}
