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
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
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
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <article className="pt-32 pb-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* Terminal breadcrumb */}
          <ScrollReveal>
            <div className="mb-8 font-mono text-xs text-muted">
              <Link href="/" className="link-hover">
                ~
              </Link>
              <span className="text-border"> / </span>
              <Link href="/blog" className="link-hover">
                blog
              </Link>
              <span className="text-border"> / </span>
              <span className="text-aurora">{slug}</span>
            </div>
          </ScrollReveal>

          {/* Header */}
          <ScrollReveal delay={0.05}>
            <div className="mb-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
              <time>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span className="text-border">/</span>
              <span>{post.readingTime}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="mb-6 font-serif text-4xl text-cream leading-tight sm:text-5xl">
              {post.title}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="mb-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>

          {/* Divider */}
          <ScrollReveal delay={0.18}>
            <div className="divider mb-12" />
          </ScrollReveal>

          {/* Content */}
          <ScrollReveal delay={0.2}>
            <div
              className="prose-custom"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </ScrollReveal>

          {/* Footer nav */}
          <ScrollReveal delay={0.1}>
            <div className="mt-16 border-t border-border pt-8">
              <Link
                href="/blog"
                className="link-hover inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted"
              >
                <ArrowLeft />
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
