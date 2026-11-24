export interface Project {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
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
    description: "AI legal help for individuals, businesses and lawyers.",
    longDescription:
      "Describe what happened, and Attorly works out what the case is about, drafts the letters and keeps track of the deadlines.",
    tech: ["Next.js", "TypeScript", "Claude", "PostgreSQL", "Stripe"],
    live: "https://attorly.ai",
    featured: true,
  },
  {
    slug: "tenderen",
    color: "#0EA5E9",
    title: "Tenderen",
    description: "Find public tenders and write the bid together with AI.",
    longDescription:
      "Tender monitoring and AI bid writing for suppliers bidding on public contracts in Norway and Europe: search Doffin, TED and more sources, get alerts and draft the bid.",
    tech: ["Next.js", "TypeScript", "Node.js", "Claude", "PostgreSQL"],
    live: "https://tenderen.com",
    featured: true,
  },
  {
    slug: "getintent",
    color: "#A78BFA",
    title: "GetIntent",
    description: "AI landing page personalization based on visitor search intent.",
    longDescription:
      "Rewrites landing page headlines and calls to action to match what each visitor searched for, so the page answers the question they came with.",
    tech: ["Next.js", "TypeScript", "AI/LLM", "Edge Functions"],
    live: "https://getintent.co",
    featured: true,
  },
  {
    slug: "faceshot",
    color: "#F472B6",
    title: "FaceShot",
    description: "AI headshot generator: one selfie, a professional headshot.",
    longDescription:
      "Upload a selfie and get a LinkedIn-ready professional headshot in under a minute, without booking a photographer.",
    tech: ["React", "Vite", "FastAPI", "Gemini", "PostgreSQL"],
    live: "https://faceshot.ai",
    featured: true,
  },
  {
    slug: "shotvista",
    color: "#6366F1",
    title: "ShotVista",
    description: "AI photo editing for real estate photographers.",
    longDescription:
      "Sky replacement, virtual staging, twilight conversions, delivery pages and payments in one workflow for real estate photographers.",
    tech: ["React", "Vite", "FastAPI", "Gemini", "Stripe"],
    live: "https://shotvista.com",
    featured: true,
  },
  {
    slug: "portifer",
    color: "#6366F1",
    title: "Portifer",
    description: "Product seeding and testing platform for consumer brands.",
    longDescription:
      "Choose recipients, ship with your own carrier accounts, track every parcel and collect photo, video and survey feedback in one place.",
    tech: ["Next.js", "TypeScript", "Claude", "PostgreSQL", "Stripe"],
    live: "https://portifer.com",
    featured: true,
  },
  {
    slug: "getcookies",
    color: "#F59E0B",
    title: "GetCookies",
    description: "Cookie consent management platform for GDPR and CCPA.",
    longDescription:
      "Self-service cookie consent: cookie scanning, script blocking, consent logs, Google Consent Mode v2 on every plan and IAB TCF 2.3 from Pro.",
    tech: ["Next.js", "TypeScript", "FastAPI", "PostgreSQL"],
    live: "https://getcookies.co",
    featured: true,
  },
  {
    slug: "burnbacon",
    color: "#EF4444",
    title: "BurnBacon",
    description:
      "AI-powered fitness and nutrition coaching with personalized meal plans and workout tracking.",
    longDescription:
      "My first AI project, vibe coded in early 2023. AI-powered fitness and nutrition coaching with personalized meal plans, workout tracking and AI coaches.",
    tech: ["Next.js", "TypeScript", "OpenAI", "PostgreSQL", "Tailwind CSS"],
    live: "https://burnbacon.com",
    featured: false,
  },
  {
    slug: "utelivskartet",
    color: "#C084FC",
    title: "Utelivskartet",
    description: "Norwegian nightlife discovery platform mapping bars, clubs, and venues.",
    longDescription:
      "Guide to Norwegian nightlife: discover bars, clubs and venues across Norway. Currently on ice.",
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Maps API"],
    live: "https://utelivskartet.no",
    featured: false,
    status: "on-ice",
  },
];
