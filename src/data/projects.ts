/** Tekstene ligger i messages/*.json under projects.items.<slug>. */
export interface Project {
  slug: string;
  title: string;
  tech: string[];
  github?: string;
  live?: string;
  featured: boolean;
  status?: "active" | "on-ice";
  /** Produktfarge fra GetPlatform (platforms.color) */
  color: string;
}

export const projects: Project[] = [
  {
    slug: "attorly",
    color: "#6366F1",
    title: "Attorly",
    tech: ["Next.js", "TypeScript", "Claude", "PostgreSQL", "Stripe"],
    live: "https://attorly.ai",
    featured: true,
  },
  {
    slug: "tenderen",
    color: "#0EA5E9",
    title: "Tenderen",
    tech: ["Next.js", "TypeScript", "Node.js", "Claude", "PostgreSQL"],
    live: "https://tenderen.com",
    featured: true,
  },
  {
    slug: "getintent",
    color: "#A78BFA",
    title: "GetIntent",
    tech: ["Next.js", "TypeScript", "AI/LLM", "Edge Functions"],
    live: "https://getintent.co",
    featured: true,
  },
  {
    slug: "faceshot",
    color: "#F472B6",
    title: "FaceShot",
    tech: ["React", "Vite", "FastAPI", "Gemini", "PostgreSQL"],
    live: "https://faceshot.ai",
    featured: true,
  },
  {
    slug: "shotvista",
    color: "#6366F1",
    title: "ShotVista",
    tech: ["React", "Vite", "FastAPI", "Gemini", "Stripe"],
    live: "https://shotvista.com",
    featured: true,
  },
  {
    slug: "portifer",
    color: "#6366F1",
    title: "Portifer",
    tech: ["Next.js", "TypeScript", "Claude", "PostgreSQL", "Stripe"],
    live: "https://portifer.com",
    featured: true,
  },
  {
    slug: "getcookies",
    color: "#F59E0B",
    title: "GetCookies",
    tech: ["Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
    live: "https://getcookies.co",
    featured: true,
  },
  {
    slug: "burnbacon",
    color: "#EF4444",
    title: "BurnBacon",
    tech: ["Next.js", "TypeScript", "OpenAI", "PostgreSQL", "Tailwind CSS"],
    live: "https://burnbacon.com",
    featured: false,
  },
  {
    slug: "utelivskartet",
    color: "#C084FC",
    title: "Utelivskartet",
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Maps API"],
    live: "https://utelivskartet.no",
    featured: false,
    status: "on-ice",
  },
];
