import Link from "next/link";

export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {ctaHref && ctaLabel ? (
        <p>
          <Link href={ctaHref} className="text-link">
            {ctaLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
