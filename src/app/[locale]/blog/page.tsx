import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPosts } from "@/data/posts";
import type { Locale } from "@/i18n/config";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/ui/PageHero";
import { SITE_NAME, ogLocaleMap, getCanonicalUrl, getAlternateLanguages } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: getCanonicalUrl("/blog", locale as Locale),
      languages: getAlternateLanguages("/blog"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: getCanonicalUrl("/blog", locale as Locale),
      siteName: SITE_NAME,
      locale: ogLocaleMap[locale as Locale],
    },
  };
}

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" />
  </svg>
);

const dateLocale: Record<string, string> = { no: "nb-NO", en: "en-GB", de: "de-DE" };

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  const allPosts = getPosts(locale as Locale);
  const featured = allPosts.filter((p) => p.featured);
  const rest = allPosts.filter((p) => !p.featured);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(dateLocale[locale] ?? "nb-NO", { year: "numeric", month: "short" });

  return (
    <>
      <PageHero second={26} title={t("title")} lead={t("description")} />

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-4 lg:px-8">
        {featured.length > 0 && (
          <div className="mb-16">
            <ScrollReveal>
              <h2 className="eyebrow mb-6">{t("featured")}</h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {featured.map((post, i) => (
                <ScrollReveal key={post.slug} delay={0.05 * (i % 2)} className="h-full">
                  <Link href={`/blog/${post.slug}`} className="soft-card group flex h-full flex-col p-7 lg:p-8">
                    <div className="mb-4 flex items-center gap-3 text-xs text-cream-dim">
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingTime}</span>
                    </div>
                    <h3 className="mb-3 font-serif text-2xl leading-snug text-cream transition-colors group-hover:text-aurora">
                      {post.title}
                    </h3>
                    <p className="mb-6 flex-1 leading-relaxed text-cream-dim">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="chip">
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

        {rest.length > 0 && (
          <div>
            <ScrollReveal>
              <h2 className="eyebrow mb-6">{t("archive")}</h2>
            </ScrollReveal>
            <div className="space-y-3">
              {rest.map((post) => (
                <ScrollReveal key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="soft-card group flex items-center justify-between gap-6 px-7 py-5"
                  >
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-3 text-xs text-cream-dim">
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                        <span aria-hidden="true">·</span>
                        <span>{post.readingTime}</span>
                      </div>
                      <h3 className="font-serif text-xl text-cream transition-colors group-hover:text-aurora">
                        {post.title}
                      </h3>
                    </div>
                    <span className="shrink-0 text-cream-dim transition-all group-hover:translate-x-1 group-hover:text-aurora">
                      <ArrowIcon />
                    </span>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}
