"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 900;

type Props = {
  title: string;
  cover: string;
  website: string | null;
  embedUrl: string | null;
  coverPosition?: string;
};

export function ProjectPreview({ title, cover, website, embedUrl, coverPosition }: Props) {
  const [showLive, setShowLive] = useState(Boolean(embedUrl));
  const [failed, setFailed] = useState(false);
  const live = Boolean(embedUrl && showLive && !failed);
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = viewport.current;
    if (!live || !element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [live]);

  return (
    <div className="project-preview">
      {live ? <div ref={viewport} className="project-live-viewport">
        <iframe
          src={embedUrl!}
          title={`${title} live website preview`}
          loading="lazy"
          width={DESKTOP_WIDTH}
          height={DESKTOP_HEIGHT}
          style={{ transform: `scale(${width / DESKTOP_WIDTH})` }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
        />
      </div> : <>
        {website ? <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${title}`}>
          <Image src={cover} alt={`${title} project preview`} width={1200} height={630} unoptimized sizes="(max-width: 800px) 100vw, 60vw" style={{ objectPosition: coverPosition }} />
        </a> : <Image src={cover} alt={`${title} project preview`} width={1200} height={630} unoptimized sizes="(max-width: 800px) 100vw, 60vw" style={{ objectPosition: coverPosition }} />}
      </>}
      {website ? <div className="project-preview-caption">
        <a href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${title}`}><span>{new URL(website).hostname.replace(/^www\./, "")}</span><span aria-hidden="true">↗</span></a>
        {embedUrl ? <button type="button" onClick={() => { setFailed(false); setShowLive(!live); }}>{live ? "Show image" : "Live preview"}</button> : <span className="project-preview-separate">Opens in a new tab</span>}
      </div> : null}
    </div>
  );
}
