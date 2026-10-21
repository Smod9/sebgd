export const SITE = {
  name: "SEB",
  fullName: "Sebastien Gouin-Davis",
  title: "Sebastien Gouin-Davis — projects & experiments",
  description:
    "Software, hardware, and personal projects by Sebastien Gouin-Davis. Built in the Gulf Islands, BC.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sebgd.com",
  location: "Built in the Gulf Islands, BC.",
  email: "sebgd@icloud.com",
} as const;

export const NAV = [
  { href: "/work", label: "Projects" },
  { href: "/stream", label: "Thoughts" },
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
