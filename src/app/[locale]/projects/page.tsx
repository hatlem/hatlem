import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { projects } from "@/data/projects";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

const ExternalIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
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
      <div className="pt-32 pb-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          {/* Terminal header */}
          <ScrollReveal>
            <div className="mb-4 font-mono text-xs text-muted">
              <span className="text-aurora">&gt;</span> {t("terminal")}
              <span className="terminal-cursor" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <div className="mb-4">
              <div className="terminal-line mb-4">{t("section")}</div>
              <h1 className="display-large text-cream">{t("title")}</h1>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="mb-16 max-w-lg text-cream-dim leading-relaxed">
              {t("description")}
            </p>
          </ScrollReveal>

          {/* Projects grid - asymmetric brutalist layout */}
          <div className="grid gap-6 lg:grid-cols-12">
            {projects.map((project, i) => (
              <ScrollReveal
                key={project.slug}
                delay={0.08 * i}
                className={
                  i === 0
                    ? "lg:col-span-7"
                    : i === 1
                    ? "lg:col-span-5"
                    : i === 2
                    ? "lg:col-span-5"
                    : i === 3
                    ? "lg:col-span-7"
                    : "lg:col-span-6"
                }
              >
                <div className="brutal-card group h-full p-6 lg:p-8">
                  {/* Header */}
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {project.status === "on-ice" && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-gold border border-gold/30 px-1.5 py-0.5">
                            {t("onIce")}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 font-serif text-2xl text-cream transition-colors group-hover:text-aurora">
                        {project.title}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("sourceCode", { title: project.title })}
                          className="flex h-8 w-8 items-center justify-center border border-border text-muted transition-all hover:border-aurora hover:text-aurora"
                        >
                          <GithubIcon />
                        </a>
                      )}
                      {project.live && (
                        <a
                          href={project.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("liveDemo", { title: project.title })}
                          className="flex h-8 w-8 items-center justify-center border border-border text-muted transition-all hover:border-aurora hover:text-aurora"
                        >
                          <ExternalIcon />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mb-6 text-sm text-cream-dim leading-relaxed">
                    {project.longDescription}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* And many more */}
          <ScrollReveal delay={0.5}>
            <div className="mt-12 text-center">
              <a
                href="https://getia.no"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-sm text-muted hover:text-aurora transition-colors"
              >
                {t("andMore")}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <Footer />
    </>
  );
}
