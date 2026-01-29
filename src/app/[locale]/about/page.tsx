import type { Metadata } from "next";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { SITE_NAME, ogLocaleMap, getCanonicalUrl, getAlternateLanguages } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: getCanonicalUrl("/about", locale as Locale),
      languages: getAlternateLanguages("/about"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: getCanonicalUrl("/about", locale as Locale),
      siteName: SITE_NAME,
      locale: ogLocaleMap[locale as Locale],
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const milestones = [
    {
      year: "1999",
      title: t("timeline.1999.title"),
      description: t("timeline.1999.description"),
    },
    {
      year: "2000s",
      title: t("timeline.2000s.title"),
      description: t("timeline.2000s.description"),
    },
    {
      year: "2005",
      title: t("timeline.2005.title"),
      description: t("timeline.2005.description"),
    },
    {
      year: "2012",
      title: t("timeline.2012.title"),
      description: t("timeline.2012.description"),
    },
    {
      year: "2015+",
      title: t("timeline.2015.title"),
      description: t("timeline.2015.description"),
    },
    {
      year: "2022",
      title: t("timeline.2022.title"),
      description: t("timeline.2022.description"),
    },
  ];

  return (
    <>
      <div className="pt-32 pb-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          {/* Terminal header */}
          <ScrollReveal>
            <div className="mb-4 font-mono text-xs text-muted">
              <span className="text-aurora">&gt;</span> {t("terminal").replace("> ", "")}
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

          {/* Two column layout */}
          <div className="grid gap-16 lg:grid-cols-12">
            {/* Left - Main story */}
            <div className="lg:col-span-7">
              <ScrollReveal delay={0.15}>
                <div className="brutal-card p-8 lg:p-10">
                  <p className="mb-6 font-serif text-2xl text-cream leading-snug">
                    {t("intro")}
                  </p>

                  <div className="space-y-4 text-cream-dim leading-relaxed">
                    <p>{t("story.p1")}</p>
                    <p>{t("story.p2")}</p>
                    <p>{t("story.p3")}</p>
                    <p>{t("story.p4")}</p>
                  </div>

                  {/* Stats row */}
                  <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
                    <div>
                      <div className="font-mono text-3xl text-aurora">25+</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                        {t("stats.years")}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-3xl text-aurora">1</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                        {t("stats.exit")}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-3xl text-aurora">∞</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                        {t("stats.projects")}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right - Timeline */}
            <div className="lg:col-span-5">
              <ScrollReveal delay={0.2}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-6">
                  <span className="text-aurora">{"/"}</span>
                  <span className="text-aurora">/</span> {t("timeline.title")}
                </div>
              </ScrollReveal>

              <div className="relative space-y-6">
                {/* Timeline line */}
                <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />

                {milestones.map((milestone, i) => (
                  <ScrollReveal key={milestone.year} delay={0.25 + i * 0.08}>
                    <div className="relative pl-8">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-2 h-[7px] w-[7px] border border-aurora bg-bg" />

                      <div className="font-mono text-xs text-aurora mb-1">
                        {milestone.year}
                      </div>
                      <h3 className="font-serif text-lg text-cream mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-sm text-cream-dim leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Bottom note */}
              <ScrollReveal delay={0.7}>
                <div className="mt-10 border-t border-border pt-6">
                  <p className="text-sm text-cream-dim italic">
                    {t("note")}
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
