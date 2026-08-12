export const SITE = {
  name: "SEB",
  fullName: "Sebastien Gouin-Davis",
  title: "SEB — things under construction",
  description:
    "Notes, builds, essays, boats, and useful distractions from Salt Spring Island.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sebgd.com",
  location: "Salt Spring Island, BC · 48°49′N 123°30′W",
  email: "sebgd@icloud.com",
} as const;

export const NAV = [
  { href: "/stream", label: "Stream" },
  { href: "/work", label: "Work" },
  { href: "/writing", label: "Writing" },
  { href: "/boat", label: "Bon Vivant" },
  { href: "/quests", label: "Side Quests" },
  { href: "/about", label: "About" },
] as const;

export const WORK_STUBS = [
  {
    slug: "luum",
    title: "Luum",
    status: "Building",
    blurb: "Company home for X-PoE and related power-over-data experiments.",
  },
  {
    slug: "x-poe",
    title: "X-PoE",
    status: "In pilot",
    blurb: "Moving useful power through structured cabling without pretending the physics are optional.",
  },
  {
    slug: "bon-vivant",
    title: "Bon Vivant",
    status: "Refit in progress",
    blurb: "A boat project that refuses to stay in one domain — electrical, rig, tanks, logbook.",
  },
] as const;
