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
}

export const projects: Project[] = [
  {
    slug: "burnbacon",
    title: "BurnBacon",
    description:
      "AI-powered fitness and nutrition coaching with personalized meal plans and workout tracking.",
    longDescription:
      "My first AI project, vibe coded in early 2023. AI-powered fitness and nutrition coaching with personalized meal plans, workout tracking, and expert AI coaches. 4.9/5 rating from thousands of users.",
    tech: ["Next.js", "TypeScript", "OpenAI", "PostgreSQL", "Tailwind CSS"],
    live: "https://burnbacon.com",
    featured: true,
  },
  {
    slug: "getintent",
    title: "GetIntent",
    description:
      "AI-powered landing page personalization that matches headlines to visitor search intent.",
    longDescription:
      "Automatically personalizes landing page headlines and CTAs based on visitor search intent. One line of code, sub-50ms response, 40% average lift in conversions. Supports 50+ languages.",
    tech: ["Next.js", "TypeScript", "AI/LLM", "Edge Functions"],
    live: "https://getintent.co",
    featured: true,
  },
  {
    slug: "getmailer",
    title: "GetMailer",
    description:
      "Email API for developers with simple integration and enterprise-grade deliverability.",
    longDescription:
      "Transactional email service built for developers. Simple REST API, smart templates with Handlebars, real-time analytics, and 99.99% uptime. SDKs for Node.js, Python, Ruby, Go, and PHP.",
    tech: ["Node.js", "TypeScript", "PostgreSQL", "AWS"],
    live: "https://getmailer.co",
    featured: true,
  },
  {
    slug: "getcookies",
    title: "GetCookies",
    description:
      "Cookie consent management for GDPR and CCPA compliance.",
    longDescription:
      "Cloud-based consent management with customizable banners, auto-blocking, Google Consent Mode integration, and granular cookie categories. One script, full compliance.",
    tech: ["TypeScript", "Next.js", "Edge Functions"],
    live: "https://getcookies.co",
    featured: true,
  },
  {
    slug: "human-like",
    title: "Human-Like",
    description:
      "Enterprise conversational AI platform.",
    longDescription:
      "Enterprise conversational AI platform for building human-like AI experiences.",
    tech: ["Next.js", "TypeScript", "AI/LLM", "Tailwind CSS"],
    live: "https://human-like.ai",
    featured: false,
  },
  {
    slug: "utelivskartet",
    title: "Utelivskartet",
    description:
      "Norwegian nightlife discovery platform mapping bars, clubs, and venues.",
    longDescription:
      "Comprehensive guide to Norwegian nightlife. Discover bars, clubs, and venues across Norway with reviews, events, and real-time info. Currently on ice.",
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Maps API"],
    live: "https://utelivskartet.no",
    featured: false,
    status: "on-ice",
  },
];
