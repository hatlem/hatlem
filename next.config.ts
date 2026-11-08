import type { NextConfig } from "next";
import { resolve } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: resolve(import.meta.dirname),
  },
  // Bursdagsappen (projects/bursdag) kjører som egen tjeneste. Sett BURSDAG_URL
  // (f.eks. https://bursdag-production.up.railway.app) for å vise den på /bursdag.
  async rewrites() {
    const target = process.env.BURSDAG_URL?.replace(/\/+$/, "");
    if (!target) return [];
    return [
      { source: "/bursdag", destination: `${target}/bursdag/` },
      { source: "/bursdag/:path*", destination: `${target}/bursdag/:path*` },
    ];
  },
  async headers() {
    return [
      {
        // Alt unntatt /bursdag: bursdagsappen trenger kamera og mikrofon på mobilen
        source: "/((?!bursdag).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
