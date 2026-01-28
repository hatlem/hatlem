import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllSlugs } from "@/data/posts";
import type { Locale } from "@/i18n/config";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map(({ locale, slug }) => ({ locale, slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale as Locale, slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
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

  return (
    <>
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
