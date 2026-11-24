import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs, getCorrespondingSlug } from "@/data/posts";
import type { Locale } from "@/i18n/config";
import { locales, defaultLocale } from "@/i18n/config";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { formatPostDate } from "@/lib/dates";
import { SITE_URL, SITE_NAME, ogLocaleMap, getCanonicalUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map(({ locale, slug }) => ({ locale, slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const typedLocale = locale as Locale;
  const post = getPostBySlug(typedLocale, slug);
  if (!post) return {};

  // Build cross-locale alternates for this blog post
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    const correspondingSlug = loc === typedLocale
      ? slug
      : getCorrespondingSlug(typedLocale, loc, slug);
    if (correspondingSlug) {
      const prefix = loc === defaultLocale ? "" : `/${loc}`;
      languages[loc] = `${SITE_URL}${prefix}/blog/${correspondingSlug}`;
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: getCanonicalUrl(`/blog/${slug}`, typedLocale),
      languages,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["Andreas Hatlem"],
      tags: post.tags,
      locale: ogLocaleMap[typedLocale],
      siteName: SITE_NAME,
      url: getCanonicalUrl(`/blog/${slug}`, typedLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9.5 6H2.5M5.5 3L2.5 6L5.5 9" />
  </svg>
);

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  const post = getPostBySlug(locale as Locale, slug);

  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "Andreas Hatlem",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Person",
      name: "Andreas Hatlem",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": getCanonicalUrl(`/blog/${slug}`, locale as Locale),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: getCanonicalUrl("/blog", locale as Locale),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: getCanonicalUrl(`/blog/${slug}`, locale as Locale),
      },
    ],
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <article>
        <PageHero
          compact
          second={26}
          title={post.title}
          eyebrow={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-cream-dim">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-cream transition-colors hover:text-aurora"
              >
                <ArrowLeft />
                {t("backToBlog")}
              </Link>
              <span aria-hidden="true" className="text-white/20">·</span>
              <time dateTime={post.date}>{formatPostDate(post.date, locale, "long")}</time>
              <span aria-hidden="true" className="text-white/20">·</span>
              <span>{post.readingTime}</span>
            </div>
          }
        >
          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </PageHero>

        <div className="mx-auto max-w-3xl px-6 pb-28 pt-6 lg:px-8">
          {post.excerpt && (
            <ScrollReveal>
              <p className="mb-12 font-serif text-2xl leading-snug text-cream md:text-[1.7rem]">
                {post.excerpt}
              </p>
            </ScrollReveal>
          )}

          <ScrollReveal delay={0.05}>
            <div className="prose-custom" dangerouslySetInnerHTML={{ __html: post.content }} />
          </ScrollReveal>

          <ScrollReveal>
            <div className="mt-20 border-t border-white/[0.07] pt-8">
              <Link href="/blog" className="soft-card group inline-flex items-center gap-3 px-6 py-4 text-cream">
                <span className="transition-transform group-hover:-translate-x-1">
                  <ArrowLeft />
                </span>
                {t("backToBlog")}
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </article>
      <Footer />
    </>
  );
}
