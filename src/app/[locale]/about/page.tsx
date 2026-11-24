import type { Metadata } from "next";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/ui/PageHero";
import { FilmStill } from "@/components/ui/FilmStill";
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
      second: 1,
      title: t("timeline.1999.title"),
      description: t("timeline.1999.description"),
    },
    {
      year: "2000s",
      second: 6,
      title: t("timeline.2000s.title"),
      description: t("timeline.2000s.description"),
    },
    {
      year: "2005",
      second: 11,
      title: t("timeline.2005.title"),
      description: t("timeline.2005.description"),
    },
    {
      year: "2012",
      second: 13.5,
      title: t("timeline.2012.title"),
      description: t("timeline.2012.description"),
    },
    {
      year: "2015+",
      second: 17,
      title: t("timeline.2015.title"),
      description: t("timeline.2015.description"),
    },
    {
      year: "2022",
      second: 21.5,
      title: t("timeline.2022.title"),
      description: t("timeline.2022.description"),
    },
    {
      year: "2024",
      second: 26,
      title: t("timeline.2024.title"),
      description: t("timeline.2024.description"),
    },
    {
      year: "2025",
      second: 29.5,
      title: t("timeline.2025.title"),
      description: t("timeline.2025.description"),
    },
  ];

  return (
    <>
      <PageHero second={1} title={t("title")} lead={t("description")} />

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <ScrollReveal className="lg:col-span-7">
            <p className="font-serif text-3xl leading-snug text-cream md:text-4xl">{t("intro")}</p>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-cream-dim">
              <p>{t("story.p1")}</p>
              <p>{t("story.p2")}</p>
              <p>{t("story.p3")}</p>
              <p>{t("story.p4")}</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="lg:col-span-5">
            <div className="soft-card grid grid-cols-3 gap-4 p-7 lg:sticky lg:top-28">
              <div>
                <div className="font-serif text-4xl text-aurora">25+</div>
                <div className="mt-2 text-xs text-cream-dim">{t("stats.years")}</div>
              </div>
              <div>
                <div className="font-serif text-4xl text-aurora">1</div>
                <div className="mt-2 text-xs text-cream-dim">{t("stats.exit")}</div>
              </div>
              <div>
                <div className="font-serif text-4xl text-aurora">∞</div>
                <div className="mt-2 text-xs text-cream-dim">{t("stats.projects")}</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-16 lg:px-8">
        <ScrollReveal>
          <h2 className="eyebrow mb-10">{t("timeline.title")}</h2>
        </ScrollReveal>

        <ol className="space-y-6">
          {milestones.map((milestone, i) => (
            <ScrollReveal key={milestone.year}>
              <li
                className={`soft-card grid items-center gap-0 overflow-hidden md:grid-cols-2 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:h-full md:min-h-64">
                  <FilmStill
                    second={milestone.second}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-7 lg:p-10">
                  <div className="font-serif text-5xl text-aurora/90">{milestone.year}</div>
                  <h3 className="mt-3 font-serif text-2xl text-cream">{milestone.title}</h3>
                  <p className="mt-3 leading-relaxed text-cream-dim">{milestone.description}</p>
                </div>
              </li>
            </ScrollReveal>
          ))}
        </ol>

        <ScrollReveal>
          <p className="mx-auto mt-16 max-w-2xl text-center font-serif text-xl italic text-cream-dim">
            {t("note")}
          </p>
        </ScrollReveal>
      </section>
      <Footer />
    </>
  );
}
