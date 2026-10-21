"use client";

import Image from "next/image";
import { useState } from "react";

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

  return (
    <div className="project-preview">
      {live ? <div className="project-live-viewport">
        <iframe
          src={embedUrl!}
          title={`${title} live website preview`}
          loading="lazy"
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
