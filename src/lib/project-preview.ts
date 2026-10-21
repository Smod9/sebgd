import type { ProjectCard } from "@/components/ProjectGrid";

// Proposed selection for local design review only. These are not published posts.
// The homepage only uses this list in development with ?preview=1.
export const PROJECT_PREVIEW: ProjectCard[] = [
  {
    id: "preview-letters",
    title: "Letters & Marbles",
    description: "3D-printable marble runs that follow the strokes of handwritten letters.",
    href: "https://letters-and-marbles.vercel.app",
    cover: "/projects/letters-and-marbles.png",
    coverFit: "contain",
    tags: ["3D printing", "Learning"],
  },
  {
    id: "preview-articulation",
    title: "Articulation Dojo",
    description: "A speaking-practice app with prompts, drills, and AI coaching on clarity.",
    href: "https://articulation-dojo.vercel.app",
    tags: ["AI", "Software"],
  },
  {
    id: "preview-final-draft",
    title: "Final Draft",
    description: "A podcast website with a clickable transcript.",
    href: "https://finaldraftpod.com",
    cover: "/projects/final-draft.png",
    coverFit: "contain",
    tags: ["Web", "Audio"],
  },
  {
    id: "preview-boat",
    title: "The boat",
    description: "Bon Vivant. A refit, a logbook, and plenty of systems to work on.",
    href: "/boat",
    cover: "/projects/bon-vivant.jpg",
    tags: ["Ongoing", "Bon Vivant"],
  },
  {
    id: "preview-luum",
    title: "Luum",
    description: "Power, lighting, and controls. Hardware and software built together.",
    href: "https://luum.io",
    cover: "/projects/luum.png",
    coverFit: "contain",
    tags: ["Ongoing", "Hardware & software"],
  },
  {
    id: "preview-schematic",
    title: "Schematic Maker",
    description: "A boat electrical schematic tool with automatic layout and an AI assistant.",
    href: "https://schematic-maker-gamma.vercel.app",
    tags: ["Software", "Electrical"],
  },
];
