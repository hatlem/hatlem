import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { projects } from "@/data/projects";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/ui/PageHero";
import type { Locale } from "@/i18n/config";
import { SITE_NAME, ogLocaleMap, getCanonicalUrl, getAlternateLanguages } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: getCanonicalUrl("/projects", locale as Locale),
      languages: getAlternateLanguages("/projects"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: getCanonicalUrl("/projects", locale as Locale),
      siteName: SITE_NAME,
      locale: ogLocaleMap[locale as Locale],
    },
  };
}

const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 3L3 9M9 3V7M9 3H5" />
  </svg>
);

const GithubIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  return (
    <>
      <PageHero second={17} title={t("title")} lead={t("description")} />

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-4 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {projects.map((project, i) => (
            <ScrollReveal key={project.slug} delay={0.05 * (i % 2)} className="h-full">
              <article className="soft-card group flex h-full flex-col overflow-hidden p-7 lg:p-8">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: project.color }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-[0.12] blur-3xl transition-opacity duration-500 group-hover:opacity-25"
                  style={{ background: project.color }}
                />

                <header className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-serif text-xl text-white"
                      style={{ background: project.color }}
                    >
                      {project.title.charAt(0)}
                    </span>
                    <div>
                      <h2 className="font-serif text-2xl text-cream">{project.title}</h2>
                      <p className="mt-0.5 text-sm text-cream-dim">{project.description}</p>
                    </div>
                  </div>
                  {project.status === "on-ice" && (
                    <span className="chip shrink-0 border-sol/40 text-sol">{t("onIce")}</span>
                  )}
                </header>

                <p className="relative mt-6 flex-1 leading-relaxed text-cream-dim">
                  {project.longDescription}
                </p>

                <div className="relative mt-6 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <span key={tech} className="chip">
                      {tech}
                    </span>
                  ))}
                </div>

                {(project.live || project.github) && (
                  <div className="relative mt-7 flex items-center gap-5 border-t border-white/[0.07] pt-5 text-sm">
                    {project.live && (
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("liveDemo", { title: project.title })}
                        className="inline-flex items-center gap-2 text-cream transition-colors hover:text-aurora"
                      >
                        {project.live.replace(/^https?:\/\//, "")} <ExternalIcon />
                      </a>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("sourceCode", { title: project.title })}
                        className="inline-flex items-center gap-2 text-cream-dim transition-colors hover:text-aurora"
                      >
                        <GithubIcon /> GitHub
                      </a>
                    )}
                  </div>
                )}
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <p className="mt-14 text-center">
            <a
              href="https://getia.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream-dim transition-colors hover:text-aurora"
            >
              {t("andMore")}
            </a>
          </p>
        </ScrollReveal>
      </section>
      <Footer />
    </>
  );
}
