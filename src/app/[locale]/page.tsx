import { Link } from "@/i18n/navigation";
import { getPosts, type BlogPost } from "@/data/posts";
import type { Locale } from "@/i18n/config";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { KineticHero } from "@/components/KineticHero";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

/* ─────────────────────────────────────────────
   ICONS — Raw, minimal
   ───────────────────────────────────────────── */
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" />
  </svg>
);

/* ─────────────────────────────────────────────
   HERO — Compact, focused
   ───────────────────────────────────────────── */
interface HeroTranslations {
  terminal: string;
  role: string;
  description: string;
  ctaAbout: string;
  ctaProjects: string;
  location: string;
}

const HeroSection = ({ t }: { t: HeroTranslations }) => (
  <section className="relative flex flex-col justify-center overflow-hidden pt-32 pb-20">
    {/* Grid lines - subtle technical background */}
    <div className="absolute inset-0 opacity-[0.02]">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f0ebe3 1px, transparent 1px),
            linear-gradient(to bottom, #f0ebe3 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>

    <div className="relative mx-auto w-full max-w-6xl px-6 lg:px-8">
      {/* Terminal header */}
      <div
        className="mb-8 font-mono text-xs text-muted"
        style={{ animation: "fade-up 0.6s ease both", animationDelay: "0.1s" }}
      >
        <span className="text-aurora">&gt;</span> {t.terminal.replace("> ", "")}
        <span className="terminal-cursor" />
      </div>

      {/* Kinetic name */}
      <KineticHero />

      {/* Role with accent */}
      <div
        className="mt-6 flex items-center gap-4"
        style={{ animation: "fade-up 0.6s ease both", animationDelay: "0.8s" }}
      >
        <div className="h-px w-12 bg-aurora" />
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-aurora">
          {t.role}
        </span>
      </div>

      {/* Description - raw, honest */}
      <p
        className="mt-6 max-w-lg text-cream-dim leading-relaxed"
        style={{ animation: "fade-up 0.6s ease both", animationDelay: "0.9s" }}
      >
        {t.description}
      </p>

      {/* CTAs - brutalist buttons */}
      <div
        className="mt-8 flex flex-wrap gap-4"
        style={{ animation: "fade-up 0.6s ease both", animationDelay: "1s" }}
      >
        <Link href="/about" className="btn-primary">
          {t.ctaAbout} <ArrowIcon />
        </Link>
        <Link href="/projects" className="btn-secondary">
          {t.ctaProjects} <ArrowIcon />
        </Link>
      </div>

      {/* Coordinates - Norwegian location pride */}
      <div
        className="absolute bottom-8 right-6 hidden lg:block"
        style={{ animation: "fade-up 0.6s ease both", animationDelay: "1.2s" }}
      >
        <div className="font-mono text-[10px] text-right">
          <div className="text-muted">59°54&apos;N 10°45&apos;E</div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <span className="text-sm">🇳🇴</span>
            <span className="text-aurora">{t.location}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────
   BLOG — Main content, prominent
   ───────────────────────────────────────────── */
interface BlogTranslations {
  title: string;
  section: string;
  description: string;
  featured: string;
  archive: string;
  allPosts: string;
}

const BlogSection = ({ t, posts }: { t: BlogTranslations; posts: BlogPost[] }) => {
  const featured = posts.filter((p) => p.featured);
  const rest = posts.filter((p) => !p.featured);

  return (
    <section className="relative py-20">
      <div className="divider-full mb-16" />

      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <ScrollReveal>
          <div className="mb-12">
            <div className="terminal-line mb-4">{t.section}</div>
            <h2 className="display-large text-cream">{t.title}</h2>
            <p className="mt-4 max-w-lg text-cream-dim leading-relaxed">
              {t.description}
            </p>
          </div>
        </ScrollReveal>

        {/* Featured posts - grid */}
        {featured.length > 0 && (
          <div className="mb-12">
            <ScrollReveal>
              <div className="mb-6 font-mono text-[10px] uppercase tracking-wider text-muted">
                <span className="text-aurora">{"/"}</span>
                <span className="text-aurora">/</span> {t.featured}
              </div>
            </ScrollReveal>

            <div className="grid gap-6 md:grid-cols-2">
              {featured.map((post, i) => (
                <ScrollReveal key={post.slug} delay={0.08 * i}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="brutal-card group flex h-full flex-col p-6 lg:p-8"
                  >
                    <div className="mb-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                      <time>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                        })}
                      </time>
                      <span className="text-border">/</span>
                      <span>{post.readingTime}</span>
                    </div>
                    <h3 className="mb-3 font-serif text-2xl text-cream transition-colors group-hover:text-aurora">
                      {post.title}
                    </h3>
                    <p className="mb-6 flex-1 text-sm text-cream-dim leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* All posts - list */}
        {rest.length > 0 && (
          <div>
            <ScrollReveal>
              <div className="mb-6 font-mono text-[10px] uppercase tracking-wider text-muted">
                <span className="text-aurora">{"/"}</span>
                <span className="text-aurora">/</span> {t.archive}
              </div>
            </ScrollReveal>

            <div className="space-y-1">
              {rest.map((post, i) => (
                <ScrollReveal key={post.slug} delay={0.06 * i}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex items-center justify-between border-b border-border py-6 transition-colors hover:border-aurora"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                        <time>
                          {new Date(post.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </time>
                        <span>{post.readingTime}</span>
                      </div>
                      <h3 className="font-serif text-xl text-cream transition-colors group-hover:text-aurora">
                        {post.title}
                      </h3>
                    </div>
                    <div className="ml-8 text-muted opacity-0 transition-all group-hover:translate-x-1 group-hover:text-aurora group-hover:opacity-100">
                      <ArrowIcon />
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* View all link */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 flex justify-center">
            <Link href="/blog" className="btn-secondary">
              {t.allPosts} <ArrowIcon />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────── */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  const heroTranslations: HeroTranslations = {
    terminal: t("hero.terminal"),
    role: t("hero.role"),
    description: t("hero.description"),
    ctaAbout: t("hero.cta.about"),
    ctaProjects: t("hero.cta.projects"),
    location: t("hero.location"),
  };

  const blogTranslations: BlogTranslations = {
    title: t("blog.title"),
    section: t("blog.section"),
    description: t("blog.description"),
    featured: t("blog.featured"),
    archive: t("blog.archive"),
    allPosts: t("blog.allPosts"),
  };

  return (
    <>
      <HeroSection t={heroTranslations} />
      <BlogSection t={blogTranslations} posts={getPosts(locale as Locale)} />
      <Footer />
    </>
  );
}
