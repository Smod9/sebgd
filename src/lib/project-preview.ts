import type { ProjectCard } from "@/components/ProjectGrid";

// Proposed selection for local design review only. These are not published posts.
// The homepage only uses this list in development with ?preview=1.
export const PROJECT_PREVIEW: ProjectCard[] = [
  {
    id: "preview-letters",
    title: "Letters & Marbles",
    description: "3D-printable marble runs that follow the strokes of handwritten letters.",
    href: "https://marbles.sebgd.com/",
    cover: "/projects/letters-and-marbles.png",
    tags: ["3D printing", "Learning"],
  },
  {
    id: "preview-articulation",
    title: "Articulation Dojo",
    description: "A speaking-practice app with prompts, drills, and AI coaching on clarity.",
    href: "https://dojo.sebgd.com/",
    cover: "/api/social-card/preview-articulation",
    tags: ["AI", "Software"],
  },
  {
    id: "preview-final-draft",
    title: "Final Draft",
    description: "Final Draft is Sebastien and Eric thinking out loud about AI, humanity, and the companies they can't seem to stop starting. They're experienced leaders, serial entrepreneurs, and AI superusers who put new tools to work in real life. Expect candid conversations about what AI makes possible, what still takes human judgment, and the ideas that might become their next venture.",
    href: "https://pod.sebgd.com/",
    cover: "/projects/final-draft.png",
    tags: ["Podcast", "AI & humanity"],
    group: "other",
  },
  {
    id: "preview-boat",
    title: "The boat",
    description: "Bon Vivant. A refit, a logbook, and plenty of systems to work on.",
    href: "/boat",
    instagramUrl: "https://www.instagram.com/thebonvivantproject/",
    cover: "/projects/bon-vivant.jpg",
    tags: ["Ongoing", "Bon Vivant"],
  },
  {
    id: "preview-luum",
    title: "Luum.io",
    description: "Power, lighting, and controls. Hardware and software built together.",
    href: "https://luum.io",
    cover: "https://luum.io/opengraph-image",
    tags: ["Ongoing", "Hardware & software"],
  },
  {
    id: "preview-schematic",
    title: "Schematic Maker",
    description: "A boat electrical schematic tool with automatic layout and an AI assistant.",
    href: "https://wires.sebgd.com/",
    cover: "/api/social-card/preview-schematic",
    tags: ["Software", "Electrical"],
  },
];

export function withProjectPreview(published: ProjectCard[]): ProjectCard[] {
  const titles = new Set(published.map((project) => project.title.toLowerCase()));
  return [...published, ...PROJECT_PREVIEW.filter((project) => !titles.has(project.title.toLowerCase()))];
}
